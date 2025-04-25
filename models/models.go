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
	UserId       string    `json:"user_id"`
	Title        string    `json:"title"`
	Content      string    `json:"content"`
	Category     string    `json:"category"`
	CreationDate time.Time `json:"creation_date"`
	Username     string    `json:"username"`
}

type Comment struct {
	Id           string    `json:"comment_id"`
	PostId       string    `json:"post_id"`
	UserId       string    `json:"user_id"`
	Content      string    `json:"content"`
	CreationDate time.Time `json:"creation_date"`
	Username     string    `json:"username"`
}

// Add to your models.go file
type PostWithComments struct {
	Post     Post      `json:"post"`
	Comments []Comment `json:"comments"`
}
