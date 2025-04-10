package database

import (
	"Real-Time-Forum/models"
	"Real-Time-Forum/shared"
	"database/sql"
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
		return fmt.Errorf("failed to insert user into database: %w", err)
	}

	fmt.Printf("User registered with UUID: %s\n", user.Id)
	fmt.Println("User registered:", user.Username)
	return nil
}

// LoginUser authenticates a user and returns the user if successful
func LoginUser(identifier, password string) (*models.User, error) {
	var user models.User

	// Retrieve the user's data from the database
	err := DB.QueryRow(
		`SELECT user_id, username, email, password FROM user 
         WHERE email = ? OR username = ?`,
		identifier, identifier,
	).Scan(&user.Id, &user.Username, &user.Email, &user.Password)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Compare the provided password with the stored hashed password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, fmt.Errorf("invalid password")
	}

	// Clear the password before returning the user
	user.Password = ""
	return &user, nil
}
