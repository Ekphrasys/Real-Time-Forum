package models

import "time"

// Struct for registering in users
type User struct {
	Id           int       `json:"id"`
	Username     string    `json:"username"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Age          int       `json:"age"` // 1 = male, 2 = female, 3 = other
	Gender       int       `json:"gender"`
	Email        string    `json:"email"`
	Password     string    `json:"password"`
	CreationDate time.Time `json:"creation_date"`
}
