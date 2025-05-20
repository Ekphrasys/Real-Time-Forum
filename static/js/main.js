import { routes } from "./routes.js";

window.navigateTo = navigateTo;

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
  getCachedUsers,
} from "./chat.js";

let _currentUser = null;
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (user) => {
  console.log("Setting current user to:", user);
  _currentUser = user;
};

window.onload = function () {
  checkSession();
};

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
    loadAllUsers();
  }
}

export function loadAllUsers() {
    fetch('/users', {
        method: 'GET',
        headers: {'Accept': 'application/json'},
        credentials: 'include'
    })
    .then(response => response.json())
    .then(users => {
        // Pour chaque utilisateur, vérifier s'il est en ligne en comparant avec les utilisateurs en ligne
        fetch('/online-users', {
            method: 'GET',
            headers: {'Accept': 'application/json'},
            credentials: 'include'
        })
        .then(response => response.json())
        .then(onlineUsers => {
            // Créer un Set des IDs des utilisateurs en ligne pour une recherche efficace
            const onlineUserIds = new Set(onlineUsers.map(u => u.user_id));
            
            // Mettre à jour le statut en ligne de chaque utilisateur
            const combinedUsers = users.map(user => ({
                ...user,
                is_online: onlineUserIds.has(user.user_id)
            }));
            
            updateUsersList(combinedUsers);
        })
        .catch(error => {
            console.error('Error fetching online users:', error);
            // En cas d'erreur, afficher quand même tous les utilisateurs
            updateUsersList(users.map(user => ({
                ...user,
                is_online: false
            })));
        });
    })
    .catch(error => console.error('Error fetching users:', error));
}

function checkSession() {
  fetch("/check-session", { method: "GET", credentials: "include" })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        navigateTo("login");
        return Promise.reject("Not authenticated");
      }
    })
    .then((userData) => {
      if (window.websocket) {
        window.websocket.close();
        window.websocket = null;
      }

      setCurrentUser(userData);
      window.currentUser = userData;
      document.getElementById("logout-button");

      return initializeWebSocket().then(() => {
        navigateTo("home");
      });
    })
    .catch((error) => {
      console.error("Session check error:", error);
    });
}

function goToHome() {
  navigateTo("home");
}

window.logout = logout;
window.checkSession = checkSession;
window.goToHome = goToHome;
window.navigateTo = navigateTo;
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
        socket.send(JSON.stringify({
          type: "identify",
          user_id: getCurrentUser().user_id
        }));

        socket.send(JSON.stringify({
          type: "user_status",
          user_id: getCurrentUser().user_id,
          username: getCurrentUser().username
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
            // Mise à jour des utilisateurs en ligne dans notre liste unifiée
            loadAllUsers(); // Recharger tous les utilisateurs avec le statut mis à jour
            break;
        case "all_users":
            // Nouveau type de message pour tous les utilisateurs
            updateUsersList(message.users);
            break;
        case "user_status":
          handleUserStatusChange(message);
          // Après un changement de statut, actualiser la liste complète
          loadAllUsers();
          break;
        case "private_message":
          if (message.receiver_id === getCurrentUser()?.user_id ||
            (currentChatPartner && message.sender_id === currentChatPartner.id)) {

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