package database

import (
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"database/sql"
	"fmt"
	"log"
	"time"
)

// CreatePost inserts a new post into the database
func CreatePost(post models.Post) error {
	uuidObj := shared.GenerateUUID()
	post.Id = shared.ParseUUID(uuidObj) // Convert to string format
	post.CreationDate = time.Now()

	// Insert the user into the database
	_, err := DB.Exec(
		`INSERT INTO Post (post_id, title, content, category, user_id, creation_date) 
        VALUES (?, ?, ?, ?, ?, ?)`,
		post.Id, post.Title, post.Content, post.Category, post.UserId, post.CreationDate,
	)
	if err != nil {
		return fmt.Errorf("failed to insert post into database: %w", err)
	}

	fmt.Printf("Post created with UUID: %s\n", post.Id)
	fmt.Println("Post created:", post.Title)
	return nil
}

// GetAllPosts retrieves all posts from the database
func GetAllPosts(db *sql.DB) ([]models.Post, error) {
	log.Println("Fetching posts from database...")
	query := `
    SELECT p.post_id, p.user_id, u.username, p.title, p.content, p.category, p.creation_date
    FROM Post p
    JOIN User u ON p.user_id = u.user_id
    ORDER BY p.creation_date DESC
    `
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		err := rows.Scan(
			&post.Id,
			&post.UserId,
			&post.Username,
			&post.Title,
			&post.Content,
			&post.Category,
			&post.CreationDate,
		)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	return posts, nil
}

// GetPostByID retrieves a post by its ID
func GetPostByID(db *sql.DB, id string) (*models.Post, error) {
	query := `
	SELECT id, title, content, user_id, creation_date
	FROM posts
	WHERE id = ?
	`
	row := db.QueryRow(query, id)

	var post models.Post
	err := row.Scan(
		&post.Id,
		&post.Title,
		&post.Content,
		&post.UserId,
		&post.CreationDate,
	)
	if err != nil {
		return nil, err
	}

	return &post, nil
}

// GetPostsByUser retrieves all posts by a specific user
func GetPostsByUser(db *sql.DB, userID string) ([]models.Post, error) {
	query := `
	SELECT id, title, content, user_id, creation_date
	FROM posts
	WHERE user_id = ?
	ORDER BY creation_date DESC
	`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		err := rows.Scan(
			&post.Id,
			&post.Title,
			&post.Content,
			&post.UserId,
			&post.CreationDate,
		)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	return posts, nil
}

// GetPostWithComments retrieves a post and all its comments
func GetPostWithComments(postID string) (*models.PostWithComments, error) {
	// Get the post first
	var post models.Post
	err := DB.QueryRow(`
        SELECT p.post_id, p.title, p.content, p.category, p.user_id, u.username, p.creation_date
        FROM Post p
        JOIN User u ON p.user_id = u.user_id
        WHERE p.post_id = ?
    `, postID).Scan(
		&post.Id,
		&post.Title,
		&post.Content,
		&post.Category,
		&post.UserId,
		&post.Username,
		&post.CreationDate,
	)

	if err != nil {
		return nil, err
	}

	// Get all comments for this post
	rows, err := DB.Query(`
        SELECT c.comment_id, c.content, c.user_id, u.username, c.creation_date
        FROM Comment c
        JOIN User u ON c.user_id = u.user_id
        WHERE c.post_id = ?
        ORDER BY c.creation_date ASC
    `, postID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var comment models.Comment
		err := rows.Scan(
			&comment.Id,
			&comment.Content,
			&comment.UserId,
			&comment.Username,
			&comment.CreationDate,
		)
		if err != nil {
			continue
		}
		comment.PostId = postID
		comments = append(comments, comment)
	}

	return &models.PostWithComments{
		Post:     post,
		Comments: comments,
	}, nil
}

// CreateComment adds a new comment to a post
func CreateComment(comment models.Comment) error {
	comment.Id = shared.ParseUUID(shared.GenerateUUID())
	comment.CreationDate = time.Now()

	_, err := DB.Exec(
		`INSERT INTO Comment (comment_id, post_id, user_id, content, creation_date) 
         VALUES (?, ?, ?, ?, ?)`,
		comment.Id, comment.PostId, comment.UserId, comment.Content, comment.CreationDate,
	)
	return err
}
