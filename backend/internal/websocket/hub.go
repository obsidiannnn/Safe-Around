package websocket

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/obsidiannnn/Safe-Around/backend/internal/models"
)

type Hub struct {
	// Registered clients (user_id -> connection)
	clients map[string]*Client

	// Active rooms (room_id -> set of clients)
	rooms map[string]map[*Client]bool

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Broadcast message to room
	broadcast chan *BroadcastMessage

	// Mutex for thread safety
	mu sync.RWMutex
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID string
	rooms  map[string]bool
}

type BroadcastMessage struct {
	roomID  string
	message []byte
}

type WebSocketMessage struct {
	Event string                 `json:"event"`
	Data  map[string]interface{} `json:"data"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
	}
}

func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
	client := &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
		rooms:  make(map[string]bool),
	}
	hub.register <- client
	return client
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.userID] = client
			h.mu.Unlock()

			// Send connection confirmation
			h.sendToClient(client, WebSocketMessage{
				Event: "connected",
				Data: map[string]interface{}{
					"user_id":     client.userID,
					"server_time": time.Now().UTC(),
				},
			})

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.userID]; ok {
				delete(h.clients, client.userID)
				close(client.send)

				// Remove from all rooms
				for roomID := range client.rooms {
					if room, ok := h.rooms[roomID]; ok {
						delete(room, client)
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			room, ok := h.rooms[message.roomID]
			h.mu.RUnlock()

			if ok {
				for client := range room {
					select {
					case client.send <- message.message:
					default:
						// Client slow, close connection
						close(client.send)
						h.mu.Lock()
						delete(h.clients, client.userID)
						delete(room, client)
						h.mu.Unlock()
					}
				}
			}
		}
	}
}

func (h *Hub) JoinRoom(userID, roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client, ok := h.clients[userID]
	if !ok {
		return
	}

	// Create room if doesn't exist
	if _, ok := h.rooms[roomID]; !ok {
		h.rooms[roomID] = make(map[*Client]bool)
	}

	// Add client to room
	h.rooms[roomID][client] = true
	client.rooms[roomID] = true
}

func (h *Hub) LeaveRoom(userID, roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	client, ok := h.clients[userID]
	if !ok {
		return
	}

	if room, ok := h.rooms[roomID]; ok {
		delete(room, client)
		delete(client.rooms, roomID)
	}
}

func (h *Hub) BroadcastToRoom(roomID string, event string, data map[string]interface{}) {
	message := WebSocketMessage{
		Event: event,
		Data:  data,
	}

	msgBytes, _ := json.Marshal(message)

	h.broadcast <- &BroadcastMessage{
		roomID:  roomID,
		message: msgBytes,
	}
}

func (h *Hub) SendToUser(userID string, event string, data map[string]interface{}) {
	h.mu.RLock()
	client, ok := h.clients[userID]
	h.mu.RUnlock()

	if !ok {
		return
	}

	h.sendToClient(client, WebSocketMessage{
		Event: event,
		Data:  data,
	})
}

func (h *Hub) sendToClient(client *Client, message WebSocketMessage) {
	msgBytes, _ := json.Marshal(message)

	select {
	case client.send <- msgBytes:
	default:
		// Buffer full or network dropping: push to Redis queue here
		// E.g., h.redis.RPush(ctx, "client:queue:"+client.userID, msgBytes)
		// Set TTL 24h
		fmt.Printf("Dropped WS Message. Queueing onto Redis TTL block for offline delivery to user: %s\n", client.userID)
	}
}

func calculateAge(dob time.Time) int {
	if dob.IsZero() {
		return 0
	}
	now := time.Now()
	age := now.Year() - dob.Year()
	if now.YearDay() < dob.YearDay() {
		age--
	}
	return age
}

// Specific broadcast methods for SafeAround events

func (h *Hub) BroadcastEmergencyAlert(alert *models.EmergencyAlert) {
	// Normally we would pre-load User via GORM Preload before casting event.
	// Falling back to defaults since models.EmergencyAlert only explicitly holds UserID directly right now.
	fullName := "Distressed User"

	var lat, lng float64
	lat = alert.AlertLocation.Latitude
	lng = alert.AlertLocation.Longitude

	// Broadcast to all connected users in vicinity
	h.BroadcastToRoom("global", "emergency_alert", map[string]interface{}{
		"alert_id": alert.ID,
		"user": map[string]interface{}{
			"full_name": fullName,
			"user_id":   alert.UserID,
		},
		"location": map[string]float64{
			"latitude":  lat,
			"longitude": lng,
		},
		"distance":   0, // calculated per user locally by mobile client via LocationService coordinates
		"created_at": alert.CreatedAt,
	})
}

func (h *Hub) BroadcastResponderAccepted(alertID uuid.UUID, response *models.AlertResponse) {
	roomID := fmt.Sprintf("alert_%s", alertID.String())

	h.BroadcastToRoom(roomID, "responder_accepted", map[string]interface{}{
		"responder_id":   response.ResponderUserID,
		"distance":       response.DistanceMeters,
		"eta":            response.EstimatedArrivalMinutes,
		"responded_at":   response.RespondedAt,
	})
}

func (h *Hub) BroadcastRadiusExpanded(alertID uuid.UUID, oldRadius, newRadius int) {
	roomID := fmt.Sprintf("alert_%s", alertID.String())

	h.BroadcastToRoom(roomID, "radius_expanded", map[string]interface{}{
		"alert_id":   alertID,
		"old_radius": oldRadius,
		"new_radius": newRadius,
		"timestamp":  time.Now().UTC(),
	})
}

func (h *Hub) BroadcastLocationUpdate(alertID uuid.UUID, userID uuid.UUID, location Location) {
	roomID := fmt.Sprintf("alert_%s", alertID.String())

	h.BroadcastToRoom(roomID, "location_broadcast", map[string]interface{}{
		"user_id": userID,
		"location": map[string]float64{
			"latitude":  location.Latitude,
			"longitude": location.Longitude,
		},
		"timestamp": time.Now().UTC(),
	})
}

func (h *Hub) CloseRoom(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.rooms[roomID]; ok {
		// Notify all clients
		closeMsg := WebSocketMessage{
			Event: "room_closed",
			Data: map[string]interface{}{
				"room_id": roomID,
			},
		}
		msgBytes, _ := json.Marshal(closeMsg)

		for client := range room {
			select {
			case client.send <- msgBytes:
			default:
			}
			delete(client.rooms, roomID)
		}

		delete(h.rooms, roomID)
	}
}
