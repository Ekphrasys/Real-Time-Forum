package shared

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	clients map[*websocket.Conn]string
	mu      sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*websocket.Conn]string),
	}
}

// Add client to the hub
func (h *Hub) AddClient(conn *websocket.Conn, username string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[conn] = username
}

// Remove client from the hub
func (h *Hub) RemoveClient(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, conn)
}

func (h *Hub) Broadcast() {
	h.mu.Lock()
	defer h.mu.Unlock()

	var onlineUsers []string

	for _, username := range h.clients {
		onlineUsers = append(onlineUsers, username)
	}

	message, err := json.Marshal(onlineUsers)
	if err != nil {
		return
	}

	for conn := range h.clients {
		if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
			conn.Close()
			delete(h.clients, conn)
		}
	}
}
