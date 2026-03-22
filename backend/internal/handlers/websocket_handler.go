package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	customWS "github.com/obsidiannnn/Safe-Around/backend/internal/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Configure properly in production
	},
}

func HandleWebSocket(hub *customWS.CrimeHub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("Upgrade error:", err)
			return
		}

		hub.Register(conn)

		// Send welcome message
		welcome := map[string]interface{}{
			"event":   "connected",
			"message": "Connected to SafeAround real-time updates",
		}
		data, _ := json.Marshal(welcome)
		conn.WriteMessage(websocket.TextMessage, data)

		// Read loop (keep connection alive)
		go func() {
			defer func() {
				hub.Unregister(conn)
			}()

			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					break
				}
			}
		}()
	}
}
