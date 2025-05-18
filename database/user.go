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
	// Check if username already exists
	var exists bool
	err := DB.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE username = ?)", user.Username).Scan(&exists)
	if err != nil {
		return fmt.Errorf("database error: %w", err)
	}
	if exists {
		return fmt.Errorf("username already exists")
	}

	// Check if email already exists
	err = DB.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE email = ?)", user.Email).Scan(&exists)
	if err != nil {
		return fmt.Errorf("database error: %w", err)
	}
	if exists {
		return fmt.Errorf("email already exists")
	}

	// Generate a UUID for the user
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
	return nil
}

func FindUsername(username string) (bool, error) {
	query := "SELECT username FROM User WHERE username=?"
	row := DB.QueryRow(query, username)
	var foundUsername string
	err := row.Scan(&foundUsername)

	if err != nil {
		if err == sql.ErrNoRows {
			return true, nil // No rows means username is available
		}
		return false, err
	}
	return false, nil // Username exists
}

func FindEmailUser(email string) (bool, error) {
	// Check if email exists
	query := "SELECT email FROM User WHERE email=?"
	row := DB.QueryRow(query, email)
	var foundEmail string
	err := row.Scan(&foundEmail)
	if err != nil {
		if err == sql.ErrNoRows {
			return true, nil // No rows means email is available
		}
		return false, err
	}
	return false, nil
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
			return nil, fmt.Errorf("Username/Mail not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Compare the provided password with the stored hashed password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return nil, fmt.Errorf("Invalid password")
	}

	// Clear the password before returning the user
	user.Password = ""
	return &user, nil
}

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
