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
