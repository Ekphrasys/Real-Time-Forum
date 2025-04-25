package server

import (
	"Real-Time-Forum/database"
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// CreatePostHandler handles the creation of new posts
func CreatePostHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if the user is authenticated by checking the session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "Not authenticated", http.StatusUnauthorized)
		return
	}

	// Get the user ID from the database using the session cookie
	userID, err := database.GetUserIDFromSession(cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}

	// Parse the request body to get the post data
	var post models.Post
	err = json.NewDecoder(r.Body).Decode(&post)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if post.Title == "" || post.Content == "" {
		http.Error(w, "Title and content are required", http.StatusBadRequest)
		return
	}

	// Set the user ID for the post
	post.UserId = userID

	// Insert the post into the database
	err = database.CreatePost(post)
	if err != nil {
		http.Error(w, "Failed to create post in database", http.StatusInternalServerError)
		return
	}

	// Return the created post
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// PostsHandler handles both GET and POST requests for posts
func PostsHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow GET and POST methods
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Log for debugging
	fmt.Println("Posts handler called with method:", r.Method)

	// Process based on HTTP method
	if r.Method == http.MethodGet {
		// GET: Retrieve all posts
		fmt.Println("Fetching all posts...")

		posts, err := database.GetAllPosts(database.DB)
		if err != nil {
			fmt.Println("Error fetching posts:", err)
			// Send empty array instead of null
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]models.Post{}) // Return empty array
			return
		}

		// Handle empty results
		if posts == nil {
			posts = []models.Post{} // Ensure we return an empty array, not null
		}

		fmt.Printf("Found %d posts\n", len(posts))

		// Return posts as JSON
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)

	} else if r.Method == http.MethodPost {
		// POST: Create a new post
		fmt.Println("Creating new post...")

		// Check authentication
		cookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Not authenticated", http.StatusUnauthorized)
			return
		}

		// Get user ID from session
		userID, err := database.GetUserIDFromSession(cookie.Value)
		if err != nil {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}

		// Parse request body
		var post models.Post
		err = json.NewDecoder(r.Body).Decode(&post)
		if err != nil {
			fmt.Println("JSON parsing error:", err)
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate required fields
		if post.Title == "" || post.Content == "" {
			http.Error(w, "Title and content are required", http.StatusBadRequest)
			return
		}

		// Set post metadata
		post.UserId = userID
		post.Id = shared.ParseUUID(shared.GenerateUUID())
		post.CreationDate = time.Now()

		// Insert post into database
		err = database.CreatePost(post)
		if err != nil {
			fmt.Println("Database error:", err)
			http.Error(w, "Failed to create post", http.StatusInternalServerError)
			return
		}

		// Return created post
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(post)
	}
}

// Add to postsHandler.go
// GetPostWithCommentsHandler retrieves a post and all its comments
func GetPostWithCommentsHandler(w http.ResponseWriter, r *http.Request) {
	// Extract post ID from URL
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(postWithComments)
}

// CreateCommentHandler handles creation of new comments
func CreateCommentHandler(w http.ResponseWriter, r *http.Request) {
	// Check authentication
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

	// Parse the comment data
	var comment models.Comment
	err = json.NewDecoder(r.Body).Decode(&comment)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if comment.Content == "" || comment.PostId == "" {
		http.Error(w, "Content and post ID are required", http.StatusBadRequest)
		return
	}

	// Set the user ID
	comment.UserId = userID

	// Save the comment
	err = database.CreateComment(comment)
	if err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	// Return success
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}
