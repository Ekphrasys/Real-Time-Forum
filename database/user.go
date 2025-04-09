package database

import (
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"fmt"
	"time"
)

// RegisterUser registers a new user
func RegisterUser(user models.User) error {
	uuidObj := shared.GenerateUUID()
	user.Id = shared.ParseUUID(uuidObj) // Convert to string format

	// Set the creation date to current time
	user.CreationDate = time.Now()

	// Insert the user into the database
	_, err := DB.Exec(
		`INSERT INTO user (user_id, username, first_name, last_name, age, gender, email, password, creation_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.Id, user.Username, user.FirstName, user.LastName, user.Age, user.Gender,
		user.Email, user.Password, user.CreationDate,
	)
	if err != nil {
		fmt.Printf("Database error details: %v\n", err) // Add this line
		return fmt.Errorf("failed to insert user into database: %w", err)
	}

	fmt.Printf("User registered with UUID: %s\n", user.Id)
	fmt.Println("User registered:", user.Username)
	return nil
}
