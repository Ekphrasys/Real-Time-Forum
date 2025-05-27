CREATE TABLE IF NOT EXISTS User (
   user_id CHAR(32) PRIMARY KEY,
   email VARCHAR(100) NOT NULL,
   age INTEGER NOT NULL,
   gender INTEGER NOT NULL CHECK (gender IN (1, 2, 3)),
   first_name TEXT NOT NULL,
   last_name TEXT NOT NULL,
   username VARCHAR(50) NOT NULL,
   password VARCHAR(255) NOT NULL, -- Hashed password
   creation_date DATETIME NOT NULL
 );
 
 CREATE TABLE IF NOT EXISTS Post (
   post_id CHAR(32) PRIMARY KEY,
   title VARCHAR(50) NOT NULL,
   content TEXT NOT NULL, -- Content of the post
   category VARCHAR(50) NOT NULL,
   user_id CHAR(32) NOT NULL,
   creation_date DATETIME NOT NULL,
   update_date DATETIME,
   FOREIGN KEY (user_id) REFERENCES User(user_id)
 );
 
 CREATE TABLE IF NOT EXISTS Comment (
   comment_id CHAR(32) PRIMARY KEY,
   content TEXT NOT NULL,
   creation_date DATETIME NOT NULL,
   update_date DATETIME,
   user_id CHAR(32) NOT NULL,
   post_id CHAR(32) NOT NULL,
   FOREIGN KEY (user_id) REFERENCES User(user_id),
   FOREIGN KEY (post_id) REFERENCES Post(post_id)
 );

CREATE TABLE IF NOT EXISTS session (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    status TEXT DEFAULT 'online',
    FOREIGN KEY (user_id) REFERENCES user(user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at DATETIME NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES User(user_id),
    FOREIGN KEY (receiver_id) REFERENCES User(user_id)
);
