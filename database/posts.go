package database

import (
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"database/sql"
	"fmt"
)

// CreatePost inserts a new post into the database
func CreatePost(post models.Post) error {
	uuidObj := shared.GenerateUUID()
	post.Id = shared.ParseUUID(uuidObj) // Convert to string format

	// Insert the user into the database
	_, err := DB.Exec(
		`INSERT INTO posts (id, title, content, user_id, creation_date) 
        VALUES (?, ?, ?, ?, ?)`,
		post.Id, post.Title, post.Content, post.UserId, post.CreationDate,
	)
	if err != nil {
		return fmt.Errorf("failed to insert post into database: %w", err)
	}

	fmt.Printf("Post created with UUID: %s\n", post.Id)
	fmt.Println("Post created:", post.Title)
	return nil
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

// GetAllPosts retrieves all posts from the database
func GetAllPosts(db *sql.DB) ([]models.Post, error) {
	query := `
	SELECT id, title, content, user_id, creation_date
	FROM posts
	ORDER BY creation_date DESC
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
