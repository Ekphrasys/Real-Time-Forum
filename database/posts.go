package database

import (
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"database/sql"
	"fmt"
	"time"
)

// CreatePost inserts a new post into the database
func CreatePost(post models.Post) (*models.Post, error) {
	uuidObj := shared.GenerateUUID()
	post.Id = shared.ParseUUID(uuidObj) // Convert to string format
	post.CreationDate = time.Now()

	// Insert the post into the database
	result, err := DB.Exec(
		`INSERT INTO Post (post_id, title, content, category, user_id, creation_date) 
		VALUES (?, ?, ?, ?, ?, ?)`,
		post.Id, post.Title, post.Content, post.Category, post.UserId, post.CreationDate,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert post into database: %w", err)
	}

	_, _ = result.RowsAffected()

	return &post, nil
}

// GetAllPosts retrieves all posts from the database
func GetAllPosts(db *sql.DB) ([]models.Post, error) {

	query := `
	SELECT p.post_id, p.user_id, p.title, p.content, p.category, p.creation_date, u.username
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
		var username string
		err := rows.Scan(
			&post.Id,
			&post.UserId,
			&post.Title,
			&post.Content,
			&post.Category,
			&post.CreationDate,
			&username,
		)
		if err != nil {
			return nil, err
		}
		post.Username = username // Assign the username to the post
		posts = append(posts, post)
	}

	return posts, nil
}

// GetPostByID retrieves a certain post by its ID
func GetPostByID(db *sql.DB, id string) (*models.Post, error) {
	query := `
	SELECT p.post_id, p.title, p.content, p.user_id, p.category, p.creation_date, u.username
	FROM Post p
	JOIN User u ON p.user_id = u.user_id
	WHERE p.post_id = ?
	`

	row := db.QueryRow(query, id)

	var post models.Post
	var username string
	err := row.Scan(
		&post.Id,
		&post.Title,
		&post.Content,
		&post.UserId,
		&post.Category,
		&post.CreationDate,
		&username,
	)
	if err != nil {
		return nil, err
	}
	return &post, nil
}

// GetPostsByUser retrieves all posts by a specific user
func GetPostsByUser(db *sql.DB, userID string) ([]models.Post, error) {
	query := `
	SELECT p.post_id, p.title, p.content, p.user_id, p.category, p.creation_date
	FROM Post p
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

// GetPostWithComments retrieves a post and all its comments
func GetPostWithComments(postID string) (*models.PostWithComments, error) {
	var post models.Post
	var postUsername string

	postQuery := `
		SELECT p.post_id, p.title, p.content, p.user_id, p.category, p.creation_date, u.username
		FROM Post p
		JOIN User u ON p.user_id = u.user_id
		WHERE p.post_id = ?
	`

	err := DB.QueryRow(postQuery, postID).Scan(
		&post.Id,
		&post.Title,
		&post.Content,
		&post.UserId,
		&post.Category,
		&post.CreationDate,
		&postUsername,
	)

	if err != nil {
		return nil, err
	}

	post.Username = postUsername

	commentsQuery := `
		SELECT c.comment_id, c.content, c.user_id, c.creation_date, u.username
		FROM Comment c
		JOIN User u ON c.user_id = u.user_id
		WHERE c.post_id = ?
		ORDER BY c.creation_date ASC
	`

	rows, err := DB.Query(commentsQuery, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var comment models.Comment
		var commentUsername string
		err := rows.Scan(
			&comment.Id,
			&comment.Content,
			&comment.UserId,
			&comment.CreationDate,
			&commentUsername,
		)
		if err != nil {
			continue
		}
		comment.PostId = postID
		comment.Username = commentUsername // Assign the username to the comment
		comments = append(comments, comment)
	}
	result := &models.PostWithComments{
		Post:     post,
		Comments: comments,
	}
	return result, nil
}

// CreateComment adds a new comment to a post
func CreateComment(comment models.Comment) error {

	comment.Id = shared.ParseUUID(shared.GenerateUUID())
	comment.CreationDate = time.Now()

	result, err := DB.Exec(
		`INSERT INTO Comment (comment_id, post_id, user_id, content, creation_date) 
		 VALUES (?, ?, ?, ?, ?)`,
		comment.Id, comment.PostId, comment.UserId, comment.Content, comment.CreationDate,
	)

	if err != nil {
		return err
	}

	_, _ = result.RowsAffected()

	return nil
}
