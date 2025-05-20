package server

import (
	"net/http"
)

// SetupRoutes defines all the application routes
func SetupRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/register", registerHandler)
	mux.HandleFunc("/login", LoginHandler)
	mux.HandleFunc("/logout", LogoutHandler)
	mux.HandleFunc("/ws", HandleWebsocket)
	mux.HandleFunc("/check-session", CheckSessionHandler)
	mux.HandleFunc("/messages", MessagesHandler)
	mux.HandleFunc("/users", AllUsersHandler)
	mux.HandleFunc("/online-users", OnlineUsersHandler)
	mux.HandleFunc("/last-message", LastMessageHandler)
	// hub := shared.NewHub()

	mux.HandleFunc("/posts", PostsHandler)
	mux.HandleFunc("/create-post", CreatePostHandler)
	mux.HandleFunc("/post/", GetPostWithCommentsHandler)
	mux.HandleFunc("/comment", CreateCommentHandler)

	// Adds a route to check if the server is running
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Server is online!"))
	})
}
