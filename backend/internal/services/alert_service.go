package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	customWS "github.com/obsidiannnn/Safe-Around/backend/internal/websocket"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type CreateAlertRequest struct {
	UserID     uint
	Location   models.Location
	AlertType  string
	SilentMode bool
	Metadata   string
}

type AlertService struct {
	db                  *gorm.DB
	redis               *redis.Client
	geofencingService   *GeofencingService
	notificationService NotificationService
	websocketHub        customWS.AlertBroadcaster
	schedulers          sync.Map // alert_id -> *time.Timer
}

const indiaEmergencyNumber = "112"

type AlertDetails struct {
	Alert           models.EmergencyAlert       `json:"alert"`
	Timeline        []models.AlertTimelineEvent `json:"timeline"`
	RespondersCount int64                       `json:"responders_count"`
	EmergencyNumber string                      `json:"emergency_number"`
}

func NewAlertService(db *gorm.DB, rdb *redis.Client, gs *GeofencingService, ns NotificationService, wh customWS.AlertBroadcaster) *AlertService {
	return &AlertService{
		db:                  db,
		redis:               rdb,
		geofencingService:   gs,
		notificationService: ns,
		websocketHub:        wh,
	}
}

func (s *AlertService) GetAlertHistory(ctx context.Context, userID uint) ([]models.EmergencyAlert, error) {
	var alerts []models.EmergencyAlert
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) GetActiveAlerts(ctx context.Context) ([]models.EmergencyAlert, error) {
	var alerts []models.EmergencyAlert
	if err := s.db.Where("alert_status IN ?", []string{"active", "responding"}).Order("created_at DESC").Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) GetAlertDetails(ctx context.Context, alertID uuid.UUID, userID uint) (*AlertDetails, error) {
	var alert models.EmergencyAlert
	if err := s.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", alertID, userID).
		First(&alert).Error; err != nil {
		return nil, err
	}

	var timeline []models.AlertTimelineEvent
	if err := s.db.WithContext(ctx).
		Where("alert_id = ?", alertID).
		Order("occurred_at ASC").
		Find(&timeline).Error; err != nil {
		return nil, err
	}

	var respondersCount int64
	if err := s.db.WithContext(ctx).
		Model(&models.AlertResponse{}).
		Where("alert_id = ? AND response_status = ?", alertID, "accepted").
		Count(&respondersCount).Error; err != nil {
		return nil, err
	}

	return &AlertDetails{
		Alert:           alert,
		Timeline:        timeline,
		RespondersCount: respondersCount,
		EmergencyNumber: indiaEmergencyNumber,
	}, nil
}

func (s *AlertService) CreateAlert(ctx context.Context, req CreateAlertRequest) (*models.EmergencyAlert, error) {
	metadata := req.Metadata
	if metadata != "" && !json.Valid([]byte(metadata)) {
		wrapped, err := json.Marshal(map[string]string{"message": metadata})
		if err != nil {
			return nil, err
		}
		metadata = string(wrapped)
	}

	// 1. Create alert record
	alert := &models.EmergencyAlert{
		UserID:        req.UserID,
		AlertLocation: req.Location,
		AlertType:     req.AlertType,
		SilentMode:    req.SilentMode,
		Metadata:      metadata,
		CurrentRadius: 100,
	}

	if err := s.db.Create(alert).Error; err != nil {
		return nil, err
	}
	s.db.Model(&models.User{}).
		Where("id = ?", req.UserID).
		UpdateColumn("total_alerts_triggered", gorm.Expr("total_alerts_triggered + ?", 1))

	// 2. Find nearby users (100m)
	nearbyUsers, err := s.geofencingService.GetDispatchCandidates(
		req.Location.Latitude,
		req.Location.Longitude,
		100,
	)
	if err != nil {
		return nil, err
	}

	// 3. Send notifications
	usersNotified := 0
	for _, user := range nearbyUsers {
		if user.ID == req.UserID {
			continue
		}
		s.notificationService.SendEmergencyAlert(user.ID, alert)
		usersNotified++
	}
	alert.UsersNotified = usersNotified
	s.db.Model(alert).Update("users_notified", usersNotified)

	// 4. Log timeline event
	s.logTimelineEvent(alert.ID, "created", 100, usersNotified, 0)

	// 5. Start radius expansion scheduler
	s.startRadiusExpansion(alert.ID)

	// 6. Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastEmergencyAlert(alert)
	}

	// 7. Notify emergency contacts immediately
	s.notificationService.NotifyEmergencyContacts(alert.UserID, alert)

	return alert, nil
}

func (s *AlertService) startRadiusExpansion(alertID uuid.UUID) {
	// Start a ticker-like background job for granular expansion
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				var alert models.EmergencyAlert
				if err := s.db.First(&alert, "id = ?", alertID).Error; err != nil {
					return
				}

				// Stop expansion if not active or already has responders
				if alert.AlertStatus != "active" {
					return
				}

				var responderCount int64
				s.db.Model(&models.AlertResponse{}).
					Where("alert_id = ? AND response_status = ?", alertID, "accepted").
					Count(&responderCount)

				if responderCount > 0 {
					return
				}

				nextRadius := alert.GetNextRadius()
				if nextRadius == alert.CurrentRadius {
					// Max radius reached or couldn't get next
					return
				}

				s.expandRadius(alertID, nextRadius)
			}
		}
	}()
}

func (s *AlertService) cancelRadiusExpansion(alertID uuid.UUID) {
	for _, suffix := range []string{":30", ":60", ":90"} {
		key := alertID.String() + suffix
		if timer, ok := s.schedulers.Load(key); ok {
			timer.(*time.Timer).Stop()
			s.schedulers.Delete(key)
		}
	}
}

func (s *AlertService) expandRadius(alertID uuid.UUID, newRadius int) error {
	var alert models.EmergencyAlert
	if err := s.db.First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}

	// Don't expand if already resolved/cancelled
	if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
		return nil
	}

	// Don't expand if already at this radius
	if alert.CurrentRadius >= newRadius {
		return nil
	}

	// Check if we have responders
	var responderCount int64
	s.db.Model(&models.AlertResponse{}).
		Where("alert_id = ? AND response_status = ?", alertID, "accepted").
		Count(&responderCount)

	// If we have responders, don't expand
	if responderCount > 0 {
		return nil
	}

	// Find new users in expanded radius
	oldRadius := alert.CurrentRadius
	newUsers, err := s.geofencingService.GetDispatchCandidatesInRing(
		alert.AlertLocation.Latitude,
		alert.AlertLocation.Longitude,
		oldRadius,
		newRadius,
	)
	if err != nil {
		return err
	}

	// Send notifications to new users
	for _, user := range newUsers {
		s.notificationService.SendEmergencyAlert(user.ID, &alert)
	}

	// Update alert
	alert.CurrentRadius = newRadius
	alert.MaxRadiusReached = newRadius
	alert.UsersNotified += len(newUsers)
	s.db.Save(&alert)

	// Log timeline
	s.logTimelineEvent(alertID, "radius_expanded", newRadius, alert.UsersNotified, int(responderCount))

	// Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastRadiusExpanded(alertID, oldRadius, newRadius, alert.UsersNotified)
	}

	return nil
}

func (s *AlertService) AcceptAlert(ctx context.Context, alertID uuid.UUID, responderID uint, location models.Location) error {
	var alert models.EmergencyAlert
	if err := s.db.First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}

	if alert.UserID == responderID {
		return fmt.Errorf("requester cannot respond to their own alert")
	}

	if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
		return fmt.Errorf("alert is no longer active")
	}

	var existingResponse models.AlertResponse
	if err := s.db.Where("alert_id = ? AND responder_user_id = ? AND response_status IN ?", alertID, responderID, []string{"accepted", "arrived", "helping"}).
		First(&existingResponse).Error; err == nil {
		return fmt.Errorf("responder has already accepted this alert")
	}

	// Create response
	response := &models.AlertResponse{
		AlertID:           alertID,
		ResponderUserID:   responderID,
		ResponseStatus:    "accepted",
		ResponderLocation: location,
	}

	// Calculate distance and ETA
	response.DistanceMeters = responderDistanceMeters(location, alert.AlertLocation)
	if err := response.CalculateDistance(); err != nil {
		return err
	}
	response.EstimateETA()

	if err := s.db.Create(response).Error; err != nil {
		return err
	}
	s.db.Model(&models.User{}).
		Where("id = ?", responderID).
		UpdateColumn("people_helped_count", gorm.Expr("people_helped_count + ?", 1))

	// Update alert status
	s.db.Model(&models.EmergencyAlert{}).
		Where("id = ?", alertID).
		Update("alert_status", "responding")

	// Cancel radius expansion if we have responders
	s.cancelRadiusExpansion(alertID)

	// Notify victim
	s.notificationService.NotifyResponderAccepted(alert.UserID, response)

	var respondersCount int64
	s.db.Model(&models.AlertResponse{}).
		Where("alert_id = ? AND response_status = ?", alertID, "accepted").
		Count(&respondersCount)

	// Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastResponderAccepted(alertID, response)
	}

	s.logTimelineEvent(alertID, "responder_accepted", alert.CurrentRadius, alert.UsersNotified, int(respondersCount))

	return nil
}

func (s *AlertService) ResolveAlert(ctx context.Context, alertID uuid.UUID, resolvedBy uint, resolutionType string) error {
	// Update alert
	now := time.Now()
	if err := s.db.Model(&models.EmergencyAlert{}).
		Where("id = ?", alertID).
		Updates(map[string]interface{}{
			"alert_status": "resolved",
			"resolved_at":  now,
		}).Error; err != nil {
		return err
	}

	// Cancel any pending expansions
	s.cancelRadiusExpansion(alertID)

	// Log timeline
	s.logTimelineEvent(alertID, "resolved", 0, 0, 0)

	// Notify all participants
	s.notificationService.NotifyAllParticipants(alertID, fmt.Sprintf("Alert resolved: %s", resolutionType))

	// Close WebSocket room
	if s.websocketHub != nil {
		s.websocketHub.CloseRoom("alert_" + alertID.String())
	}

	return nil
}

func (s *AlertService) CancelAlert(ctx context.Context, alertID uuid.UUID, cancelledBy uint) error {
	now := time.Now()
	if err := s.db.Model(&models.EmergencyAlert{}).
		Where("id = ? AND user_id = ?", alertID, cancelledBy).
		Updates(map[string]interface{}{
			"alert_status": "cancelled",
			"cancelled_at": now,
		}).Error; err != nil {
		return err
	}

	s.cancelRadiusExpansion(alertID)
	s.logTimelineEvent(alertID, "cancelled", 0, 0, 0)
	s.notificationService.NotifyAllParticipants(alertID, "Alert cancelled by the requester")

	if s.websocketHub != nil {
		s.websocketHub.CloseRoom("alert_" + alertID.String())
	}

	return nil
}

func (s *AlertService) EscalateToEmergencyServices(alertID uuid.UUID, escalationType string) error {
	var alert models.EmergencyAlert
	if err := s.db.First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}

	// Create escalation record
	escalation := &models.AlertEscalation{
		AlertID:          alertID,
		EscalationType:   escalationType,
		EscalationStatus: "pending",
	}

	// Build NENA i3 payload as a JSON string
	payload := fmt.Sprintf(`{"location": {"latitude": %f, "longitude": %f}, "caller_info": "%s", "situation_type": "%s"}`,
		alert.AlertLocation.Latitude, alert.AlertLocation.Longitude, s.getUserInfo(alert.UserID), alert.AlertType)
	escalation.EscalationPayload = payload

	if err := s.db.Create(escalation).Error; err != nil {
		return err
	}

	// Make 112 call via Twilio (mock implementation for safe testing)
	callSID, err := s.make112Call(alert)
	if err != nil {
		return err
	}

	escalation.ExternalReferenceID = callSID
	escalation.EscalationStatus = "dispatched"
	s.db.Save(escalation)

	// Notify emergency contacts
	s.notificationService.NotifyEmergencyContacts(alert.UserID, &alert)

	// Log timeline
	s.logTimelineEvent(alertID, "escalated", 0, 0, 0)

	return nil
}

// Helpers

func (s *AlertService) logTimelineEvent(alertID uuid.UUID, eventType string, radius, usersNotified, respondersCount int) {
	event := models.AlertTimelineEvent{
		AlertID:         alertID,
		EventType:       eventType,
		RadiusAtEvent:   radius,
		UsersNotified:   usersNotified,
		RespondersCount: respondersCount,
	}
	s.db.Create(&event)
}

func (s *AlertService) getUserInfo(userID uint) string {
	var user models.User
	s.db.Select("name", "phone").First(&user, userID)
	return fmt.Sprintf("Name: %s, Phone: %s", user.Name, user.Phone)
}

func (s *AlertService) make112Call(alert models.EmergencyAlert) (string, error) {
	// In production, this would use Twilio Voice API to dial emergency services
	// For now, we return a mock SID
	return "CA" + uuid.New().String()[:32], nil
}

func responderDistanceMeters(a, b models.Location) float64 {
	const earthRadius = 6371000.0
	lat1 := a.Latitude * math.Pi / 180
	lat2 := b.Latitude * math.Pi / 180
	dLat := (b.Latitude - a.Latitude) * math.Pi / 180
	dLng := (b.Longitude - a.Longitude) * math.Pi / 180
	sinLat := math.Sin(dLat / 2)
	sinLng := math.Sin(dLng / 2)
	h := sinLat*sinLat + math.Cos(lat1)*math.Cos(lat2)*sinLng*sinLng
	return earthRadius * 2 * math.Atan2(math.Sqrt(h), math.Sqrt(1-h))
}
