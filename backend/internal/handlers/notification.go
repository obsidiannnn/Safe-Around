package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/obsidiannnn/Safe-Around/backend/internal/services"
	"github.com/obsidiannnn/Safe-Around/backend/pkg/logger"
	"go.uber.org/zap"
)

type NotificationHandler struct {
	notifService services.NotificationService
}

func NewNotificationHandler(svc services.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifService: svc}
}

type PushNotificationRequest struct {
	UserID      uint              `json:"user_id" binding:"required"`
	DeviceToken string            `json:"device_token" binding:"required"`
	Title       string            `json:"title" binding:"required"`
	Body        string            `json:"body" binding:"required"`
	Data        map[string]string `json:"data"`
}

type SMSRequest struct {
	Phone   string `json:"phone" binding:"required"`
	Message string `json:"message" binding:"required"`
}

type RegisterTokenRequest struct {
	Token    string `json:"token" binding:"required"`
	Platform string `json:"platform" binding:"required"`
}

// SendPushNotification handles admin-triggered external Push events
func (h *NotificationHandler) SendPushNotification(c *gin.Context) {
	var req PushNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("BAD_REQUEST", err.Error()))
		return
	}

	// In real setup, user_id from context must have global Admin roles.
	err := h.notifService.SendPushNotification(req.UserID, req.DeviceToken, req.Title, req.Body, req.Data)
	if err != nil {
		logger.Error("Failed handling push request", zap.Error(err))
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "failed to process push notification"))
		return
	}

	c.JSON(http.StatusOK, SuccessResponse(gin.H{"message": "notification dispatched to queue/fcm"}))
}

func (h *NotificationHandler) RegisterDeviceToken(c *gin.Context) {
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse("UNAUTHORIZED", "missing user context"))
		return
	}

	var req RegisterTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("BAD_REQUEST", err.Error()))
		return
	}

	if req.Platform != "android" && req.Platform != "ios" {
		c.JSON(http.StatusBadRequest, ErrorResponse("BAD_REQUEST", "platform must be ios or android"))
		return
	}

	if err := h.notifService.RegisterDeviceToken(userIDRaw.(uint), req.Token, req.Platform); err != nil {
		logger.Error("Failed to register device token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "failed to register device token"))
		return
	}

	c.JSON(http.StatusOK, SuccessResponse(gin.H{"message": "device token registered"}))
}

// GetNotificationHistory returns a user's notification timeline with pagination
func (h *NotificationHandler) GetNotificationHistory(c *gin.Context) {
	// Extracted from AuthRequired middleware
	userIDRaw, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse("UNAUTHORIZED", "missing user context"))
		return
	}
	userID := userIDRaw.(uint)

	limitStr := c.DefaultQuery("limit", "20")
	pageStr := c.DefaultQuery("page", "1")
	
	limit, _ := strconv.Atoi(limitStr)
	page, _ := strconv.Atoi(pageStr)
	offset := (page - 1) * limit

	notifs, total, err := h.notifService.GetHistory(userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "failed retrieving history"))
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	c.JSON(http.StatusOK, PaginatedResponse(notifs, total, totalPages, page, limit))
}

// UpdateNotificationStatus allows a user to mark a notification as read
func (h *NotificationHandler) UpdateNotificationStatus(c *gin.Context) {
	notifIDStr := c.Param("id")
	notifID, err := strconv.Atoi(notifIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("BAD_REQUEST", "invalid notification id"))
		return
	}

	// Optional check: ensure notif actually belongs to user!
	if err := h.notifService.MarkAsRead(uint(notifID)); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "failed mapping status update"))
		return
	}

	c.JSON(http.StatusOK, SuccessResponse(gin.H{"message": "notification marked read"}))
}
