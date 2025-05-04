package database

import "fmt"

// SavePrivateMessage saves a private message to the database
func SavePrivateMessage(senderID, receiverID, content string) error {
	_, err := DB.Exec(
		"INSERT INTO messages (sender_id, receiver_id, content, sent_at) VALUES (?, ?, ?, datetime('now'))",
		senderID, receiverID, content,
	)
	return err
}

// GetPrivateMessages retrieves conversation history between two users
func GetPrivateMessages(user1ID, user2ID string) ([]map[string]interface{}, error) {
	rows, err := DB.Query(`
        SELECT id, sender_id, receiver_id, content, sent_at
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) 
           OR (sender_id = ? AND receiver_id = ?)
        ORDER BY sent_at`,
		user1ID, user2ID, user2ID, user1ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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
