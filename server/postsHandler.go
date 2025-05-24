package server

import (
	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"encoding/json"
	"net/http"

	"github.com/gorilla/websocket"
)

// CreatePostHandler handles the creation of new posts
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	var post models.Post
	err = json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if post.Title == "" || post.Content == "" {
		http.Error(w, "Title and content are required", http.StatusBadRequest)
		return
	}

	post.UserId = userID

	createdPost, err := database.CreatePost(post)
	if err != nil {
		http.Error(w, "Failed to create post in database", http.StatusInternalServerError)
		return
	}

	broadcastNewPost(*createdPost)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdPost)
}

// PostsHandler handles both GET and POST requests for posts
func PostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.Method == http.MethodGet {
		posts, err := database.GetAllPosts(database.DB)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]models.Post{})
			return
		}
		if posts == nil {
			posts = []models.Post{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)
	} else if r.Method == http.MethodPost {
		cookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Not authenticated", http.StatusUnauthorized)
			return
		}

		userID, err := database.GetUserIDFromSession(cookie.Value)
		if err != nil {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}

		var post models.Post
		err = json.NewDecoder(r.Body).Decode(&post)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if post.Title == "" || post.Content == "" {
			http.Error(w, "Title and content are required", http.StatusBadRequest)
			return
		}

		post.UserId = userID

		createdPost, err := database.CreatePost(post)
		if err != nil {
			http.Error(w, "Failed to create post", http.StatusInternalServerError)
			return
		}

		broadcastNewPost(*createdPost)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(createdPost)
	}
}

// GetPostWithCommentsHandler retrieves a post and all its comments
func GetPostWithCommentsHandler(w http.ResponseWriter, r *http.Request) {
	postID := r.URL.Path[len("/post/"):]
	if postID == "" {
		http.Error(w, "Post ID is required", http.StatusBadRequest)
		return
	}

	postWithComments, err := database.GetPostWithComments(postID)
	if err != nil {
		http.Error(w, "Failed to retrieve post", http.StatusInternalServerError)
		return
	}

	if postWithComments == nil {
		http.Error(w, "Post not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(postWithComments)
}

// CreateCommentHandler handles creation of new comments
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	var comment models.Comment
	err = json.NewDecoder(r.Body).Decode(&comment)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if comment.Content == "" || comment.PostId == "" {
		http.Error(w, "Content and post ID are required", http.StatusBadRequest)
		return
	}

	comment.UserId = userID

	err = database.CreateComment(comment)
	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// broadcastNewPost broadcasts a new post to all connected WebSocket clients
func broadcastNewPost(post models.Post) {
	message := map[string]interface{}{
		"type": NewPost,
		"post": post,
	}

	messageJSON, err := json.Marshal(message)
	if err != nil {
		return
	}

	connectionsLock.Lock()
	defer connectionsLock.Unlock()

	for _, conn := range connections {
		_ = conn.Conn.WriteMessage(websocket.TextMessage, messageJSON)
	}
}
