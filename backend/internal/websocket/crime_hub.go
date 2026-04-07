package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
)

type CrimeHub struct {
	db         *pgxpool.Pool
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.RWMutex
}

func NewCrimeHub(db *pgxpool.Pool) *CrimeHub {
	hub := &CrimeHub{
		db:         db,
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}

	go hub.Run()
	go hub.ListenPostgres()

	return hub
}

func (h *CrimeHub) Run() {
	for {
		select {
		case conn := <-h.register:
			h.mu.Lock()
			h.clients[conn] = true
			h.mu.Unlock()
			log.Printf("Client connected. Total: %d", len(h.clients))

		case conn := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
			}
			h.mu.Unlock()
			log.Printf("Client disconnected. Total: %d", len(h.clients))

		case message := <-h.broadcast:
			h.mu.RLock()
			for conn := range h.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("Write error: %v", err)
					conn.Close()
					delete(h.clients, conn)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *CrimeHub) ListenPostgres() {
	conn, err := h.db.Acquire(context.Background())
	if err != nil {
		log.Fatal("Failed to acquire connection:", err)
	}
	defer conn.Release()

	// Listen to PostgreSQL notifications
	_, err = conn.Exec(context.Background(), "LISTEN crime_channel")
	if err != nil {
		log.Fatal("Failed to LISTEN:", err)
	}

	log.Println("✅ Listening for real-time crime updates on 'crime_channel'...")

	for {
		notification, err := conn.Conn().WaitForNotification(context.Background())
		if err != nil {
			log.Println("Notification error:", err)
			continue
		}

		log.Printf("📢 New crime: %s", notification.Payload)

		// Broadcast to all connected clients
		h.broadcast <- []byte(notification.Payload)
	}
}

func (h *CrimeHub) Register(conn *websocket.Conn) {
	h.register <- conn
}

func (h *CrimeHub) Unregister(conn *websocket.Conn) {
	h.unregister <- conn
}

func (h *CrimeHub) broadcastEvent(event string, data map[string]interface{}) {
	payload, err := json.Marshal(WebSocketMessage{Event: event, Data: data})
	if err != nil {
		log.Printf("Failed to marshal websocket event %s: %v", event, err)
		return
	}
	h.broadcast <- payload
}

func (h *CrimeHub) BroadcastEmergencyAlert(alert *models.EmergencyAlert) {
	h.broadcastEvent("emergency_alert", map[string]interface{}{
		"alert_id": alert.ID.String(),
		"user": map[string]interface{}{
			"full_name": "Distressed User",
			"user_id":   alert.UserID,
		},
		"location": map[string]float64{
			"latitude":  alert.AlertLocation.Latitude,
			"longitude": alert.AlertLocation.Longitude,
		},
		"distance":       0,
		"current_radius": alert.CurrentRadius,
		"created_at":     alert.CreatedAt,
	})
}

func (h *CrimeHub) BroadcastResponderAccepted(alertID uuid.UUID, response *models.AlertResponse) {
	h.broadcastEvent("responder_accepted", map[string]interface{}{
		"alert_id":     alertID.String(),
		"responder_id": response.ResponderUserID,
		"distance":     response.DistanceMeters,
		"eta":          response.EstimatedArrivalMinutes,
		"responded_at": response.RespondedAt,
	})
}

func (h *CrimeHub) BroadcastRadiusExpanded(alertID uuid.UUID, oldRadius, newRadius int) {
	h.broadcastEvent("radius_expanded", map[string]interface{}{
		"alert_id":   alertID.String(),
		"old_radius": oldRadius,
		"new_radius": newRadius,
		"timestamp":  time.Now().UTC(),
	})
}

func (h *CrimeHub) CloseRoom(roomID string) {
	h.broadcastEvent("room_closed", map[string]interface{}{
		"room_id": roomID,
	})
}
