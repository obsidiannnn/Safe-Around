package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/fcm"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/twilio"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const (
	notificationCategoryEmergencyAlert = "EMERGENCY_ALERT"
	notificationCategoryAlertStatus    = "ALERT_STATUS"
)

// --- Interface ---

type NotificationService interface {
	SendPushNotification(userID uint, deviceToken, title, body string, data map[string]string) error
	SendSMS(phone, message string) error
	QueueNotification(userID uint, title, body, notifType string) error
	GetHistory(userID uint, limit, offset int) ([]models.Notification, int64, error)
	MarkAsRead(notifID uint) error
	RegisterDeviceToken(userID uint, token, platform string) error
	SendEmergencyAlert(userID uint, alert *models.EmergencyAlert) error
	NotifyResponderAccepted(userID uint, response *models.AlertResponse) error
	NotifyAllParticipants(alertID uuid.UUID, message string) error
	NotifyEmergencyContacts(userID uint, alert *models.EmergencyAlert) error
}

// --- Internal Task struct ---

type notificationTask struct {
	UserID           uint
	NotificationType string
	Title            string
	Body             string
	Data             map[string]interface{}
	Priority         string // "critical", "high", "normal"
	AlertID          *uuid.UUID
	Phone            string // Override: send SMS directly to this phone
}

// --- Service Implementation ---

type notifService struct {
	fcm    *fcm.Client
	twilio *twilio.Client
	db     *gorm.DB
	redis  *redis.Client
	queue  chan *notificationTask
}

func NewNotificationService(fcmClient *fcm.Client, twilioClient *twilio.Client, db *gorm.DB, rdb *redis.Client) NotificationService {
	ns := &notifService{
		fcm:    fcmClient,
		twilio: twilioClient,
		db:     db,
		redis:  rdb,
		queue:  make(chan *notificationTask, 1000),
	}
	// Start 10-worker goroutine pool
	for i := 0; i < 10; i++ {
		go ns.worker()
	}
	return ns
}

// worker processes notifications from the queue
func (s *notifService) worker() {
	for task := range s.queue {
		s.processTask(task)
	}
}

// ---- Public API ----

func (s *notifService) SendPushNotification(userID uint, deviceToken, title, body string, data map[string]string) error {
	notif := models.Notification{
		UserID: userID,
		Title:  title,
		Body:   body,
		Type:   "push",
		Status: "pending",
	}
	if err := s.db.Create(&notif).Error; err != nil {
		return err
	}

	iData := make(map[string]interface{}, len(data))
	for k, v := range data {
		iData[k] = v
	}

	msgID, err := s.sendWithRetry(deviceToken, title, body, data)
	if err != nil {
		notif.Status = "failed"
		notif.Error = err.Error()
	} else {
		notif.Status = "sent"
		notif.MessageID = msgID
	}
	saveErr := s.db.Save(&notif).Error
	if err != nil {
		if saveErr != nil {
			return fmt.Errorf("push delivery failed: %w (additionally failed to persist notification status: %v)", err, saveErr)
		}
		return err
	}
	return saveErr
}

func (s *notifService) SendSMS(phone, message string) error {
	if phone == "" {
		return nil
	}
	fromNum := os.Getenv("TWILIO_FROM")
	_, err := s.twilio.SendSMS(phone, fromNum, message)
	if err != nil {
		logger.Warn("SMS send failed", zap.String("phone", phone), zap.Error(err))
	}
	return err
}

func (s *notifService) QueueNotification(userID uint, title, body, notifType string) error {
	ctx := context.Background()
	payload := map[string]interface{}{
		"user_id": userID,
		"title":   title,
		"body":    body,
		"type":    notifType,
	}
	return s.redis.XAdd(ctx, &redis.XAddArgs{
		Stream: "notification_queue",
		Values: payload,
	}).Err()
}

func (s *notifService) GetHistory(userID uint, limit, offset int) ([]models.Notification, int64, error) {
	var notifs []models.Notification
	var total int64
	query := s.db.Model(&models.Notification{}).Where("user_id = ?", userID)
	query.Count(&total)
	err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&notifs).Error
	return notifs, total, err
}

func (s *notifService) MarkAsRead(notifID uint) error {
	now := time.Now()
	return s.db.Model(&models.NotificationLog{}).
		Where("id = ?", notifID).
		Updates(map[string]interface{}{"status": "read", "read_at": &now}).Error
}

func (s *notifService) RegisterDeviceToken(userID uint, token, platform string) error {
	token = strings.TrimSpace(token)
	platform = strings.ToLower(strings.TrimSpace(platform))
	if token == "" {
		return errors.New("device token is required")
	}

	var session models.UserSession
	err := s.db.
		Where("user_id = ? AND is_revoked = ?", userID, false).
		Order("created_at DESC").
		First(&session).Error
	if err != nil {
		return err
	}

	if platform == "ios" {
		session.APNsToken = token
		session.FCMToken = ""
	} else {
		session.FCMToken = token
		session.APNsToken = ""
	}

	return s.db.Save(&session).Error
}

// ---- Emergency-specific methods ----

func (s *notifService) SendEmergencyAlert(userID uint, alert *models.EmergencyAlert) error {
	task := &notificationTask{
		UserID:           userID,
		NotificationType: "emergency_alert",
		Title:            "🚨 Emergency Alert Nearby",
		Body:             "Someone near you needs urgent help. Please respond.",
		Data: map[string]interface{}{
			"alert_id":       alert.ID.String(),
			"alert_type":     alert.AlertType,
			"category":       notificationCategoryEmergencyAlert,
			"user_id":        alert.UserID,
			"latitude":       alert.AlertLocation.Latitude,
			"longitude":      alert.AlertLocation.Longitude,
			"current_radius": alert.CurrentRadius,
			"users_notified": alert.UsersNotified,
			"created_at":     alert.CreatedAt.UTC().Format(time.RFC3339),
		},
		Priority: "critical",
		AlertID:  &alert.ID,
	}
	// Critical: try queue, fall back to direct
	select {
	case s.queue <- task:
	default:
		go s.processTask(task)
	}
	return nil
}

func (s *notifService) NotifyResponderAccepted(userID uint, response *models.AlertResponse) error {
	task := &notificationTask{
		UserID:           userID,
		NotificationType: "responder_accepted",
		Title:            "✅ Help is on the way!",
		Body:             fmt.Sprintf("A responder is %d meters away (~%d min ETA)", int(response.DistanceMeters), response.EstimatedArrivalMinutes),
		Data: map[string]interface{}{
			"alert_id":    response.AlertID,
			"category":    notificationCategoryAlertStatus,
			"distance_m":  response.DistanceMeters,
			"eta_minutes": response.EstimatedArrivalMinutes,
		},
		Priority: "high",
		AlertID:  &response.AlertID,
	}
	s.queue <- task
	return nil
}

func (s *notifService) NotifyAllParticipants(alertID uuid.UUID, message string) error {
	// Find all responders for this alert
	var responses []models.AlertResponse
	s.db.Where("alert_id = ?", alertID).Find(&responses)

	for _, r := range responses {
		s.queue <- &notificationTask{
			UserID:           r.ResponderUserID,
			NotificationType: "alert_update",
			Title:            "Alert Update",
			Body:             message,
			Data: map[string]interface{}{
				"alert_id": alertID.String(),
				"category": notificationCategoryAlertStatus,
				"room_id":  fmt.Sprintf("alert_%s", alertID.String()),
				"message":  message,
			},
			Priority: "high",
			AlertID:  &alertID,
		}
	}
	return nil
}

func (s *notifService) NotifyEmergencyContacts(userID uint, alert *models.EmergencyAlert) error {
	var contacts []models.EmergencyContact
	s.db.Where("user_id = ?", userID).Find(&contacts)

	var user models.User
	s.db.First(&user, userID)

	msgText := fmt.Sprintf(
		"EMERGENCY: %s has triggered an SOS alert. Location: https://maps.google.com/?q=%f,%f — Please check on them immediately.",
		user.Name,
		alert.AlertLocation.Latitude,
		alert.AlertLocation.Longitude,
	)

	for _, contact := range contacts {
		// 1. Try to find a registered user with this phone number
		var contactUser models.User
		if err := s.db.Where("phone = ?", contact.Phone).First(&contactUser).Error; err == nil {
			// Found a registered user! Send in-app notification
			s.queue <- &notificationTask{
				UserID:           contactUser.ID,
				NotificationType: "emergency_contact_alert",
				Title:            "🚨 Emergency: " + user.Name,
				Body:             user.Name + " is in danger! Tap to see live location.",
				Data: map[string]interface{}{
					"alert_id":       alert.ID.String(),
					"category":       notificationCategoryEmergencyAlert,
					"user_id":        alert.UserID,
					"latitude":       alert.AlertLocation.Latitude,
					"longitude":      alert.AlertLocation.Longitude,
					"current_radius": alert.CurrentRadius,
					"users_notified": alert.UsersNotified,
					"created_at":     alert.CreatedAt.UTC().Format(time.RFC3339),
					"victim_name":    user.Name,
					"victim_phone":   user.Phone,
				},
				Priority: "critical",
				AlertID:  &alert.ID,
			}
		}

		// 2. Always send SMS backup (as requested: "message will be triggered")
		go func(phone string) {
			if err := s.SendSMS(phone, msgText); err != nil {
				logger.Warn("Emergency contact SMS/Call failed", zap.String("phone", phone), zap.Error(err))
			}
		}(contact.Phone)
	}
	return nil
}

// ---- Internal Processing ----

func (s *notifService) processTask(task *notificationTask) {
	// Look up the user's active session for device token
	var session models.UserSession
	sessionErr := s.db.Where("user_id = ? AND is_revoked = ?", task.UserID, false).
		Order("created_at DESC").
		First(&session).Error

	dataJSON, _ := json.Marshal(task.Data)
	logEntry := &models.NotificationLog{
		UserID:           task.UserID,
		NotificationType: task.NotificationType,
		Title:            task.Title,
		Body:             task.Body,
		DataJSON:         string(dataJSON),
		Status:           "pending",
		AlertID:          task.AlertID,
	}

	if sessionErr != nil || (session.FCMToken == "" && session.APNsToken == "") {
		// No device token found — mark as failed
		logEntry.Status = "failed"
		logEntry.ErrorMessage = "no active device token found"
		s.db.Create(logEntry)

		// For critical: SMS fallback
		if task.Priority == "critical" {
			s.smsFallback(task)
		}
		return
	}

	var (
		msgID   string
		sendErr error
	)

	strData := make(map[string]string)
	for k, v := range task.Data {
		strData[k] = fmt.Sprint(v)
	}

	if session.FCMToken != "" {
		logEntry.Channel = "fcm"
		logEntry.DeviceToken = session.FCMToken
		msgID, sendErr = s.sendWithRetry(session.FCMToken, task.Title, task.Body, strData)
	} else if session.APNsToken != "" {
		// APNs: stub — would use apple/apns2 library in production
		logEntry.Channel = "apns"
		logEntry.DeviceToken = session.APNsToken
		msgID = "apns_stub"
		sendErr = nil
	}

	now := time.Now()
	if sendErr != nil {
		logEntry.Status = "failed"
		logEntry.ErrorMessage = sendErr.Error()
	} else {
		logEntry.Status = "sent"
		logEntry.ExternalID = msgID
		logEntry.SentAt = &now
	}

	s.db.Create(logEntry)

	// Critical: also send SMS as backup
	if task.Priority == "critical" {
		s.smsFallback(task)
	}
}

// sendWithRetry sends via FCM with exponential backoff: 1s, 5s, 30s
func (s *notifService) sendWithRetry(token, title, body string, data map[string]string) (string, error) {
	delays := []time.Duration{1 * time.Second, 5 * time.Second, 30 * time.Second}
	var lastErr error
	for attempt, delay := range delays {
		msgID, err := s.fcm.SendNotification(token, title, body, data)
		if err == nil {
			return msgID, nil
		}
		lastErr = err
		logger.Warn("FCM retry", zap.Int("attempt", attempt+1), zap.Error(err))
		time.Sleep(delay)
	}
	return "", lastErr
}

// smsFallback sends an SMS via Twilio when push fails
func (s *notifService) smsFallback(task *notificationTask) {
	var user models.User
	if err := s.db.First(&user, task.UserID).Error; err != nil || user.Phone == "" {
		return
	}
	if err := s.SendSMS(user.Phone, task.Body); err != nil {
		logger.Warn("SMS fallback failed", zap.Uint("userID", task.UserID), zap.Error(err))
	}
}

// SendBatchPush sends a multicast notification to up to 500 FCM tokens at a time.
func (s *notifService) SendBatchPush(userIDs []uint, title, body string, data map[string]string) {
	// Collect active FCM tokens
	var sessions []models.UserSession
	s.db.Where("user_id IN ? AND is_revoked = ? AND fcm_token != ?", userIDs, false, "").
		Order("created_at DESC").
		Find(&sessions)

	tokens := make([]string, 0, len(sessions))
	for _, sess := range sessions {
		tokens = append(tokens, sess.FCMToken)
	}

	// Chunk into 500-token batches (FCM multicast limit)
	batchSize := 500
	for i := 0; i < len(tokens); i += batchSize {
		end := i + batchSize
		if end > len(tokens) {
			end = len(tokens)
		}
		batch := tokens[i:end]
		go func(chunk []string) {
			if _, err := s.fcm.SendMulticast(chunk, title, body, data); err != nil {
				logger.Warn("Batch FCM send failed", zap.Int("batch_size", len(chunk)), zap.Error(err))
			}
		}(batch)
	}
}
