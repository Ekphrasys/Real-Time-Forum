package server

import (
	"encoding/json"
	"net/http"

	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(creds)
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
		http.Error(w, "Email/username and password are required", http.StatusBadRequest)
		return
	}

	// Authenticate the user
	user, err := database.LoginUser(loginData.Identifier, loginData.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// Return the user data (without password)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
