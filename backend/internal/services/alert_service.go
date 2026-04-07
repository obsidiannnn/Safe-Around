package services

import (
	"context"
	"fmt"
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

func (s *AlertService) CreateAlert(ctx context.Context, req CreateAlertRequest) (*models.EmergencyAlert, error) {
	// 1. Create alert record
	alert := &models.EmergencyAlert{
		UserID:        req.UserID,
		AlertLocation: req.Location,
		AlertType:     req.AlertType,
		SilentMode:    req.SilentMode,
		Metadata:      req.Metadata,
		CurrentRadius: 100,
	}

	if err := s.db.Create(alert).Error; err != nil {
		return nil, err
	}

	// 2. Find nearby users (100m)
	nearbyUsers, err := s.geofencingService.GetNearbyUsers(
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
	newUsers, err := s.geofencingService.GetUsersInRing(
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
	s.logTimelineEvent(alertID, "radius_expanded", newRadius, len(newUsers), int(responderCount))

	// Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastRadiusExpanded(alertID, oldRadius, newRadius)
	}

	return nil
}

func (s *AlertService) AcceptAlert(ctx context.Context, alertID uuid.UUID, responderID uint, location models.Location) error {
	// Create response
	response := &models.AlertResponse{
		AlertID:           alertID,
		ResponderUserID:   responderID,
		ResponseStatus:    "accepted",
		ResponderLocation: location,
	}

	// Calculate distance and ETA
	if err := response.CalculateDistance(); err != nil {
		return err
	}
	response.EstimateETA()

	if err := s.db.Create(response).Error; err != nil {
		return err
	}

	// Update alert status
	s.db.Model(&models.EmergencyAlert{}).
		Where("id = ?", alertID).
		Update("alert_status", "responding")

	// Cancel radius expansion if we have responders
	s.cancelRadiusExpansion(alertID)

	// Notify victim
	var alert models.EmergencyAlert
	s.db.First(&alert, "id = ?", alertID)
	s.notificationService.NotifyResponderAccepted(alert.UserID, response)

	// Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastResponderAccepted(alertID, response)
	}

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

	// Make 911 call via Twilio (mock implementation for safe testing)
	callSID, err := s.make911Call(alert)
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

func (s *AlertService) make911Call(alert models.EmergencyAlert) (string, error) {
	// In production, this would use Twilio Voice API to dial emergency services
	// For now, we return a mock SID
	return "CA" + uuid.New().String()[:32], nil
}
