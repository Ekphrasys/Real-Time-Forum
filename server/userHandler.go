package server

import (
	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"encoding/json"
	"net/http"
	"sort"
	"time"
)

func AllUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	// check session
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Get current user ID from the session
	currentUserID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	users, err := database.GetAllUsers()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get users"})
		return
	}

	// Create a map to store the last message time for each user
	type userWithLastMessage struct {
		models.User
		LastMessageTime time.Time `json:"last_message_time,omitempty"`
	}

	results := make([]userWithLastMessage, len(users))

	// For each user, get the last message timestamp
	for i, user := range users {
		lastTime, _ := database.GetLastMessageTimestamp(currentUserID, user.Id)
		results[i] = userWithLastMessage{
			User:            user,
			LastMessageTime: lastTime,
		}
	}

	// Sort the results by last message time (descending) and then by username (ascending)
	sort.Slice(results, func(i, j int) bool {
		if !results[i].LastMessageTime.IsZero() && !results[j].LastMessageTime.IsZero() {
			return results[i].LastMessageTime.After(results[j].LastMessageTime)
		}
		if results[i].LastMessageTime.IsZero() && !results[j].LastMessageTime.IsZero() {
			return false
		}
		if !results[i].LastMessageTime.IsZero() && results[j].LastMessageTime.IsZero() {
			return true
		}
		return results[i].Username < results[j].Username
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func OnlineUsersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	// Récupérer les sessions actives depuis la base de données
	onlineUsers, err := database.GetOnlineUsers()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to get online users"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(onlineUsers)
}
