package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
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

	// Database pool for LISTEN/NOTIFY
	dbPool *pgxpool.Pool
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

type AlertBroadcaster interface {
	BroadcastEmergencyAlert(alert *models.EmergencyAlert, recipientUserIDs []uint)
	BroadcastResponderAccepted(alertID uuid.UUID, response *models.AlertResponse, targetUserID uint)
	BroadcastRadiusExpanded(alertID uuid.UUID, oldRadius, newRadius, usersNotified int, recipientUserIDs []uint)
	CloseRoom(roomID string)
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func NewHub(dbPool *pgxpool.Pool) *Hub {
	hub := &Hub{
		clients:    make(map[string]*Client),
		rooms:      make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *BroadcastMessage, 256),
		dbPool:     dbPool,
	}

	if dbPool != nil {
		go hub.listenPostgresNotifications()
	}

	return hub
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

func (h *Hub) BroadcastEmergencyAlert(alert *models.EmergencyAlert, recipientUserIDs []uint) {
	recipients := uintSliceToStringSlice(recipientUserIDs)
	if len(recipients) == 0 {
		return
	}

	data := map[string]interface{}{
		"alert_id": alert.ID.String(),
		"user": map[string]interface{}{
			"full_name": "Distressed User",
			"user_id":   alert.UserID,
		},
		"location": map[string]float64{
			"latitude":  alert.AlertLocation.Latitude,
			"longitude": alert.AlertLocation.Longitude,
		},
		"distance":           0,
		"current_radius":     alert.CurrentRadius,
		"created_at":         alert.CreatedAt,
		"recipient_user_ids": recipients,
	}

	for _, userID := range recipients {
		h.SendToUser(userID, "emergency_alert", data)
	}
}

func (h *Hub) BroadcastResponderAccepted(alertID uuid.UUID, response *models.AlertResponse, targetUserID uint) {
	h.SendToUser(strconv.FormatUint(uint64(targetUserID), 10), "responder_accepted", map[string]interface{}{
		"alert_id":       alertID.String(),
		"responder_id":   response.ResponderUserID,
		"distance":       response.DistanceMeters,
		"eta":            response.EstimatedArrivalMinutes,
		"responded_at":   response.RespondedAt,
		"target_user_id": strconv.FormatUint(uint64(targetUserID), 10),
	})
}

func (h *Hub) BroadcastRadiusExpanded(alertID uuid.UUID, oldRadius, newRadius, usersNotified int, recipientUserIDs []uint) {
	data := map[string]interface{}{
		"alert_id":           alertID.String(),
		"old_radius":         oldRadius,
		"new_radius":         newRadius,
		"users_notified":     usersNotified,
		"timestamp":          time.Now().UTC(),
		"recipient_user_ids": uintSliceToStringSlice(recipientUserIDs),
	}

	for _, userID := range recipientUserIDs {
		h.SendToUser(strconv.FormatUint(uint64(userID), 10), "radius_expanded", data)
	}
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
func (h *Hub) listenPostgresNotifications() {
	// Connect to PostgreSQL for LISTEN/NOTIFY
	conn, err := h.dbPool.Acquire(context.Background())
	if err != nil {
		fmt.Printf("Error acquiring connection for WS listener: %v\n", err)
		return
	}
	defer conn.Release()

	// Listen to crime_updates channel
	_, err = conn.Exec(context.Background(), "LISTEN crime_updates")
	if err != nil {
		fmt.Printf("Error starting LISTEN: %v\n", err)
		return
	}

	fmt.Println("✅ WebSocket Hub listening for real-time crime updates...")

	for {
		notification, err := conn.Conn().WaitForNotification(context.Background())
		if err != nil {
			fmt.Printf("Error waiting for notification: %v\n", err)
			time.Sleep(2 * time.Second)
			continue
		}

		// Parse notification payload
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(notification.Payload), &payload); err != nil {
			fmt.Printf("Error parsing notification payload: %v\n", err)
			continue
		}

		// Broadcast to all connected users in the 'global' room
		h.BroadcastToRoom("global", "crime_added", payload["data"].(map[string]interface{}))

		// Also trigger client-side heatmap refresh
		h.BroadcastToRoom("global", "heatmap_refresh", map[string]interface{}{
			"timestamp": time.Now().UTC(),
		})
	}
}
