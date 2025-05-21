import { setCurrentUser, getCurrentUser } from "./main.js";

export let currentChatPartner = null;
let cachedUsers = []; // Changement: nous stockons tous les utilisateurs, pas seulement ceux en ligne
let pendingStatusUpdates = {};

let currentPage = 1;
let isLoadingMessages = false;
let hasMoreMessages = true;
let allLoadedMessages = [];

// Suppression de la fonction setShowingOnlineUsers qui n'est plus nécessaire

export function getCachedUsers() {
  return cachedUsers;
}

export function updateCachedUsers(users) {
  cachedUsers = users;
}

export function updateUsersList(users) {
  const usersList = document.querySelector(".users-list");
  if (!usersList) return;

  usersList.innerHTML = "";
  const currentUserId = getCurrentUser()?.user_id;

  users.forEach((user) => {
    const isCurrentUser = user.user_id === currentUserId;
    const item = document.createElement("li");
    item.className = `user-item ${isCurrentUser ? "current-user" : ""}`;
    item.dataset.userId = user.user_id;
    item.dataset.username = user.username;
  
    // Ajouter un indicateur de dernier message
    const lastMessageInfo = user.last_message_content

    item.innerHTML = `
      <div class="user-status ${user.is_online ? "online" : "offline"}"></div>
      <div class="user-info">
        <div class="user-name">${user.username}</div>
      </div>
    `;
    usersList.appendChild(item);
  });

  updateCachedUsers(users);
}



export function sendMessage() {
  // Le reste de la fonction reste inchangé
  if (!currentChatPartner || !getCurrentUser()?.user_id) return;

  const input = document.getElementById("message-input");
  const content = input.value.trim();

  if (content) {
    window.websocket.send(
      JSON.stringify({
        type: "private_message",
        receiver_id: currentChatPartner.id,
        content: content,
      })
    );

    const newMessage = {
      sender_id: getCurrentUser().user_id,
      content: content,
      timestamp: Date.now(),
    };
    
    allLoadedMessages.push(newMessage);
    displayMessage(newMessage);

    input.value = "";
  }
}

export function displayMessage(msg) {
  const chatDiv = document.getElementById("chat-messages");
  if (!chatDiv) return;

  const isSentByMe =
    String(msg.sender_id) === String(getCurrentUser()?.user_id);

  const messageElement = document.createElement("div");
  messageElement.className = isSentByMe ? "message sent" : "message received";
  messageElement.dataset.senderId = msg.sender_id;

  if (currentChatPartner && currentChatPartner.id) {
    messageElement.dataset.conversationId = isSentByMe
      ? `${getCurrentUser().user_id}-${currentChatPartner.id}`
      : `${msg.sender_id}-${getCurrentUser().user_id}`;
  }

 const timestamp = new Date(msg.timestamp || msg.sent_at);
  const formattedDateTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;

  messageElement.innerHTML = `
          <div class="message-content">${msg.content}</div>
          <div class="message-time">${formattedDateTime}</div>
      `;
  chatDiv.appendChild(messageElement);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}


export async function loadMessageHistory(userId, loadMore = false) {
    if (isLoadingMessages) return;

    if (!loadMore) {
        // Reset everything for a new chat
        currentPage = 1;
        hasMoreMessages = true;
        allLoadedMessages = [];
        const chatDiv = document.getElementById("chat-messages");
        if (chatDiv) chatDiv.innerHTML = '<div class="loading-indicator">Loading messages...</div>';
    } else if (!hasMoreMessages) {
        return;
    }

    isLoadingMessages = true;

    try {
        const pageSize = 10;
        const response = await fetch(`/messages?user_id=${userId}&page=${currentPage}&limit=${pageSize}`, {
            credentials: "include",
        });
        if (!response.ok) throw new Error(`Failed to load: ${response.status}`);

        const data = await response.json();
        const chatDiv = document.getElementById("chat-messages");
        if (!chatDiv) return;

        // Supprimer l'indicateur de chargement uniquement au premier chargement
        const loadingIndicator = chatDiv.querySelector(".loading-indicator");
        if (loadingIndicator && !loadMore) loadingIndicator.remove();

        if (Array.isArray(data) && data.length > 0) {
            // Sauvegarder la position de scroll actuelle
            const wasAtBottom = loadMore ? false : true;
            const oldScrollHeight = chatDiv.scrollHeight;
            
            if (loadMore) {
                // Lors d'un chargement progressif, ajouter au début du tableau
                allLoadedMessages = [...data, ...allLoadedMessages];
                
                // Insérer les nouveaux messages en haut
                const fragment = document.createDocumentFragment();
                data.sort((a, b) => {
                    const timestampA = a.sent_at || a.timestamp;
                    const timestampB = b.sent_at || b.timestamp;
                    return new Date(timestampA) - new Date(timestampB);
                }).forEach(msg => {
                    fragment.appendChild(createMessageElement(msg));
                });
                
                // Insérer au début du conteneur
                if (chatDiv.firstChild) {
                    chatDiv.insertBefore(fragment, chatDiv.firstChild);
                } else {
                    chatDiv.appendChild(fragment);
                }
                
                // Maintenir la position de défilement relative
                chatDiv.scrollTop = chatDiv.scrollHeight - oldScrollHeight;
            } else {
                // Premier chargement
                allLoadedMessages = [...data];
                
                // Vider le conteneur et afficher tous les messages
                chatDiv.innerHTML = '';
                data.sort((a, b) => {
                    const timestampA = a.sent_at || a.timestamp;
                    const timestampB = b.sent_at || b.timestamp;
                    return new Date(timestampA) - new Date(timestampB);
                }).forEach(msg => {
                    chatDiv.appendChild(createMessageElement(msg));
                });
                
                // Faire défiler jusqu'en bas pour le chargement initial
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }
            
            currentPage++;
            hasMoreMessages = data.length === pageSize;
        } else {
            hasMoreMessages = false;
        }
    } catch (error) {
        console.error("Error loading messages:", error);
        const chatDiv = document.getElementById("chat-messages");
        if (chatDiv && !loadMore) {
            chatDiv.innerHTML = '<div class="error-message">Error loading messages.</div>';
        }
    } finally {
        isLoadingMessages = false;
    }
}

function createMessageElement(msg) {
  const isSentByMe =
    String(msg.sender_id) === String(getCurrentUser()?.user_id);
  const messageElement = document.createElement("div");
  messageElement.className = isSentByMe ? "message sent" : "message received";
  messageElement.dataset.senderId = msg.sender_id;
  messageElement.dataset.messageId = msg.id;

  if (currentChatPartner && currentChatPartner.id) {
    messageElement.dataset.conversationId = isSentByMe
      ? `${getCurrentUser().user_id}-${currentChatPartner.id}`
      : `${msg.sender_id}-${getCurrentUser().user_id}`;
  }

  let timeString;
  try {
    const timestamp =
      typeof msg.sent_at === "string"
        ? msg.sent_at
        : msg.timestamp || new Date();
  const formattedDate = new Date(timestamp);
    timeString = `${formattedDate.toLocaleDateString()} ${formattedDate.toLocaleTimeString()}`;
  } catch (e) {
    timeString = "Unknown time";
  }

  messageElement.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-time">${timeString}</div>
    `;
  return messageElement;
}

export function openChat(userId, username) {
  if (!userId || !username) return;

  const id = String(userId);

  currentPage = 1;
  hasMoreMessages = true;
  isLoadingMessages = false;
  allLoadedMessages = [];  // Réinitialiser les messages à l'ouverture d'un nouveau chat

  currentChatPartner = { id: id, username: username };

  const chatModal = document.getElementById("chat-modal");
  const partnerName = document.getElementById("chat-partner-name");

  if (chatModal && partnerName) {
    partnerName.textContent = username;
    chatModal.style.display = "flex";

    loadMessageHistory(id);

    setTimeout(() => {
      const inputField = document.getElementById("message-input");
      if (inputField) inputField.focus();
    }, 300);
  }
}

export function closeChat() {
  const chatModal = document.getElementById("chat-modal");
  if (chatModal) {
    chatModal.style.display = "none";
  }
  currentChatPartner = null;

  currentPage = 1;
  hasMoreMessages = true;
  isLoadingMessages = false;
  allLoadedMessages = [];  // Réinitialiser les messages à la fermeture du chat
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

function handleScrollForLoading() {
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages || isLoadingMessages || !hasMoreMessages) return;

    if (chatMessages.scrollTop < 50) {
        loadMessageHistory(currentChatPartner.id, true);
    }
}

export function initChat() {
  document
    .querySelector(".users-list")
    ?.addEventListener("click", function (e) {
      const userItem = e.target.closest(".user-item");
      if (!userItem) return;
      e.stopPropagation();
      openChat(userItem.dataset.userId, userItem.dataset.username);
    });

  const chatModal = document.getElementById("chat-modal");
  if (!chatModal) return;

  const sendBtn = document.getElementById("send-message-btn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  const messageInput = document.getElementById("message-input");
  if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }

  const closeBtn = document.querySelector(".close-chat");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeChat);
  }

  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    const throttledScrollHandler = throttle(handleScrollForLoading, 300);
    chatMessages.addEventListener("scroll", throttledScrollHandler);
  }
}

export function handleUserStatusChange(message) {
  if (pendingStatusUpdates[message.user_id]) {
    clearTimeout(pendingStatusUpdates[message.user_id]);
    delete pendingStatusUpdates[message.user_id];
  }

  pendingStatusUpdates[message.user_id] = setTimeout(() => {
    processUserStatusUpdate(message);
    delete pendingStatusUpdates[message.user_id];
  }, 100);
}

function processUserStatusUpdate(message) {
  const usersList = document.querySelector(".users-list");
  if (!usersList) return;

  // Mettre à jour le cache local
  const newCachedUsers = [...cachedUsers];
  const existingIndex = newCachedUsers.findIndex(
    (u) => u.user_id === message.user_id
  );

  if (existingIndex === -1) {
    // Nouvel utilisateur, l'ajouter à la liste
    newCachedUsers.push({
      user_id: message.user_id,
      username: message.username,
      is_online: message.status === "online",
    });
  } else {
    // Mettre à jour le statut d'un utilisateur existant
    newCachedUsers[existingIndex].is_online = message.status === "online";
  }
  
  // Trier et mettre à jour la liste complète
  updateCachedUsers(newCachedUsers);
  updateUsersList(newCachedUsers);

  // Demander une mise à jour complète de la liste
  if (window.websocket) {
    setTimeout(() => {
      window.websocket.send(
        JSON.stringify({
          type: "get_online_users",
        })
      );
    }, 300);
  }
}