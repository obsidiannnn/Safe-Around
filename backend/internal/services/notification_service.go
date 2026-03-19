package services

import (
	"context"
	"time"

	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/fcm"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/twilio"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type NotificationService interface {
	SendPushNotification(userID uint, deviceToken, title, body string, data map[string]string) error
	SendSMS(phone, message string) error
	QueueNotification(userID uint, title, body, notifType string) error
	GetHistory(userID uint, limit, offset int) ([]models.Notification, int64, error)
	MarkAsRead(notifID uint) error
}

type notifService struct {
	fcm    *fcm.Client
	twilio *twilio.Client
	db     *gorm.DB
	redis  *redis.Client
}

func NewNotificationService(fcmClient *fcm.Client, twilioClient *twilio.Client, db *gorm.DB, rdb *redis.Client) NotificationService {
	return &notifService{
		fcm:    fcmClient,
		twilio: twilioClient,
		db:     db,
		redis:  rdb,
	}
}

// SendPushNotification sends a payload instantly via FCM and records to DB. Uses basic retry mechanics if network drops externally to breaker.
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

	var msgID string
	var sendErr error

	// Basic Exponential Backoff Retry (Max 3 attempts if transient)
	for i := 0; i < 3; i++ {
		msgID, sendErr = s.fcm.SendNotification(deviceToken, title, body, data)
		if sendErr == nil {
			break
		}
		logger.Warn("FCM send failed, retrying...", zap.Int("attempt", i+1), zap.Error(sendErr))
		time.Sleep(time.Duration(2^i) * time.Second)
	}

	if sendErr != nil {
		notif.Status = "failed"
		notif.Error = sendErr.Error()
	} else {
		notif.Status = "sent"
		notif.MessageID = msgID
	}

	return s.db.Save(&notif).Error
}

func (s *notifService) SendSMS(phone, message string) error {
	logger.Info("Standalone programmatic SMS currently disabled to favor Verify API", zap.String("phone", phone))
	return nil
}

// QueueNotification sets up a background job natively via Redis
func (s *notifService) QueueNotification(userID uint, title, body, notifType string) error {
	// Simple Redis Pub/Sub queue implementation for workers
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
	return s.db.Model(&models.Notification{}).Where("id = ?", notifID).Update("status", "read").Error
}
