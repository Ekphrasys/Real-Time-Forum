package server

import (
	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Handle incoming private messages
func handlePrivateMessage(conn *websocket.Conn, userID string, rawMessage []byte) {
	var msg models.Message
	if err := json.Unmarshal(rawMessage, &msg); err != nil {
		log.Printf("Error unmarshaling private message: %v", err)
		return
	}

	// Validate the message
	if msg.ReceiverID == "" || msg.Content == "" {
		log.Println("Invalid private message format")
		return
	}

	// Save to database
	err := database.SavePrivateMessage(userID, msg.ReceiverID, msg.Content)
	if err != nil {
		log.Printf("Error saving private message: %v", err)
		return
	}

	// Broadcast to the recipient if online
	connectionsLock.Lock()
	defer connectionsLock.Unlock()

	for _, c := range connections {
		if c.UserID == msg.ReceiverID {
			// Prepare the message to send
			response := map[string]interface{}{
				"type":      PrivateMessage,
				"sender_id": userID,
				"content":   msg.Content,
				"sent_at":   time.Now().UnixNano() / int64(time.Millisecond),
			}

			responseJSON, _ := json.Marshal(response)
			if err := c.Conn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
				log.Printf("Error sending private message: %v", err)
			}
			break
		}
	}
}

func MessagesHandler(w http.ResponseWriter, r *http.Request) {
	// Initialiser la réponse JSON
	w.Header().Set("Content-Type", "application/json")

	// Vérifier l'authentification
	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Récupérer l'ID de l'utilisateur
	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	// Récupérer l'ID du correspondant
	counterpartID := r.URL.Query().Get("user_id")
	if counterpartID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing user_id parameter"})
		return
	}

	// Récupérer l'historique des messages
	messages, err := database.GetPrivateMessages(userID, counterpartID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get messages: " + err.Error()})
		return
	}

	// Renvoyer la réponse
	if err := json.NewEncoder(w).Encode(messages); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
	}
}
