package server

import (
	"Real-Time-Forum/shared"
	"net/http"
)

// SetupRoutes defines all the application routes
func SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/register", registerHandler)
	mux.HandleFunc("/login", LoginHandler)
	mux.HandleFunc("/logout", LogoutHandler)
	mux.HandleFunc("/ws", HandleWebsocket)
	hub := shared.NewHub()
	// mux.HandleFunc("/ws", HandleWebsocket)

	// Adds a route to check if the server is running
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Server is online!"))
	})
}
