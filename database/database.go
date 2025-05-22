package database

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

// InitDB reads the query.sql file and executes its content
func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "database.db")
	if err != nil {
		log.Fatal(err)
	}

	// Read the query.sql file
	sqlFile, err := ioutil.ReadFile("query.sql")
	if err != nil {
		log.Fatal("Error reading the SQL file:", err)
	}

	// Execute the SQL queries
	_, err = DB.Exec(string(sqlFile))
	if err != nil {
		log.Fatal("Error executing the SQL queries:", err)
	}

	fmt.Println("Database initialized successfully!")
}
