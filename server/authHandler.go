package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
)

// registerHandler handles user registration requests
func registerHandler(w http.ResponseWriter, r *http.Request) {
	var creds models.User

	// Decode the JSON request body into the creds variable
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		// If decoding fails, respond with an error 400
		http.Error(w, "Invalid data", http.StatusBadRequest)
		return
	}

	IsUnique, _ := database.FindEmailUser(creds.Email)
	if !IsUnique {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Email already in use"})
		return
	}

	IsUniqueUsername, _ := database.FindUsername(creds.Username)
	if !IsUniqueUsername {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Username already in use"})
		return
	}

	// Attempt to register the user in the database.
	err = database.RegisterUser(creds)
	if err != nil {
		// If registration fails, respond with an error 500
		http.Error(w, "Error during registration", http.StatusInternalServerError)
		return
	}

	// If registration is successful, respond with a 201 Created status
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User successfully registered",
	})

}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the request body into a User struct (we only need identifier and password)
	var loginData struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&loginData)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if loginData.Identifier == "" || loginData.Password == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Email/username and password are required",
		})
		fmt.Println("Email/username and password are required")
		return
	}

	// Authenticate the user
	user, err := database.LoginUser(loginData.Identifier, loginData.Password)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": err.Error(),
		})
		return
	}

	// Generate a session ID
	sessionID := shared.ParseUUID(shared.GenerateUUID())

	// Define session duration
	sessionDuration := 1 * time.Hour

	// Save the session in the database
	err = database.SaveSession(sessionID, user.Id, sessionDuration)
	if err != nil {
		http.Error(w, "Error creating session", http.StatusInternalServerError)
		fmt.Println("Error creating session:", err)
		return
	}

	// Set the session ID in a cookie
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   int(sessionDuration.Seconds()), // Same duration as session
	}
	http.SetCookie(w, cookie)

	// Respond with user data (excluding password)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Fetch the session ID from the cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}
	// Delete the session from the database
	err = database.DeleteSession(cookie.Value)
	if err != nil {
		http.Error(w, "Error deleting session", http.StatusInternalServerError)
		fmt.Println("Error deleting session:", err)
		return
	}
	// Remove the session ID cookie from the user's browser
	cookie.MaxAge = -1 // Set MaxAge to -1 to delete the cookie
	cookie.Value = ""
	http.SetCookie(w, cookie)
	// Respond with a success message
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
}
