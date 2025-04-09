package database

import (
	"Real-Time-Forum/models"
	"fmt"
)

// RegisterUser registers a new user
func RegisterUser(user models.User) error {

	// Insert the user into the database
	_, err := DB.Exec(
		`INSERT INTO user (username, first_name, last_name, age, gender, email, password, creation_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		user.Username, user.FirstName, user.LastName, user.Age, user.Gender,
		user.Email, user.Password, user.CreationDate,
	)
	if err != nil {
		return fmt.Errorf("failed to insert user into database: %w", err)
	}

	fmt.Println("User registered:", user.Username)
	return nil
}
