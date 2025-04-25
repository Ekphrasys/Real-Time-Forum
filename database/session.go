package database

import (
	"Real-Time-Forum/models"
	"time"
)

func SaveSession(sessionID, userID string, duration time.Duration) error {
	_, err := DB.Exec(
		"INSERT INTO session(session_id, user_id, created_at, expires_at) VALUES(?, ?, ?, ?)",
		sessionID, userID, time.Now(), time.Now().Add(duration))
	return err
}

func GetUserIDFromSession(sessionID string) (string, error) {
	var userID string
	err := DB.QueryRow("SELECT user_id FROM session WHERE session_id = ? AND expires_at > ?",
		sessionID, time.Now()).Scan(&userID)
	return userID, err
}

func DeleteSession(sessionID string) error {
	_, err := DB.Exec("DELETE FROM session WHERE session_id = ?", sessionID)
	return err
}

// UpdateSessionStatus updates the status of a session
func UpdateSessionStatus(sessionID, status string) error {
	_, err := DB.Exec("UPDATE session SET status = ? WHERE session_id = ?", status, sessionID)
	return err
}

// GetOnlineUsers returns all users with an active session and 'online' status
func GetOnlineUsers() ([]models.User, error) {
	rows, err := DB.Query(`
        SELECT DISTINCT u.user_id, u.username, u.first_name, u.last_name 
        FROM User u
        JOIN session s ON u.user_id = s.user_id
        WHERE s.status = 'online' AND s.expires_at > ?
    `, time.Now())

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.Id, &user.Username, &user.FirstName, &user.LastName)
		if err != nil {
			continue
		}
		users = append(users, user)
	}

	return users, nil
}
