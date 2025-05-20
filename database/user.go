package database

import (
	"Real-Time-Forum/models"
	"fmt"
)

// GetUserByID retrieves a user by their ID
func GetUserByID(userID string) (*models.User, error) {
	var user models.User

	// Debug output
	fmt.Println("Getting user with ID:", userID)

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

	// Don't return the password
	user.Password = ""

	fmt.Printf("Found user: %+v\n", user)
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

// user.go
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

	// Parcourir les résultats
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
