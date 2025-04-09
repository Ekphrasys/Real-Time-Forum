package database

import (
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// RegisterUser registers a new user
func RegisterUser(user models.User) error {
	uuidObj := shared.GenerateUUID()
	user.Id = shared.ParseUUID(uuidObj) // Convert to string format

	// Set the creation date to current time
	user.CreationDate = time.Now()

	// Hash the password before storing it
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Insert the user into the database
	_, err = DB.Exec(
		`INSERT INTO user (user_id, username, first_name, last_name, age, gender, email, password, creation_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.Id, user.Username, user.FirstName, user.LastName, user.Age, user.Gender,
		user.Email, string(hashedPassword), user.CreationDate,
	)
	if err != nil {
		fmt.Printf("Database error details: %v\n", err) // Add this line
		return fmt.Errorf("failed to insert user into database: %w", err)
	}

	fmt.Printf("User registered with UUID: %s\n", user.Id)
	fmt.Println("User registered:", user.Username)
	return nil
}
