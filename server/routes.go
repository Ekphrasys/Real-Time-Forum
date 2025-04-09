package server

import (
	"net/http"
)

// SetupRoutes defines all the application routes
func SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/register", registerHandler)

	// Adds a route to check if the server is running
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Server is online!"))
	})
}
