package server

import (
	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
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
	w.Header().Set("Content-Type", "application/json")

	// Vérification de l'authentification
	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid session"})
		return
	}

	counterpartID := r.URL.Query().Get("user_id")
	if counterpartID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing user_id parameter"})
		return
	}

	// Récupération des paramètres de pagination
	page := 1
	limit := 10

	if p := r.URL.Query().Get("page"); p != "" {
		if pInt, err := strconv.Atoi(p); err == nil && pInt > 0 {
			page = pInt
		}
	}

	if l := r.URL.Query().Get("limit"); l != "" {
		if lInt, err := strconv.Atoi(l); err == nil && lInt > 0 {
			limit = lInt
			if limit > 100 {
				limit = 100
			}
		}
	}
	log.Printf("Paramètres FINALS - page: %d, limit: %d", page, limit)

	// Appel à la fonction de base de données avec pagination
	messages, err := database.GetPrivateMessages(userID, counterpartID, page, limit)
	if err != nil {
		log.Printf("Erreur DB: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Database error"})
		return
	}

	if len(messages) == 0 {
		log.Printf("Aucun message trouvé pour %s et %s", userID, counterpartID)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]interface{}{}) // Retourne un tableau vide au lieu de null
		return
	}

	if err := json.NewEncoder(w).Encode(messages); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to encode response"})
	}
}
