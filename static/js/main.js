let _currentUser = null;
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (user) => {
  console.log("Setting current user to:", user);
  _currentUser = user;
};

window.onload = function () {
  checkSession();
};

import { routes } from "./routes.js";

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
    setupPostForm();
    loadPosts();
    initChat();
    setupUserListToggle();
  }
}

function setupUserListToggle() {
  const showOnlineUsersBtn = document.getElementById('show-online-users');
  const showAllUsersBtn = document.getElementById('show-all-users');

  showOnlineUsersBtn?.addEventListener('click', function () {
    showOnlineUsersBtn.classList.add('active');
    showAllUsersBtn.classList.remove('active');

    // Utiliser d'abord le cache
    const cachedUsers = getCachedOnlineUsers();

    if (cachedUsers && cachedUsers.length > 0) {
      updateUsersList(cachedUsers, true);
    }

    // Puis demander une mise à jour via WebSocket
    if (window.websocket) {
    window.websocket.send(JSON.stringify({
        type: "get_online_users"
    }));
}
  });

  showAllUsersBtn?.addEventListener('click', function () {
    showAllUsersBtn.classList.add('active');
    showOnlineUsersBtn.classList.remove('active');
    loadAllUsers();
  });
}

export function loadAllUsers() {
    fetch('/users', {
        method: 'GET',
        headers: {'Accept': 'application/json'},
        credentials: 'include'
    })
    .then(response => response.json())
    .then(users => {
        updateUsersList(users.map(user => ({
            ...user,
            is_online: user.is_online || false
        })), false);
    })
    .catch(error => console.error('Error fetching users:', error));
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
          type: "user_status",
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

    socket.onerror = function (error) {
      console.error("WebSocket error:", error);
      reject(error);
    };

    socket.onmessage = function (event) {
    const message = JSON.parse(event.data);

      switch (message.type) {
        case "online_users":
            // Plus besoin de déduplication, on utilise directement les données
            updateUsersList(message.users.map(user => ({
                ...user,
                is_online: true
            })), true);
            break;
        case "user_status":
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