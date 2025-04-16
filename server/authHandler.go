package server

import (
	"encoding/json"
	"net/http"
	"sync"

	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
)

var sessions = make(map[string]string) // sessionID -> userID
var sessionsMutex sync.RWMutex

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

	// If authentication is successful, set the session cookie
	sessionID := shared.ParseUUID(shared.GenerateUUID())
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		HttpOnly: true,
		Path:     "/",
		MaxAge:   3600 * 1, // 1 hour
	}
	http.SetCookie(w, cookie)
	// Store the session ID in a global map
	sessionsMutex.Lock()
	sessions[sessionID] = user.Id
	sessionsMutex.Unlock()
	// Return the user data (without password)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Fetch the session ID from the cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not logged in"})
		return
	}

	// Delete the session from the global map
	sessionsMutex.Lock()
	delete(sessions, cookie.Value)
	sessionsMutex.Unlock()

	// Set the cookie to expire immediately
	expiredCookie := &http.Cookie{
		Name:     "session_id",
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1, // -1 = supprimer immédiatement
	}
	http.SetCookie(w, expiredCookie)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Logged out successfully"})
}
