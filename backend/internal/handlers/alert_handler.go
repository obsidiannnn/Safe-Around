package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
	"github.com/obsidiannnn/Safe-Around/backend/internal/services"
)

type AlertHandler struct {
	alertService *services.AlertService
}

func NewAlertHandler(as *services.AlertService) *AlertHandler {
	return &AlertHandler{alertService: as}
}

// POST /api/v1/alerts
func (h *AlertHandler) CreateAlert(c *gin.Context) {
	// Extract userID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	var req struct {
		Latitude   float64 `json:"latitude" binding:"required"`
		Longitude  float64 `json:"longitude" binding:"required"`
		AlertType  string  `json:"alert_type"`
		SilentMode bool    `json:"silent_mode"`
		Metadata   string  `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createReq := services.CreateAlertRequest{
		UserID: userID,
		Location: models.Location{
			Latitude:  req.Latitude,
			Longitude: req.Longitude,
		},
		AlertType:  req.AlertType,
		SilentMode: req.SilentMode,
		Metadata:   req.Metadata,
	}

	if createReq.AlertType == "" {
		createReq.AlertType = "emergency"
	}

	alert, err := h.alertService.CreateAlert(c.Request.Context(), createReq)
	if err != nil {
		log.Printf("Failed to create alert: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create emergency alert"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Emergency alert created and broadcasted successfully",
		"alert":   alert,
	})
}

// GET /api/v1/alerts/:id
func (h *AlertHandler) GetAlertDetails(c *gin.Context) {
	// For now, this requires the alert service or repository to fetch it
	// Since GetAlertDetails is not explicitly in AlertService spec, we return a stub
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Handler logic requires DB read not yet configured"})
}

// POST /api/v1/alerts/:id/respond
func (h *AlertHandler) RespondToAlert(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	responderID := userIDVal.(uint)

	alertIDStr := c.Param("id")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID format"})
		return
	}

	var req struct {
		Latitude  float64 `json:"latitude" binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loc := models.Location{
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}

	err = h.alertService.AcceptAlert(c.Request.Context(), alertID, responderID, loc)
	if err != nil {
		log.Printf("Failed to accept alert: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept alert response"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Response to alert logged successfully"})
}

// PATCH /api/v1/alerts/:id/status
func (h *AlertHandler) UpdateAlertStatus(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	alertIDStr := c.Param("id")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID format"})
		return
	}

	var req struct {
		Status         string `json:"status" binding:"required"`
		ResolutionType string `json:"resolution_type"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Status == "resolved" {
		err = h.alertService.ResolveAlert(c.Request.Context(), alertID, userID, req.ResolutionType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve alert"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Alert resolved successfully"})
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported status update. Use 'resolved'."})
}

// POST /api/v1/alerts/:id/escalate
func (h *AlertHandler) EscalateAlert(c *gin.Context) {
	alertIDStr := c.Param("id")
	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid alert ID format"})
		return
	}

	var req struct {
		EscalationType string `json:"escalation_type" binding:"required"` // police, ambulance
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.alertService.EscalateToEmergencyServices(alertID, req.EscalationType)
	if err != nil {
		log.Printf("Escalation failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Emergency escalation dispatch failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alert escalated to formal emergency services"})
}

// GET    /api/v1/alerts/active
func (h *AlertHandler) GetActiveAlerts(c *gin.Context) {
	alerts, err := h.alertService.GetActiveAlerts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active alerts"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": alerts})
}

// GET    /api/v1/alerts/history
func (h *AlertHandler) GetAlertHistory(c *gin.Context) {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(uint)

	alerts, err := h.alertService.GetAlertHistory(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch alert history"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": alerts})
}
