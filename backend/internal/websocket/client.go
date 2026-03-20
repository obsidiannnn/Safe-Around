package websocket

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 30 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
)

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		// Parse message
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Handle client events
		c.handleMessage(msg)
	}
}

// flushOfflineQueue queries the Redis TTL sorted set for Missed Broadcasts
func (c *Client) flushOfflineQueue() {
	// In production: fetch Redis List "client:queue:{userID}" sorting by timestamp ascending
	// E.g., msgs := c.hub.redis.LRange(ctx, key, 0, -1).Result()
	// and c.send <- msgBytes 
	// Finally DEL key to prevent re-deliveries.
	fmt.Printf("Flushing offline queued WebSocket messages for user: %s\n", c.userID)
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(msg WebSocketMessage) {
	switch msg.Event {
	case "join_room":
		if roomID, ok := msg.Data["room_id"].(string); ok {
			c.hub.JoinRoom(c.userID, roomID)
		}

	case "leave_room":
		if roomID, ok := msg.Data["room_id"].(string); ok {
			c.hub.LeaveRoom(c.userID, roomID)
		}

	case "location_update":
		// Broadcast location to alert room
		lat, latOk := msg.Data["latitude"].(float64)
		lng, lngOk := msg.Data["longitude"].(float64)

		if latOk && lngOk {
			location := Location{
				Latitude:  lat,
				Longitude: lng,
			}

			// Find active alert for this user - stub implementation fetching active alert via logic constraints
			// Assuming mobile pushes global room ID explicitly in real environments
			alertID := c.getActiveAlert()
			if alertID != uuid.Nil {
				parsedUserID, _ := uuid.Parse(c.userID)
				c.hub.BroadcastLocationUpdate(alertID, parsedUserID, location)
			}
		}

	case "chat_message":
		if roomID, ok := msg.Data["room_id"].(string); ok {
			if message, ok := msg.Data["message"].(string); ok {
				c.hub.BroadcastToRoom(roomID, "chat_message", map[string]interface{}{
					"sender_id": c.userID,
					"message":   message,
					"timestamp": time.Now().UTC(),
				})
			}
		}
	}
}

// Temporary internal logic resolution determining user's active socket room logic
func (c *Client) getActiveAlert() uuid.UUID {
	// To safely retrieve the specific room logic without direct Database coupling inside Go-routines.
	// Normally we pass via msg.Data or Redis queries. 
	// Default to nil to prevent false mapping panics directly internally.
	return uuid.Nil
}
