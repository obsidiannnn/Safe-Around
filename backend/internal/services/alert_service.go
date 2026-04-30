package services

import (
	"context"
	"encoding/json"
	"errors"
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

const (
	requesterOfflineAlertTTL     = 2 * time.Minute
	postEscalationResolveDelay   = 1 * time.Minute
)

var (
	ErrAlertSelfResponse    = errors.New("requester cannot respond to their own alert")
	ErrAlertInactive        = errors.New("alert is no longer active")
	ErrAlertAlreadyAccepted = errors.New("responder has already accepted this alert")
	ErrAlertAccessDenied    = errors.New("you can only manage your own alert")
)

type AlertResponderSummary struct {
	UserID         uint       `json:"user_id"`
	Name           string     `json:"name"`
	Phone          string     `json:"phone,omitempty"`
	ResponseStatus string     `json:"response_status"`
	DistanceMeters float64    `json:"distance_meters"`
	ETASeconds     int        `json:"eta_seconds"`
	RespondedAt    time.Time  `json:"responded_at"`
	ArrivedAt      *time.Time `json:"arrived_at,omitempty"`
	ResponseRating *int       `json:"response_rating,omitempty"`
}

type AlertIncidentReport struct {
	AlertID                 uuid.UUID `json:"alert_id"`
	RequesterUserID         uint      `json:"requester_user_id"`
	ResponderUserIDs        []uint    `json:"responder_user_ids"`
	Status                  string    `json:"status"`
	DurationSeconds         int       `json:"duration_seconds"`
	CreatedAt               time.Time `json:"created_at"`
	EndedAt                 time.Time `json:"ended_at"`
	CurrentRadius           int       `json:"current_radius"`
	MaxRadiusReached        int       `json:"max_radius_reached"`
	UsersNotified           int       `json:"users_notified"`
	RespondersCount         int64     `json:"responders_count"`
	EmergencyServicesStatus string    `json:"emergency_services_status"`
}

type AlertDetails struct {
	Alert                   models.EmergencyAlert       `json:"alert"`
	Timeline                []models.AlertTimelineEvent `json:"timeline"`
	RespondersCount         int64                       `json:"responders_count"`
	EmergencyNumber         string                      `json:"emergency_number"`
	DurationSeconds         int                         `json:"duration_seconds"`
	EmergencyServicesStatus string                      `json:"emergency_services_status"`
	Responders              []AlertResponderSummary     `json:"responders"`
	IncidentReport          AlertIncidentReport         `json:"incident_report"`
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
	_ = s.cleanupUserAlerts(ctx, userID)

	var alerts []models.EmergencyAlert
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) GetOwnedAlert(ctx context.Context, alertID uuid.UUID, userID uint) (*models.EmergencyAlert, error) {
	var alert models.EmergencyAlert
	if err := s.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", alertID, userID).
		First(&alert).Error; err != nil {
		return nil, err
	}

	return &alert, nil
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
		Where(`
			id = ?
			AND (
				user_id = ?
				OR EXISTS (
					SELECT 1
					FROM alert_responses ar
					WHERE ar.alert_id = emergency_alerts.id
					  AND ar.responder_user_id = ?
					  AND ar.response_status IN ('accepted', 'arrived', 'helping')
				)
			)
		`, alertID, userID, userID).
		First(&alert).Error; err != nil {
		return nil, err
	}

	if _, err := s.applyAlertAutoFinalization(ctx, &alert); err == nil {
		_ = s.db.WithContext(ctx).
			Where("id = ?", alertID).
			First(&alert).Error
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
		Where("alert_id = ? AND response_status IN ?", alertID, []string{"accepted", "arrived", "helping"}).
		Count(&respondersCount).Error; err != nil {
		return nil, err
	}

	responders, err := s.getAlertResponders(ctx, alertID)
	if err != nil {
		return nil, err
	}

	emergencyServicesStatus, err := s.getEmergencyServicesStatus(ctx, alertID)
	if err != nil {
		return nil, err
	}

	durationSeconds := s.calculateAlertDuration(alert)
	reportEndedAt := alert.CreatedAt.Add(time.Duration(durationSeconds) * time.Second)
	if alert.ResolvedAt != nil {
		reportEndedAt = *alert.ResolvedAt
	} else if alert.CancelledAt != nil {
		reportEndedAt = *alert.CancelledAt
	}

	return &AlertDetails{
		Alert:                   alert,
		Timeline:                timeline,
		RespondersCount:         respondersCount,
		EmergencyNumber:         indiaEmergencyNumber,
		DurationSeconds:         durationSeconds,
		EmergencyServicesStatus: emergencyServicesStatus,
		Responders:              responders,
		IncidentReport: AlertIncidentReport{
			AlertID:                 alert.ID,
			RequesterUserID:         alert.UserID,
			ResponderUserIDs:        extractResponderIDs(responders),
			Status:                  alert.AlertStatus,
			DurationSeconds:         durationSeconds,
			CreatedAt:               alert.CreatedAt,
			EndedAt:                 reportEndedAt,
			CurrentRadius:           alert.CurrentRadius,
			MaxRadiusReached:        alert.MaxRadiusReached,
			UsersNotified:           alert.UsersNotified,
			RespondersCount:         respondersCount,
			EmergencyServicesStatus: emergencyServicesStatus,
		},
	}, nil
}

func extractResponderIDs(responders []AlertResponderSummary) []uint {
	ids := make([]uint, 0, len(responders))
	for _, responder := range responders {
		ids = append(ids, responder.UserID)
	}
	return ids
}

func (s *AlertService) CreateAlert(ctx context.Context, req CreateAlertRequest) (*models.EmergencyAlert, error) {
	var metadata *string
	if req.Metadata != "" {
		if !json.Valid([]byte(req.Metadata)) {
			wrapped, err := json.Marshal(map[string]string{"message": req.Metadata})
			if err != nil {
				return nil, err
			}
			metadataStr := string(wrapped)
			metadata = &metadataStr
		} else {
			metadata = &req.Metadata
		}
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
	recipientIDs := make([]uint, 0, len(nearbyUsers))
	for _, user := range nearbyUsers {
		if user.ID == req.UserID {
			continue
		}
		s.notificationService.SendEmergencyAlert(user.ID, alert)
		recipientIDs = append(recipientIDs, user.ID)
		usersNotified++
	}
	alert.UsersNotified = usersNotified
	s.db.Model(alert).Update("users_notified", usersNotified)

	// 4. Log timeline event
	s.logTimelineEvent(alert.ID, "created", 100, usersNotified, 0, map[string]interface{}{
		"requester_user_id": req.UserID,
	})

	// 5. Start radius expansion scheduler
	s.startRadiusExpansion(alert.ID)

	// 6. Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastEmergencyAlert(alert, recipientIDs)
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
				ctx := context.Background()
				var alert models.EmergencyAlert
				if err := s.db.WithContext(ctx).First(&alert, "id = ?", alertID).Error; err != nil {
					return
				}

				// Stop expansion if not active or already has responders
				if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
					return
				}

				closed, err := s.applyAlertAutoFinalization(ctx, &alert)
				if err != nil {
					continue
				}
				if closed {
					return
				}

				if alert.AlertStatus != "active" {
					continue
				}

				var responderCount int64
				s.db.WithContext(ctx).Model(&models.AlertResponse{}).
					Where("alert_id = ? AND response_status = ?", alertID, "accepted").
					Count(&responderCount)

				if responderCount > 0 {
					continue
				}

				nextRadius := alert.GetNextRadius()
				if nextRadius == alert.CurrentRadius {
					// Max radius reached or couldn't get next
					continue
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
	recipientIDs := make([]uint, 0, len(newUsers))
	for _, user := range newUsers {
		if user.ID == alert.UserID {
			continue
		}
		s.notificationService.SendEmergencyAlert(user.ID, &alert)
		recipientIDs = append(recipientIDs, user.ID)
	}

	// Update alert
	alert.CurrentRadius = newRadius
	alert.MaxRadiusReached = newRadius
	alert.UsersNotified += len(newUsers)
	s.db.Save(&alert)

	// Log timeline
	s.logTimelineEvent(alertID, "radius_expanded", newRadius, alert.UsersNotified, int(responderCount), map[string]interface{}{
		"requester_user_id": alert.UserID,
		"old_radius":        oldRadius,
		"new_radius":        newRadius,
		"new_user_ids":      recipientIDs,
	})

	// Broadcast via WebSocket
	if s.websocketHub != nil {
		s.websocketHub.BroadcastRadiusExpanded(alertID, oldRadius, newRadius, alert.UsersNotified, recipientIDs)
	}

	if newRadius >= 1000 && responderCount == 0 {
		if err := s.EscalateToEmergencyServices(alertID, "police"); err != nil {
			return err
		}
	}

	return nil
}

func (s *AlertService) AcceptAlert(ctx context.Context, alertID uuid.UUID, responderID uint, location models.Location) error {
	var alert models.EmergencyAlert
	if err := s.db.First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}

	if alert.UserID == responderID {
		return ErrAlertSelfResponse
	}

	if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
		return ErrAlertInactive
	}

	var existingResponse models.AlertResponse
	if err := s.db.Where("alert_id = ? AND responder_user_id = ? AND response_status IN ?", alertID, responderID, []string{"accepted", "arrived", "helping"}).
		First(&existingResponse).Error; err == nil {
		return ErrAlertAlreadyAccepted
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
		s.websocketHub.BroadcastResponderAccepted(alertID, response, alert.UserID)
	}

	s.logTimelineEvent(alertID, "responder_accepted", alert.CurrentRadius, alert.UsersNotified, int(respondersCount), map[string]interface{}{
		"requester_user_id": alert.UserID,
		"responder_user_id": responderID,
		"response_id":       response.ID.String(),
	})

	return nil
}

func (s *AlertService) ResolveAlert(ctx context.Context, alertID uuid.UUID, resolvedBy uint, resolutionType string) error {
	var alert models.EmergencyAlert
	if err := s.db.WithContext(ctx).First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}
	if alert.UserID != resolvedBy {
		return ErrAlertAccessDenied
	}
	if alert.AlertStatus == "resolved" {
		return nil
	}
	if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
		return ErrAlertInactive
	}

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
	s.logTimelineEvent(alertID, "resolved", 0, 0, 0, map[string]interface{}{
		"requester_user_id": resolvedBy,
		"resolution_type":   resolutionType,
	})

	// Notify all participants
	s.notificationService.NotifyAllParticipants(alertID, fmt.Sprintf("Alert resolved: %s", resolutionType))

	// Close WebSocket room
	if s.websocketHub != nil {
		s.websocketHub.CloseRoom("alert_"+alertID.String(), "resolved")
	}

	return nil
}

func (s *AlertService) CancelAlert(ctx context.Context, alertID uuid.UUID, cancelledBy uint) error {
	var alert models.EmergencyAlert
	if err := s.db.WithContext(ctx).First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}
	if alert.UserID != cancelledBy {
		return ErrAlertAccessDenied
	}
	if alert.AlertStatus == "cancelled" {
		return nil
	}
	if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
		return ErrAlertInactive
	}

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
	s.logTimelineEvent(alertID, "cancelled", 0, 0, 0, map[string]interface{}{
		"requester_user_id": cancelledBy,
	})
	s.notificationService.NotifyAllParticipants(alertID, "Alert cancelled by the requester")

	if s.websocketHub != nil {
		s.websocketHub.CloseRoom("alert_"+alertID.String(), "cancelled")
	}

	return nil
}

func (s *AlertService) EscalateToEmergencyServices(alertID uuid.UUID, escalationType string) error {
	var alert models.EmergencyAlert
	if err := s.db.First(&alert, "id = ?", alertID).Error; err != nil {
		return err
	}

	var existingEscalation models.AlertEscalation
	if err := s.db.
		Where("alert_id = ? AND escalation_type = ?", alertID, escalationType).
		Order("escalated_at DESC").
		First(&existingEscalation).Error; err == nil {
		if existingEscalation.EscalationStatus == "pending" || existingEscalation.EscalationStatus == "dispatched" {
			return nil
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
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
	s.logTimelineEvent(alertID, "escalated", 0, 0, 0, map[string]interface{}{
		"requester_user_id": alert.UserID,
		"escalation_type":   escalationType,
	})

	return nil
}

func (s *AlertService) cleanupStaleAlerts(ctx context.Context) error {
	var alerts []models.EmergencyAlert
	if err := s.db.WithContext(ctx).
		Where("alert_status IN ?", []string{"active", "responding"}).
		Find(&alerts).Error; err != nil {
		return err
	}

	for i := range alerts {
		if _, err := s.applyAlertAutoFinalization(ctx, &alerts[i]); err != nil {
			return err
		}
	}

	return nil
}

func (s *AlertService) cleanupUserAlerts(ctx context.Context, userID uint) error {
	var alerts []models.EmergencyAlert
	if err := s.db.WithContext(ctx).
		Where("user_id = ? AND alert_status IN ?", userID, []string{"active", "responding"}).
		Find(&alerts).Error; err != nil {
		return err
	}

	for i := range alerts {
		if _, err := s.applyAlertAutoFinalization(ctx, &alerts[i]); err != nil {
			return err
		}
	}

	return nil
}

func (s *AlertService) applyAlertAutoFinalization(ctx context.Context, alert *models.EmergencyAlert) (bool, error) {
	if alert.AlertStatus != "active" && alert.AlertStatus != "responding" {
		return true, nil
	}

	responderCount, err := s.getAcceptedResponderCount(ctx, alert.ID)
	if err != nil {
		return false, err
	}

	if alert.CurrentRadius >= 1000 {
		escalatedAt, hasEscalation, err := s.getLatestPoliceEscalationTime(ctx, alert.ID)
		if err != nil {
			return false, err
		}

		if hasEscalation {
			if responderCount == 0 && time.Since(escalatedAt) >= postEscalationResolveDelay {
				if err := s.ResolveAlert(ctx, alert.ID, alert.UserID, "emergency_services_handoff"); err != nil && !errors.Is(err, ErrAlertInactive) {
					return false, err
				}
				return true, nil
			}

			return false, nil
		}
	}

	if time.Since(alert.CreatedAt) < requesterOfflineAlertTTL {
		return false, nil
	}

	requesterOffline, err := s.isRequesterOffline(ctx, alert.UserID)
	if err != nil {
		return false, err
	}

	if requesterOffline {
		if err := s.CancelAlert(ctx, alert.ID, alert.UserID); err != nil && !errors.Is(err, ErrAlertInactive) {
			return false, err
		}
		return true, nil
	}

	return false, nil
}

func (s *AlertService) getAcceptedResponderCount(ctx context.Context, alertID uuid.UUID) (int64, error) {
	var responderCount int64
	if err := s.db.WithContext(ctx).
		Model(&models.AlertResponse{}).
		Where("alert_id = ? AND response_status IN ?", alertID, []string{"accepted", "arrived", "helping"}).
		Count(&responderCount).Error; err != nil {
		return 0, err
	}
	return responderCount, nil
}

func (s *AlertService) getLatestPoliceEscalationTime(ctx context.Context, alertID uuid.UUID) (time.Time, bool, error) {
	var escalation models.AlertEscalation
	err := s.db.WithContext(ctx).
		Where("alert_id = ? AND escalation_type = ? AND escalation_status IN ?", alertID, "police", []string{"pending", "dispatched"}).
		Order("escalated_at DESC").
		First(&escalation).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return time.Time{}, false, nil
	}
	if err != nil {
		return time.Time{}, false, err
	}

	return escalation.EscalatedAt, true, nil
}

func (s *AlertService) isRequesterOffline(ctx context.Context, userID uint) (bool, error) {
	var latestLocation models.UserLocation
	err := s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("recorded_at DESC").
		First(&latestLocation).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return true, nil
	}
	if err != nil {
		return false, err
	}

	return time.Since(latestLocation.RecordedAt) >= requesterOfflineAlertTTL, nil
}

// Helpers

func (s *AlertService) logTimelineEvent(alertID uuid.UUID, eventType string, radius, usersNotified, respondersCount int, eventData ...map[string]interface{}) {
	payload := ""
	if len(eventData) > 0 && eventData[0] != nil {
		if raw, err := json.Marshal(eventData[0]); err == nil {
			payload = string(raw)
		}
	}

	event := models.AlertTimelineEvent{
		AlertID:         alertID,
		EventType:       eventType,
		RadiusAtEvent:   radius,
		UsersNotified:   usersNotified,
		RespondersCount: respondersCount,
		EventData:       payload,
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

func (s *AlertService) calculateAlertDuration(alert models.EmergencyAlert) int {
	endTime := time.Now()
	if alert.ResolvedAt != nil {
		endTime = *alert.ResolvedAt
	} else if alert.CancelledAt != nil {
		endTime = *alert.CancelledAt
	}

	if endTime.Before(alert.CreatedAt) {
		return 0
	}

	return int(endTime.Sub(alert.CreatedAt).Seconds())
}

func (s *AlertService) getEmergencyServicesStatus(ctx context.Context, alertID uuid.UUID) (string, error) {
	var escalation models.AlertEscalation
	err := s.db.WithContext(ctx).
		Where("alert_id = ?", alertID).
		Order("escalated_at DESC").
		First(&escalation).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "Not contacted", nil
	}
	if err != nil {
		return "", err
	}

	switch escalation.EscalationStatus {
	case "dispatched":
		return fmt.Sprintf("%s contacted", escalation.EscalationType), nil
	case "pending":
		return fmt.Sprintf("%s being contacted", escalation.EscalationType), nil
	default:
		return escalation.EscalationStatus, nil
	}
}

func (s *AlertService) getAlertResponders(ctx context.Context, alertID uuid.UUID) ([]AlertResponderSummary, error) {
	type responderRow struct {
		UserID         uint       `gorm:"column:user_id"`
		Name           string     `gorm:"column:name"`
		Phone          string     `gorm:"column:phone"`
		ResponseStatus string     `gorm:"column:response_status"`
		DistanceMeters float64    `gorm:"column:distance_meters"`
		ETASeconds     int        `gorm:"column:eta_seconds"`
		RespondedAt    time.Time  `gorm:"column:responded_at"`
		ArrivedAt      *time.Time `gorm:"column:arrived_at"`
		ResponseRating *int       `gorm:"column:response_rating"`
	}

	var rows []responderRow
	err := s.db.WithContext(ctx).Raw(`
		SELECT
			u.id AS user_id,
			COALESCE(NULLIF(u.name, ''), 'Verified responder') AS name,
			u.phone AS phone,
			ar.response_status,
			COALESCE(ar.distance_meters, 0) AS distance_meters,
			GREATEST(COALESCE(ar.estimated_arrival_minutes, 0), 0) * 60 AS eta_seconds,
			ar.responded_at,
			ar.arrived_at,
			ar.response_rating
		FROM alert_responses ar
		JOIN users u ON u.id = ar.responder_user_id
		WHERE ar.alert_id = ?
		  AND ar.response_status IN ('accepted', 'arrived', 'helping')
		ORDER BY ar.responded_at ASC
	`, alertID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	responders := make([]AlertResponderSummary, 0, len(rows))
	for _, row := range rows {
		responders = append(responders, AlertResponderSummary{
			UserID:         row.UserID,
			Name:           row.Name,
			Phone:          row.Phone,
			ResponseStatus: row.ResponseStatus,
			DistanceMeters: row.DistanceMeters,
			ETASeconds:     row.ETASeconds,
			RespondedAt:    row.RespondedAt,
			ArrivedAt:      row.ArrivedAt,
			ResponseRating: row.ResponseRating,
		})
	}

	return responders, nil
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
