let _currentUser = null;
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (user) => {
  console.log("Setting current user to:", user);
  _currentUser = user;
};

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
          <p id="welcome">Welcome, ${getCurrentUser() ? getCurrentUser().username : "Guest"}</p>
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
          <p id="welcome">Welcome, ${getCurrentUser() ? getCurrentUser().username : "Guest"}</p>
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
    const content = typeof routes[page] === "function" ? routes[page]() : routes[page];
    document.getElementById("app").innerHTML = content;
    history.pushState({}, page, `#${page}`);
  }

  if (page === "register") {
    attachRegisterEventListener();
  } else if (page === "login") {
    attachLoginEventListener();
  } else if (page === "home") {
    console.log("Current user at home navigation:", getCurrentUser);
    setupPostForm();
    loadPosts();
    initChat();
    setupUserListToggle();
  }
}

function setupUserListToggle() {
  const showOnlineUsersBtn = document.getElementById('show-online-users');
  const showAllUsersBtn = document.getElementById('show-all-users');

  showOnlineUsersBtn?.addEventListener('click', function() {
    showOnlineUsersBtn.classList.add('active');
    showAllUsersBtn.classList.remove('active');
    
    // Utiliser d'abord le cache
    const cachedUsers = getCachedOnlineUsers();
    console.log("Cached online users:", cachedUsers);
    
    if (cachedUsers && cachedUsers.length > 0) {
      console.log("Using cached online users");
      updateUsersList(cachedUsers, true);
    }

    // Puis demander une mise à jour via WebSocket
    if (window.websocket) {
      console.log("Requesting fresh online users via WebSocket");
      window.websocket.send(JSON.stringify({
        type: "get_online_users"
      }));
    } else {
      console.log("WebSocket not available, falling back to HTTP");
      loadOnlineUsers();
    }
  });

  showAllUsersBtn?.addEventListener('click', function() {
    showAllUsersBtn.classList.add('active');
    showOnlineUsersBtn.classList.remove('active');
    loadAllUsers();
  });
}

function loadOnlineUsers() {
  console.log("Loading online users via HTTP...");
  fetch('/online-users')
    .then(response => {
      console.log("Online users response status:", response.status);
      return response.json();
    })
    .then(users => {
      console.log("Online users received from HTTP endpoint:", users);
      const uniqueUsers = removeDuplicateUsers(users);
      console.log("Online users after deduplication:", uniqueUsers);
      updateUsersList(uniqueUsers.map(user => ({
        ...user,
        is_online: true
      })), true);
    })
    .catch(error => {
      console.error("Error loading online users:", error);
    });
}

export function loadAllUsers() {
  console.log("Loading all users...");
  fetch('/users', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(users => {
      console.log("All users received:", users);
      const usersWithStatus = users.map(user => ({
        ...user,
        is_online: user.is_online || false
      }));
      updateUsersList(usersWithStatus, false);
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
  getCachedOnlineUsers,
  updateCachedOnlineUsers
} from "./chat.js"

// Verify if the session is still active
function checkSession() {
  fetch("/check-session", { method: "GET", credentials: "include" })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        updateNavigation(false);
        navigateTo("login");
        return Promise.reject("Not authenticated");
      }
    })
    .then((userData) => {
      // Fermer l'ancien WebSocket s'il existe
      if (window.websocket) {
        window.websocket.close();
        window.websocket = null;
      }

      setCurrentUser(userData);
      window.currentUser = userData;
      updateNavigation(true);

      // Initialiser le WebSocket et attendre qu'il soit prêt
      return initializeWebSocket().then(() => {
        navigateTo("home");
      });
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

export function initializeWebSocket() {
  if (window.websocket) {
    window.websocket.close();
    window.websocket = null;
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocket("ws://" + window.location.host + "/ws");

    socket.onopen = function () {
      console.log("WebSocket connection established");
      window.websocket = socket;

      if (getCurrentUser()?.user_id) {
        // D'abord s'identifier
        socket.send(JSON.stringify({
          type: "identify",
          user_id: getCurrentUser().user_id
        }));

        // Ensuite envoyer la notification de connexion
        socket.send(JSON.stringify({
          type: "user_connected",
          user_id: getCurrentUser().user_id,
          username: getCurrentUser().username
        }));

        // Enfin, demander la liste des utilisateurs en ligne
        socket.send(JSON.stringify({
          type: "get_online_users"
        }));
      }
      resolve(socket);
    };

    socket.onerror = function(error) {
      console.error("WebSocket error:", error);
      reject(error);
    };

    socket.onmessage = function (event) {
      const message = JSON.parse(event.data);
      console.log("WS message received:", {
        type: message.type,
        rawData: event.data,
        parsedMessage: message
      });

      switch (message.type) {
        case "online_users":
          console.log("Online users received (before dedup):", message.users);
          // Supprimer les doublons avant d'afficher
          const uniqueUsers = removeDuplicateUsers(message.users);
          console.log("Online users after dedup:", uniqueUsers);
          // S'assurer que tous les utilisateurs sont marqués comme en ligne
          const onlineUsers = uniqueUsers.map(user => ({
            ...user,
            is_online: true
          }));
          // Mettre à jour la liste et le cache
          updateUsersList(onlineUsers, true);
          break;
        case "user_status":
          console.log("User status change received:", message);
          handleUserStatusChange(message);
          // Si nous sommes en mode "online users", mettre à jour la liste
          const showOnlineUsersBtn = document.getElementById('show-online-users');
          if (showOnlineUsersBtn?.classList.contains('active')) {
            socket.send(JSON.stringify({
              type: "get_online_users"
            }));
          }
          break;
        case "private_message":
          // Check if the message is intended for the current user
          // OR if it comes from the current chat partner
          if (message.receiver_id === getCurrentUser?.user_id ||
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
  });
}

function removeDuplicateUsers(users) {
    console.log("Removing duplicates from users:", users);
    if (!Array.isArray(users)) {
        console.error("removeDuplicateUsers: Expected array, got:", typeof users);
        return [];
    }

    const unique = [];
    const ids = new Set();
    
    users.forEach(user => {
        if (!user || !user.user_id) {
            console.error("Invalid user object:", user);
            return;
        }
        
        if (!ids.has(user.user_id)) {
            ids.add(user.user_id);
            unique.push(user);
        } else {
            console.log("Duplicate user found and skipped:", user);
        }
    });
    
    console.log("Users after deduplication:", unique);
    return unique;
}