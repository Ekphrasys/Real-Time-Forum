import { routes } from "./routes.js";

window.navigateTo = navigateTo;

import {
  attachLoginEventListener,
  attachRegisterEventListener,
  logout,
} from "./auth.js";

import { loadPosts, setupPostForm, viewPost } from "./posts.js";

import {
  addNotification,
  markAsRead,
  initNotifications,
} from "./notifications.js";

import {
  updateUsersList,
  getCachedUsers,
  updateCachedUsers,
  loadAllUsers,
  handleUserStatusChange,
  getCurrentUser,
  setCurrentUser,
} from "./users.js";

import {
  displayMessage,
  openChat,
  closeChat,
  initChat,
  currentChatPartner,
  showTypingIndicator,
} from "./chat.js";

window.onload = function () {
  checkSession();
};

export function navigateTo(page) {
  if (routes[page]) {
    const content =
      typeof routes[page] === "function" ? routes[page]() : routes[page];
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
    setTimeout(() => initNotifications(), 100);
  }
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
        socket.send(
          JSON.stringify({
            type: "identify",
            user_id: getCurrentUser().user_id,
          })
        );

        socket.send(
          JSON.stringify({
            type: "user_status",
            user_id: getCurrentUser().user_id,
            username: getCurrentUser().username,
          })
        );
      }
      resolve(socket);
    };

    socket.onerror = function (error) {
      console.error("WebSocket error:", error);
      reject(error);
    };

    socket.onmessage = function (event) {
      console.log("Raw WebSocket message:", event.data);

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

        case "typing_start":
          console.log("Typing start received", message);
          if (message.sender_id !== getCurrentUser()?.user_id) {
            const sender = getCachedUsers().find(
              (u) => u.user_id === message.sender_id
            );
            console.log("Sender found:", sender);
            showTypingIndicator(true, sender?.username || "Someone");

            // Reset existing timeout if any
            if (window.typingStopTimeout)
              clearTimeout(window.typingStopTimeout);

            // Set timeout to hide after 1,5 seconds
            window.typingStopTimeout = setTimeout(() => {
              showTypingIndicator(false);
            }, 1500);
          }
          break;

        case "typing_stop":
          showTypingIndicator(false);
          if (window.typingStopTimeout) clearTimeout(window.typingStopTimeout);
          break;

        case "private_message":
          console.log("DEBUG: Message privé reçu:", message);
          console.log("DEBUG: Utilisateur actuel:", getCurrentUser());

          // Ajouter le receiver_id si manquant
          if (
            !message.receiver_id &&
            message.sender_id !== getCurrentUser()?.user_id
          ) {
            // Si je ne suis pas l'expéditeur, je suis forcément le destinataire
            message.receiver_id = getCurrentUser().user_id;
            console.log("DEBUG: Ajout du receiver_id manquant:", message);
          }

          if (message.receiver_id === getCurrentUser()?.user_id) {
            console.log("DEBUG: Le message est bien pour l'utilisateur actuel");

            // Obtenir les infos de l'expéditeur
            const sender = getCachedUsers().find(
              (u) => u.user_id === message.sender_id
            );
            const senderName = sender ? sender.username : "Unknown user";

            const isCorrectConversation =
              currentChatPartner &&
              String(message.sender_id) === String(currentChatPartner.id); // Il y avait pas les String(). Je teste un truc.

            if (isCorrectConversation) {
              console.log("Affichage du message dans la conversation active");
              displayMessage({
                sender_id: message.sender_id,
                content: message.content,
                timestamp: message.timestamp || Date.now(),
              });
            } else {
              console.log("Création notification pour:", senderName);

              // Créer une notification
              addNotification(
                message.sender_id,
                senderName,
                message.content,
                message.timestamp || Date.now()
              );
            }
          }

          // Mise à jour optimiste de la liste des utilisateurs
          const updatedUsers = [...getCachedUsers()];
          const partnerId = message.is_sent
            ? message.receiver_id
            : message.sender_id;
          const partnerIndex = updatedUsers.findIndex(
            (u) => u.user_id === partnerId
          );

          if (partnerIndex > -1) {
            const [partner] = updatedUsers.splice(partnerIndex, 1);
            partner.last_message_content = message.content;
            partner.last_message_timestamp = message.timestamp || Date.now();
            updatedUsers.unshift(partner);
            updateCachedUsers(updatedUsers);
            updateUsersList(updatedUsers);
          }
          // Rafraîchir la liste dans tous les cas, même pour les messages envoyés
          setTimeout(() => loadAllUsers(), 100);
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
