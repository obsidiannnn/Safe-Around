package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/obsidiannnn/Safe-Around/backend/internal/utils"
	customWS "github.com/obsidiannnn/Safe-Around/backend/internal/websocket"
)

type WebSocketHandler struct {
	hub *customWS.Hub
}

func NewWebSocketHandler(hub *customWS.Hub) *WebSocketHandler {
	return &WebSocketHandler{hub: hub}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in dev
	},
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// Authenticate user from query param token specifically for browsers that can't send Auth Headers initially in WS handshakes
	token := c.Query("token")
	userIDStr, err := h.validateToken(token)
	if err != nil {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return // Gin has already sent the error response internally via Upgrader
	}

	client := customWS.NewClient(h.hub, conn, userIDStr)

	// Start read/write pumps
	go client.WritePump()
	go client.ReadPump()
}

func (h *WebSocketHandler) validateToken(tokenText string) (string, error) {
	// Fallback validation against JWT utilizing the internal utility standard.
	// We extract userId string and parse it.
	claims, err := utils.ValidateToken(tokenText)
	if err != nil {
		return "", err
	}

	return fmt.Sprint(claims.UserID), nil
}
