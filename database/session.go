package database

import (
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
