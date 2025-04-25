package server

import (
	"Real-Time-Forum/database"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// Define message types
const (
	UserStatusUpdate = "user_status"
	PrivateMessage   = "private_message"
)

// Upgrader to handle WebSocket connections
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Authorize all origins in development
	},
}

// HandleWebsocket handles WebSocket connections
func HandleWebsocket(w http.ResponseWriter, r *http.Request) {
	// Check authentification with cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authentified", http.StatusUnauthorized)
		return
	}

	// Get the user ID from the database using the session ID
	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Upgrade the connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	log.Printf("New Websocket connexion from user %s", userID)

	// AddClient(conn, userID)

	// Clean up the connection when done
	// defer func() {
	// 	conn.Close()
	// 	clientsMutex.Lock()
	// 	delete(clients, userID)
	// 	clientsMutex.Unlock()
	// 	log.Printf("Websocket Connexion closed for user %s", userID)
	// }()

	// Main loop to read messages from the WebSocket
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Reading error: %v", err)
			break
		}
		log.Printf("Message received by %s: %s", userID, string(message))
	}
}
