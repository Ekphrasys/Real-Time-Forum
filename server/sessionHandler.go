package server

import (
	"Real-Time-Forum/database"
	"encoding/json"
	"net/http"
)

func CheckSessionHandler(w http.ResponseWriter, r *http.Request) {
	// Fetch the session ID from the cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Get the user ID from the database using the session ID
	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Get user details from database
	user, err := database.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// Respond with the user ID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
