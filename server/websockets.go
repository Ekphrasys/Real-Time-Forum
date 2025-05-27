package server

import (
	"Real-Time-Forum/database"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Define message types
const (
	UserStatusUpdate = "user_status"
	PrivateMessage   = "private_message"
	Identify         = "identify"
	GetOnlineUsers   = "get_online_users"
	OnlineUsersList  = "online_users"
	TypingStart      = "typing_start"
	TypingStop       = "typing_stop"
	NewPost          = "new_post"
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

	// Set this user's status to online
	database.UpdateSessionStatus(cookie.Value, "online")

	// Get user details for broadcasting
	user, err := database.GetUserByID(userID)
	if err != nil {
		log.Println("Error getting user details:", err)
	}

	// Upgrade the connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	log.Printf("New Websocket connexion from user %s", userID)

	// Add connection to a slice (instead of map)
	activeConn := Connection{
		UserID: userID,
		Conn:   conn,
	}

	// Add to connections slice with mutex
	// Avant d'ajouter une nouvelle connexion
	connectionsLock.Lock()
	// Supprime les connexions existantes pour cet utilisateur
	filtered := connections[:0]
	for _, c := range connections {
		if c.UserID != userID {
			filtered = append(filtered, c)
		}
	}
	connections = filtered
	// Ajoute la nouvelle connexion
	connections = append(connections, activeConn)
	connectionsLock.Unlock()

	// Broadcast to all clients that this user is online
	broadcastUserStatus(userID, user.Username, "online")

	// Send current online users list to the new client
	sendOnlineUsersList(conn)

	// Set up cleanup on disconnect
	defer func() {
		conn.Close()

		// Remove from connections slice
		connectionsLock.Lock()
		for i, c := range connections {
			if c.UserID == userID {
				// Remove by replacing with last element and truncating
				connections[i] = connections[len(connections)-1]
				connections = connections[:len(connections)-1]
				break
			}
		}
		connectionsLock.Unlock()

		// Update status in database
		database.UpdateSessionStatus(cookie.Value, "offline")

		// Broadcast offline status
		broadcastUserStatus(userID, user.Username, "offline")

		log.Printf("WebSocket connection closed for user %s", userID)
	}()

	// Main message loop
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Reading error: %v", err)
			break
		}

		// Determine message type
		var msgType struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(message, &msgType); err != nil {
			log.Printf("Error decoding message type: %v", err)
			continue
		}

		switch msgType.Type {
		case PrivateMessage:
			handlePrivateMessage(conn, userID, message)
		case Identify:
			// Just log for now, no action needed
			log.Printf("User identified: %s", userID)
		case UserStatusUpdate:
			// Broadcast the new connection status
			broadcastUserStatus(userID, user.Username, "online")
		case GetOnlineUsers:
			// Send online users list to requester
			sendOnlineUsersList(conn)
		case TypingStart:
			// Handle typing start event
			handleTypingNotification(userID, message, true)
		case TypingStop:
			// Handle typing stop event
			handleTypingNotification(userID, message, false)

		default:
			log.Printf("Unknown message type: %s", msgType.Type)
		}
	}
}

// Define a Connection struct
type Connection struct {
	UserID string
	Conn   *websocket.Conn
}

// Create a slice to store connections instead of a map
var connections []Connection
var connectionsLock sync.Mutex

// Send all online users to a specific client
func sendOnlineUsersList(conn *websocket.Conn) {
	onlineUsers, err := database.GetOnlineUsers()
	if err != nil {
		log.Println("Error fetching online users:", err)
		return
	}

	// Create a message with all online users
	message := map[string]interface{}{
		"type":  OnlineUsersList,
		"users": onlineUsers,
	}

	// Send the message
	messageJSON, _ := json.Marshal(message)
	conn.WriteMessage(websocket.TextMessage, messageJSON)
}

// Broadcast user status change to all connected clients
func broadcastUserStatus(userID, username, status string) {
	message := map[string]interface{}{
		"type":      "user_status",
		"user_id":   userID,
		"username":  username,
		"status":    status,
		"timestamp": time.Now().UnixNano() / int64(time.Millisecond),
	}

	messageJSON, _ := json.Marshal(message)

	// Send to all connections
	connectionsLock.Lock()
	for _, conn := range connections {
		// Skip sending to the user who changed status
		if conn.UserID != userID {
			conn.Conn.WriteMessage(websocket.TextMessage, messageJSON)
		}
	}
	connectionsLock.Unlock()
}

func handleTypingNotification(senderID string, rawMessage []byte, isTyping bool) {
	var msg struct {
		ReceiverID string `json:"receiver_id"`
	}
	if err := json.Unmarshal(rawMessage, &msg); err != nil {
		log.Printf("Error decoding typing notification: %v", err)
		return
	}

	// Retrieve sender info from the database
	sender, err := database.GetUserByID(senderID)
	if err != nil {
		log.Printf("Error getting sender info: %v", err)
		return
	}

	connectionsLock.Lock()
	defer connectionsLock.Unlock()

	// Find the connection for the receiver to send the typing notification
	for _, c := range connections {
		if c.UserID == msg.ReceiverID {
			status := TypingStop
			if isTyping {
				status = TypingStart
			}

			notification := map[string]interface{}{
				"type":            status,
				"sender_id":       senderID,
				"sender_username": sender.Username,
			}

			messageJSON, err := json.Marshal(notification)
			if err != nil {
				log.Printf("Error marshaling typing notification: %v", err)
				return
			}

			err = c.Conn.WriteMessage(websocket.TextMessage, messageJSON)
			if err != nil {
				log.Printf("Error sending typing notification: %v", err)
			}
			break
		}
	}
}
