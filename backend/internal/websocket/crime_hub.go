package websocket

import (
	"context"
	"log"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
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
