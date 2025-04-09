package server

import (
	"encoding/json"
	"fmt"
	"net/http"

	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
)

func registerHandler(w http.ResponseWriter, r *http.Request) {
	var creds models.User
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		http.Error(w, "Invalid data", http.StatusBadRequest)
		return
	}

	err = database.RegisterUser(creds)
	if err != nil {
		http.Error(w, "Error during registration", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	fmt.Fprintln(w, "User successfully registered")
}

// func registerHandler(w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodPost {
// 		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
// 		return
// 	}

// 	// Lire et traiter le corps de la requête
// 	var requestData map[string]interface{}
// 	err := json.NewDecoder(r.Body).Decode(&requestData)
// 	if err != nil {
// 		http.Error(w, "Invalid JSON", http.StatusBadRequest)
// 		return
// 	}

// 	// Réponse de confirmation
// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
// }
