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

// Page initialization, check if user is logged in
window.onload = function () {
  checkSession();
};

// Function to navigate to a specific page
export function navigateTo(page) {
  if (routes[page]) {
    const content =
      typeof routes[page] === "function" ? routes[page]() : routes[page];
    document.getElementById("app").innerHTML = content;
    history.pushState({}, page, `#${page}`); // Update URL without reloading, allow SPA behavior
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
        // Login as default if not authenticated
        navigateTo("login");
        return Promise.reject("Not authenticated");
      }
    })
    .then((userData) => {
      if (window.websocket) {
        window.websocket.close();
        window.websocket = null;
      }

      // Update the current user in the global state
      setCurrentUser(userData);
      window.currentUser = userData;
      document.getElementById("logout-button");

      // Initializa a new WebSocket connection and navigate to home
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
  // if already a websocket connection, close it
  if (window.websocket) {
    window.websocket.close();
    window.websocket = null;
  }

  return new Promise((resolve, reject) => {
    // Create a new WebSocket connection
    const socket = new WebSocket("ws://" + window.location.host + "/ws");

    // Create websocket event handlers
    // When connection is opened, send identify user message & user status
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
      resolve(socket); // resolve promise to indicate websocket conn is ready
    };

    // Handle errors, if error occurs, log it and reject the promise
    socket.onerror = function (error) {
      console.error("WebSocket error:", error);
      reject(error);
    };

    // Handle incoming messages from the server
    socket.onmessage = function (event) {

      const message = JSON.parse(event.data);

      switch (message.type) {
        case "online_users":
          // Update the list of online users
          loadAllUsers(); // Reload all users to ensure the list is up-to-date
          break;

        case "all_users":
          // Update the complete list of users
          updateUsersList(message.users);
          break;

        case "user_status":
          handleUserStatusChange(message);
          // After handling user status change, reload all users
          loadAllUsers();
          break;

        case "typing_start":
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
           // If no receiver id & sender is not current user, then i'm the receiver
          if (
            !message.receiver_id && message.sender_id !== getCurrentUser()?.user_id
          ) {
            message.receiver_id = getCurrentUser().user_id;
          }

          if (message.receiver_id === getCurrentUser()?.user_id) {

            // Get the sender in the cached users list
            const sender = getCachedUsers().find(
              (u) => u.user_id === message.sender_id
            );
            const senderName = sender ? sender.username : "Unknown user";

            // Check if the current chat partner is the sender of the message
            const isCorrectConversation =
              currentChatPartner &&
              String(message.sender_id) === String(currentChatPartner.id);

            // Display if the message is for the current chat partner & chat open
            if (isCorrectConversation) {
              displayMessage({
                sender_id: message.sender_id,
                content: message.content,
                timestamp: message.timestamp || Date.now(),
              });
            } else {
              // Create notification if chat is not open
              addNotification(
                message.sender_id,
                senderName,
                message.content,
                message.timestamp || Date.now()
              );
            }
          }

          const updatedUsers = [...getCachedUsers()]; // Copy cached users list without touching the original
          // get the partner id based on whether the message is sent or received
          const partnerId = message.is_sent
            ? message.receiver_id
            : message.sender_id;

          // Search for the partner index
          const partnerIndex = updatedUsers.findIndex(
            (u) => u.user_id === partnerId
          );

          if (partnerIndex > -1) {
            const [partner] = updatedUsers.splice(partnerIndex, 1); // Remove the partner from the list
            // update the partner's last message content and timestamp
            partner.last_message_content = message.content;
            partner.last_message_timestamp = message.timestamp || Date.now();
            // Add the updated partner to the beginning of the list
            updatedUsers.unshift(partner);
            updateCachedUsers(updatedUsers);
            updateUsersList(updatedUsers);
          }
          // Refresh the user list with a small delay to ensure UI updates
          setTimeout(() => loadAllUsers(), 100);
          break;
      }
    };

    // When connection is closed, set websocket to null
    socket.onclose = function () {
      console.log("WebSocket connection closed");
      window.websocket = null;
    };

    window.websocket = socket;
  });
}
