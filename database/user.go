package database

import (
	"Real-Time-Forum/models"
	"fmt"
	"log"
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

func GetUsersOrderedByLastMessage(currentUserID string) ([]map[string]interface{}, error) {
	// Utilisons un format de log plus visible
	log.Printf("--- Démarrage GetUsersOrderedByLastMessage pour l'utilisateur: %s ---", currentUserID)

	// Requête corrigée
	query := `
		WITH LastMessageInfo AS (
			SELECT 
				CASE 
					WHEN sender_id = ? THEN receiver_id
					WHEN receiver_id = ? THEN sender_id
				END AS other_user_id,
				content,
				sender_id,
				sent_at
			FROM messages 
			WHERE sender_id = ? OR receiver_id = ?
		),
		RankedMessages AS (
			SELECT 
				other_user_id,
				content,
				sender_id,
				sent_at,
				ROW_NUMBER() OVER (PARTITION BY other_user_id ORDER BY sent_at DESC) AS rn
			FROM LastMessageInfo
			WHERE other_user_id IS NOT NULL
		)
		SELECT 
			u.user_id,
			u.username,
			u.email,
			u.first_name,
			u.last_name,
			u.age,
			u.gender,
			u.creation_date,
			COALESCE(rm.content, '') AS last_message_content,
			COALESCE(rm.sender_id, '') AS last_message_sender,
			COALESCE(strftime('%Y-%m-%d %H:%M:%S', rm.sent_at), '') AS sort_time
		FROM 
			user u
		LEFT JOIN 
			RankedMessages rm ON u.user_id = rm.other_user_id AND rm.rn = 1
		WHERE 
			u.user_id != ?
		ORDER BY
			CASE WHEN rm.sent_at IS NULL THEN 1 ELSE 0 END,
			rm.sent_at DESC,
			u.username ASC`

	// Débogage de la requête
	log.Println("Exécution de la requête...")

	rows, err := DB.Query(query, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID)
	if err != nil {
		log.Printf("ERREUR de requête: %v", err)
		return nil, fmt.Errorf("échec de la requête pour les utilisateurs triés par dernier message: %w", err)
	}
	defer rows.Close()

	var users []map[string]interface{}
	userCount := 0

	for rows.Next() {
		var userID, username, email, firstName, lastName, gender, creationDate string
		var age int
		var lastMessageContent, lastMessageSender, sortTime string

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
			&sortTime,
		)
		if err != nil {
			log.Printf("ERREUR de scan: %v", err)
			return nil, fmt.Errorf("échec du scan d'une ligne utilisateur: %w", err)
		}

		userCount++

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
			"last_message_time":   sortTime,
		})
	}

	if err = rows.Err(); err != nil {
		log.Printf("ERREUR après itération: %v", err)
		return nil, fmt.Errorf("erreur après itération des lignes: %w", err)
	}

	log.Printf("--- Terminé GetUsersOrderedByLastMessage: %d utilisateurs trouvés ---", userCount)

	return users, nil
}
