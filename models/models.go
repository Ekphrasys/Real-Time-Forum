package models

import "time"

// Struct for registering in users
type User struct {
	Id           string    `json:"user_id"`
	Username     string    `json:"username"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Age          int       `json:"age"`
	Gender       int       `json:"gender"` // 1 = male, 2 = female, 3 = other
	Email        string    `json:"email"`
	Password     string    `json:"password"`
	CreationDate time.Time `json:"creation_date"`
}

type Post struct {
	Id           string    `json:"post_id"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	UserId       string    `json:"user_id"`
	CreationDate time.Time `json:"creation_date"`
}
