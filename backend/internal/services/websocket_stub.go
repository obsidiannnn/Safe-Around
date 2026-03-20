package services

import (
	"github.com/google/uuid"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
)

type WebSocketHub struct {
	// Stub to fulfill dependencies
}

func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{}
}

func (h *WebSocketHub) BroadcastEmergencyAlert(alert *models.EmergencyAlert) {
	// stub
}

func (h *WebSocketHub) BroadcastRadiusExpanded(alertID uuid.UUID, oldRadius, newRadius int) {
	// stub
}

func (h *WebSocketHub) BroadcastResponderAccepted(alertID uuid.UUID, response *models.AlertResponse) {
	// stub
}

func (h *WebSocketHub) CloseRoom(roomName string) {
	// stub
}
