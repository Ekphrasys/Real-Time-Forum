package database

import (
	"Real-Time-Forum/models"
	"fmt"
)

// GetUserByID retrieves a user by their ID
func GetUserByID(userID string) (*models.User, error) {
	var user models.User

	// Query the database for the user with the given ID
	err := DB.QueryRow(`
        SELECT user_id, username, email, first_name, last_name, age, gender, creation_date 
        FROM User 
        WHERE user_id = ?`,
		userID).Scan(
		&user.Id,
		&user.Username,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&user.Age,
		&user.Gender,
		&user.CreationDate,
	)

	if err != nil {
		fmt.Println("Error getting user:", err)
		return nil, err
	}

	// Don't return the password (security)
	user.Password = ""

	return &user, nil
}

// GetAllUsers retrieves all registered users from the database
func GetAllUsers() ([]models.User, error) {
	// Create a slice to hold the users
	var users []models.User

	// Query the database for all users
	rows, err := DB.Query(`
        SELECT user_id, username, email, first_name, last_name, age, gender, creation_date 
        FROM user 
        ORDER BY username ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	// Iterate through the result set
	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.Id,
			&user.Username,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.Age,
			&user.Gender,
			&user.CreationDate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, user)
	}

	// Check for errors from iterating over rows
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error after iterating rows: %w", err)
	}

	return users, nil
}

// Retrieves all users who are currently online
func GetOnlineUsers() ([]models.User, error) {
	var onlineUsers []models.User

	// Requête pour récupérer les utilisateurs avec des sessions actives
	rows, err := DB.Query(`
    SELECT DISTINCT u.user_id, u.username, u.email, u.first_name, u.last_name, u.age, u.gender, u.creation_date
    FROM user u
    INNER JOIN session s ON u.user_id = s.user_id
    WHERE s.expires_at > CURRENT_TIMESTAMP
    ORDER BY u.username ASC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query online users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var user models.User
		err := rows.Scan(
			&user.Id,
			&user.Username,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.Age,
			&user.Gender,
			&user.CreationDate,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		onlineUsers = append(onlineUsers, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error after iterating rows: %w", err)
	}

	return onlineUsers, nil
}

// retrieves all users ordered by the last message sent or received (sort like discord)
func GetUsersOrderedByLastMessage(currentUserID string) ([]map[string]interface{}, error) {
	// retrieves a list of users + last message infos
	// LEFT JOIN to include users even if no messages have been exchanged
	// Results are grouped by user ID and ordered by the most recent message timestamp (descending), then by username (ascending)
	query := `
        SELECT 
            u.user_id,
            u.username,
            u.email,
            u.first_name,
            u.last_name,
            u.age,
            u.gender,
            u.creation_date,
            COALESCE(m.content, '') AS last_message_content,
            COALESCE(m.sender_id, '') AS last_message_sender,
            COALESCE(strftime('%Y-%m-%d %H:%M:%S', m.sent_at), '') AS last_message_time
        FROM user u
        LEFT JOIN (
            SELECT 
                CASE 
                    WHEN sender_id = ? THEN receiver_id
                    ELSE sender_id
                END AS other_user_id,
                content,
                sender_id,
                sent_at
            FROM messages
            WHERE sender_id = ? OR receiver_id = ?
            ORDER BY sent_at DESC
        ) m ON u.user_id = m.other_user_id
        WHERE u.user_id != ?
        GROUP BY u.user_id
        ORDER BY MAX(m.sent_at) DESC, u.username ASC
    `

	rows, err := DB.Query(query, currentUserID, currentUserID, currentUserID, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var users []map[string]interface{}

	for rows.Next() {
		var userID, username, email, firstName, lastName, gender, creationDate string
		var age int
		var lastMessageContent, lastMessageSender, lastMessageTime string

		err := rows.Scan(
			&userID,
			&username,
			&email,
			&firstName,
			&lastName,
			&age,
			&gender,
			&creationDate,
			&lastMessageContent,
			&lastMessageSender,
			&lastMessageTime,
		)
		if err != nil {
			return nil, fmt.Errorf("Scan failed: %w", err)
		}

		users = append(users, map[string]interface{}{
			"user_id":             userID,
			"username":            username,
			"email":               email,
			"first_name":          firstName,
			"last_name":           lastName,
			"age":                 age,
			"gender":              gender,
			"creation_date":       creationDate,
			"last_message":        lastMessageContent,
			"last_message_sender": lastMessageSender,
			"last_message_time":   lastMessageTime,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error after iterating rows: %w", err)
	}

	return users, nil
}
