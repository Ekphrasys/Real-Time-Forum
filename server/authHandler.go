package server

import (
	"encoding/json"
	"fmt"
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

	// Attempt to register the user in the database.
	err = database.RegisterUser(creds)
	if err != nil {
		// If registration fails, respond with an error 500
		http.Error(w, "Error during registration", http.StatusInternalServerError)
		return
	}

	// If registration is successful, respond with a 201 Created status
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "User successfully registered")
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
