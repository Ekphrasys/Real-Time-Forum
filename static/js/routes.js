import { getCurrentUser } from "./users.js";

import { addNotification, initNotifications } from "./notifications.js";

export const routes = {
  register: function () {
    return `
        <h1>Register</h1>
        <form id="registerForm">
            <input type="text" id="username" placeholder="Username..." required>
            <input type="number" id="age" placeholder="Age..." required min="13" max="120">
            <select id="gender" required>
                <option value="" disabled selected>Select Gender</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
                <option value="3">Other</option>
            </select>
            <input type="text" id="first_name" placeholder="Firstname..." required>
            <input type="text" id="last_name" placeholder="Lastname..." required>
            <input type="email" id="email" placeholder="Email..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Register</button>

            <!-- Error container -->
            <div id="error-message" class="error-message"></div>
        </form>
        <p>Already have an account ?<a href="#" onclick="navigateTo('login')"> Login</a></p>
    `;
  },

  login: function () {
    return `
        <h1>Login</h1>
        <form id="loginForm">
            <input type="text" id="usernameOrMail" placeholder="Username or Email..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Login</button>
        </form>
        <div id="errorMessage" style="color: red;"></div>
        <p>Don't have an account ?<a href="#" onclick="navigateTo('register')"> Register</a></p>
    `;
  },

  home: function () {
    return `
      <header>
          <h1>Holy Chicken Order</h1>
            <div class="user-info">
          <p id="welcome">Welcome, ${
            getCurrentUser() ? getCurrentUser().username : "Guest"
          }</p>
              
              <!-- Ajouter le bouton de notification ici -->
              <div class="notification-container">
                <button id="notification-button">🔔
                  <span class="notification-badge"></span>
                </button>
                <div class="notification-panel"></div>
              </div>
              
              <button id="logout-button" onclick="console.log('Button clicked'); logout();">Logout</button>
            </div>
      </header>
   
        <div class="main-content">
        <div class="users-container">
              <div class="user-list-toggle">
                <h3 id="show-all-users">All Users</h3>
              </div>
            <ul class="users-list">
              <!-- List dynamically -->
            </ul>
        </div>

        <div class="posts-container">
          <div class="create-post">
            <h3>Create a new post</h3>
            <input type="text" id="post-title" placeholder="Enter title..." required>
            <select id="post-category">
              <option value="general">General</option>
              <option value="technology">Technology</option>
              <option value="question">Question</option>
            </select>
            <textarea placeholder="What's on your mind?" rows="3"></textarea>
            <button type="button">Post</button>
          </div>
            
            <h2>Recent Posts</h2>
            <div class="posts">
                <!-- Posts will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Hidden chat by default -->
         <div id="chat-modal">
          <div class="chat-header">
              <h3>Chat with <span id="chat-partner-name"></span></h3>
              <button class="close-chat">×</button>
          </div>
          <div class="chat-messages" id="chat-messages"></div>
          <div id="typing-indicator"></div>
          <div class="chat-input">
              <input type="text" id="message-input" placeholder="Type your message...">
              <button id="send-message-btn">Send</button>
          </div>
      </div>
    `;
  },
  "post-detail": function (postId) {
    return `
      <header>
        <h1>Holy Chicken Order</h1>
        <div class="user-info">
          <p id="welcome">Welcome, ${
            getCurrentUser() ? getCurrentUser().username : "Guest"
          }</p>
          <button onclick="navigateTo('home')">Back to Forum</button>
          <button id="logout-button" onclick="console.log('Button clicked'); logout();">Logout</button>
        </div>
      </header>
      
      <div class="post-detail-container">
        <div id="post-content">
          <h2>Loading post...</h2>
        </div>
        
        <div class="comments-section">
          <h3>Comments</h3>
          <div id="comments-list">
            <!-- Comments will be loaded here -->
          </div>
          
          <div class="comment-form">
            <h4>Add a Comment</h4>
            <textarea id="comment-content" placeholder="Write your comment..." rows="3"></textarea>
            <button id="submit-comment">Post Comment</button>
          </div>
        </div>
      </div>
    `;
  },
};
