# 🧵 Real-Time-Forum
A complete real-time forum web application built with Go, SQLite, HTML/CSS, and JavaScript, using WebSockets for instant private messaging. This is a Single Page Application (SPA) built without any frontend frameworks, designed to reinforce full-stack fundamentals.

## 📌 Features
### 🔐 Authentication
- Registration form with the following fields:
- Username
- Age
- Gender
- First Name
- Last Name
- Email
- Password (securely hashed with bcrypt)


Login using nickname or email + password

Logout available from any page

### 📝 Forum Functionality
Create posts with category tags

Add comments to posts

Feed view of all posts

Comments only displayed when a post is clicked

### 💬 Real-Time Private Messaging
A user sidebar showing users sorted by:

- Most recent conversation (if any)

- Alphabetical order (if new user with no messages)

WebSocket-powered chat for real-time communication

Persistent chat section

Load previous messages in batches of 10 with throttle to prevent spammy scroll behavior

Message format includes:

- Sender’s nickname

- Timestamp

- Message content

## 🧰 Technologies Used
### Backend: 
- Go (Golang)

- Gorilla WebSocket

- SQLite3

- bcrypt

- gofrs/uuid

### Frontend:

- Vanilla HTML/CSS

- JavaScript (DOM manipulation, SPA navigation, WebSockets)

### Database:

- SQLite

## 🚀 Getting Started
### Prerequisites
Go 1.18+

SQLite3 installed

```bash
git clone https://github.com/Ekphrasys/Real-Time-Forum.git
cd Real-Time-Forum

go mod tidy

# Run the server
go run main.go
```
By default, the server will start on ```http://localhost:8080```

## 📁 Stored Data
- Users and sessions
- Posts and comments
- Conversations and private messages
- Online/offline status tracking

## 🔐 Security Highlights
- Passwords hashed with bcrypt

- Secure session handling via HTTP cookies


## 🎓 About the Project
This project was developed as a hands-on learning experience to master:

- WebSockets (Go and JS)

- HTTP sessions and cookie management

- Frontend SPA logic without frameworks

- DOM manipulation and frontend state control

## 🤝 Team

- Samson Cointin
- Daro Samaky

## 📘 License
This project is licensed under the GPL 3.0 License.
