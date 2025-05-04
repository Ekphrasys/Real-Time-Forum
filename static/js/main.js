window.currentUser = null;
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
          <p id="welcome">Welcome, ${window.currentUser ? currentUser.username : "Guest"
      }</p>
              <button id="logout-button" onclick="console.log('Button clicked'); logout();">Logout</button>
            </div>
      </header>
   
        <div class="main-content">
        <div class="users-container">
              <div class="user-list-toggle">
                <button id="show-online-users" class="active">Online Users</button>
                <button id="show-all-users">All Users</button>
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
          <p id="welcome">Welcome, ${window.currentUser ? window.currentUser.username : "Guest"
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

window.onload = function () {
  checkSession();
};

// Function to navigate between pages
export function navigateTo(page) {
  if (routes[page]) {
    // Check if the route is a function and call it
    const content =
      typeof routes[page] === "function" ? routes[page]() : routes[page];
    document.getElementById("app").innerHTML = content;
    history.pushState({}, page, `#${page}`);
  }
  // Attach event listener for register form after inserting into DOM
  if (page === "register") {
    attachRegisterEventListener();
  }

  if (page === "login") {
    attachLoginEventListener();
  }
  if (page === "home") {
    setupPostForm();
    loadPosts();
    initChat();
    setupUserListToggle();
    fetchOnlineUsers();
  }
}

function setupUserListToggle() {
  document.getElementById('show-online-users')?.addEventListener('click', function() {
      this.classList.add('active');
      document.getElementById('show-all-users').classList.remove('active');
      loadOnlineUsers();
  });

  document.getElementById('show-all-users')?.addEventListener('click', function() {
      this.classList.add('active');
      document.getElementById('show-online-users').classList.remove('active');
      loadAllUsers();
  });
}

function loadOnlineUsers() {
  fetch('/online-users')
      .then(response => response.json())
      .then(users => {
          updateUsersList(users, true);
      });
}

export function loadAllUsers() {
  fetch('/users', {
      method: 'GET',
      headers: {
          'Accept': 'application/json',
      },
      credentials: 'include'
  })
  .then(response => {
      console.log("Response status:", response.status);
      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
  })
  .then(users => {
      console.log("Received users data:", users);
      if (users && users.length > 0) {
          // Ensure all users have an is_online property
          const usersWithStatus = users.map(user => ({
              ...user,
              is_online: user.is_online || false // Default to false if not defined
          }));
          updateUsersList(usersWithStatus, false);
      } else {
          console.log("No users found");
          document.querySelector('.users-list').innerHTML = '<li>No users found</li>';
      }
  })
  .catch(error => {
      console.error('Error fetching all users:', error);
      document.querySelector('.users-list').innerHTML = `<li>Error loading users: ${error.message}</li>`;
  });
}

export function toggleUserList(showOnline) {
  showingOnlineUsers = showOnline;
  
  if (showOnline) {
      fetchOnlineUsers();
  } else {
      fetchAllUsers();
  }
}

// Functions to fetch users
function fetchOnlineUsers() {
  if (window.websocket) {
      window.websocket.send(JSON.stringify({
          type: "get_online_users"
      }));
  }
}

function fetchAllUsers() {
  console.log("Fetching all users...");
  fetch('/users')
      .then(response => {
          console.log("Response status:", response.status);
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
      })
      .then(users => {
          console.log("Received users data:", users);
          updateUsersList(users, false);
      })
      .catch(error => {
          console.error('Error fetching all users:', error);
      });
}

window.navigateTo = navigateTo;

// Expose chat functions globally for chat
window.openChat = openChat;
window.closeChat = closeChat;
window.initChat = initChat;

import {
  attachLoginEventListener,
  attachRegisterEventListener,
  logout,
} from "./auth.js";

import {
  loadPosts,
  setupPostForm,
  viewPost,
} from "./posts.js";

import {
  updateUsersList,
  displayMessage,
  openChat,
  closeChat,
  initChat,
  handleUserStatusChange,
  currentChatPartner,
} from "./chat.js"

// Verify if the session is still active
function checkSession() {
  fetch("/check-session", { method: "GET", credentials: "include" })
    .then((response) => {
      console.log("Session check response:", response);
      if (response.ok) {
        return response.json(); // Get user data from response
      } else {
        console.log("Session is not active");
        updateNavigation(false);
        navigateTo("login");
        return Promise.reject("Not authenticated");
      }
    })
    .then((userData) => {
      console.log("User data:", userData);
      currentUser = userData; // Store user data
      console.log("currentUser after setting:", currentUser); // Debug to verify
      updateNavigation(true);
      navigateTo("home");

      // Initialize WebSocket after successful login
      initializeWebSocket();
    })
    .catch((error) => {
      console.error("Session check error:", error);
      updateNavigation(false);
    });
}

export function updateNavigation(isAuthenticated) {
  const nav = document.getElementById("logout-button");
}

// Function to navigate to the home page
function goToHome() {
  navigateTo("home");
}

// Expose functions to the global scope
window.logout = logout;
window.checkSession = checkSession;
window.goToHome = goToHome;
window.updateNavigation = updateNavigation;
window.navigateTo = navigateTo;

// Make sure to expose viewPost globally
window.viewPost = viewPost;

function initializeWebSocket() {
  if (window.websocket) {
    return; // Already connected
  }

  const socket = new WebSocket("ws://" + window.location.host + "/ws");

  socket.onopen = function () {
    console.log("WebSocket connection established");
  };

  socket.onmessage = function (event) {
    const message = JSON.parse(event.data);
    console.log("WebSocket message received:", message);

    switch (message.type) {
        case "online_users":
            updateUsersList(message.users);
            break;
        case "user_status":
            handleUserStatusChange(message);
            break;
        case "private_message":
            // Check if the message is intended for the current user
            // OR if it comes from the current chat partner
            if (message.receiver_id === currentUser?.id || 
                (currentChatPartner && message.sender_id === currentChatPartner.id)) {
                
                // Check if we are in the correct conversation to display the message
                const isCorrectConversation = 
                    currentChatPartner && 
                    (message.sender_id === currentChatPartner.id || 
                    message.receiver_id === currentChatPartner.id);
                
                if (isCorrectConversation) {
                    displayMessage({
                        sender_id: message.sender_id,
                        content: message.content,
                        timestamp: message.timestamp || Date.now()
                    });
                } else {
                    // Notification for a new message
                    console.log("New message from:", message.sender_id);
                    // You could add a UI notification here
                }
            }
            break;
    }
  };

  socket.onclose = function () {
    console.log("WebSocket connection closed");
    window.websocket = null;
  };

  window.websocket = socket;
}
