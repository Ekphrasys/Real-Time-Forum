package database

import (
	"fmt"
)

// Manage saving and retrieving private messages in the database

// SavePrivateMessage saves a private message to the database
func SavePrivateMessage(senderID, receiverID, content string) error {
	_, err := DB.Exec(
		"INSERT INTO messages (sender_id, receiver_id, content, sent_at) VALUES (?, ?, ?, datetime('now'))",
		senderID, receiverID, content,
	)
	return err
}

// GetPrivateMessages retrieves paginated conversation history between two users
func GetPrivateMessages(user1ID, user2ID string, page, limit int) ([]map[string]interface{}, error) {
	offset := (page - 1) * limit

	// SQL query to get messages between two users
	// Takes into account both directions of the conversation & pagination (LIMIT and OFFSET)
	query := fmt.Sprintf(`
        SELECT id, sender_id, receiver_id, content, sent_at
        FROM messages
        WHERE (sender_id = '%s' AND receiver_id = '%s')
           OR (sender_id = '%s' AND receiver_id = '%s')
        ORDER BY sent_at DESC
        LIMIT %d OFFSET %d`,
		user1ID, user2ID, user2ID, user1ID, limit, offset)

	rows, err := DB.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query error: %v", err)
	}
	defer rows.Close()

	// Messages are stored in a slice of maps
	var messages []map[string]interface{}
	for rows.Next() {
		var id int
		var senderID, receiverID, content, sentAt string

		if err := rows.Scan(&id, &senderID, &receiverID, &content, &sentAt); err != nil {
			return nil, fmt.Errorf("scan error: %v", err)
		}

		messages = append(messages, map[string]interface{}{
			"id":          id,
			"sender_id":   senderID,
			"receiver_id": receiverID,
			"content":     content,
			"sent_at":     sentAt,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %v", err)
	}

	return messages, nil
}
