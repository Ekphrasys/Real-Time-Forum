import { setCurrentUser } from "./users.js";

import {
  loadAllUsers,
  updateUsersList,
  updateCachedUsers,
  getCurrentUser,
  cachedUsers,
} from "./users.js";

import { markAsRead } from "./notifications.js";

export let currentChatPartner = null;

let currentPage = 1;
let isLoadingMessages = false;
let hasMoreMessages = true;
let allLoadedMessages = [];

let typingTimeout;

export function sendMessage() {
  if (!currentChatPartner || !getCurrentUser()?.user_id) return;

  const input = document.getElementById("message-input");
  const content = input.value.trim();

  if (content) {
    // Optimistic UI update - update the cached users immediately
    const updatedUsers = [...cachedUsers];
    const partnerIndex = updatedUsers.findIndex(
      (u) => u.user_id === currentChatPartner.id
    );

    if (partnerIndex > -1) {
      // Move the partner to top of the list
      const [partner] = updatedUsers.splice(partnerIndex, 1);
      partner.last_message_content = content;
      partner.last_message_timestamp = Date.now();
      updatedUsers.unshift(partner);
      updateCachedUsers(updatedUsers);
      updateUsersList(updatedUsers);
    }

    // Envoyer le message via WebSocket
    window.websocket.send(
      JSON.stringify({
        type: "private_message",
        receiver_id: currentChatPartner.id,
        content: content,
        is_sent: true,
      })
    );

    // Afficher le message localement
    const newMessage = {
      sender_id: getCurrentUser().user_id,
      content: content,
      timestamp: Date.now(),
    };
    allLoadedMessages.push(newMessage);
    displayMessage(newMessage);

    input.value = "";

    // Rafraîchir la liste complète après un court délai
    setTimeout(() => loadAllUsers(), 300);
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
    if (chatDiv)
      chatDiv.innerHTML =
        '<div class="loading-indicator">Loading messages...</div>';
  } else if (!hasMoreMessages) {
    return;
  }

  isLoadingMessages = true;

  try {
    const pageSize = 10;
    const response = await fetch(
      `/messages?user_id=${userId}&page=${currentPage}&limit=${pageSize}`,
      {
        credentials: "include",
      }
    );
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
        data
          .sort((a, b) => {
            const timestampA = a.sent_at || a.timestamp;
            const timestampB = b.sent_at || b.timestamp;
            return new Date(timestampA) - new Date(timestampB);
          })
          .forEach((msg) => {
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
        chatDiv.innerHTML = "";
        data
          .sort((a, b) => {
            const timestampA = a.sent_at || a.timestamp;
            const timestampB = b.sent_at || b.timestamp;
            return new Date(timestampA) - new Date(timestampB);
          })
          .forEach((msg) => {
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
      chatDiv.innerHTML =
        '<div class="error-message">Error loading messages.</div>';
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

  // Marquer les notifications de cet utilisateur comme lues
  markAsRead(id);

  currentPage = 1;
  hasMoreMessages = true;
  isLoadingMessages = false;
  allLoadedMessages = []; // Réinitialiser les messages à l'ouverture d'un nouveau chat

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
  allLoadedMessages = []; // Réinitialiser les messages à la fermeture du chat
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

    messageInput.addEventListener("input", handleTyping);
    messageInput.addEventListener("keydown", handleTyping);
    messageInput.addEventListener("blur", () => {
      if (window.websocket && currentChatPartner) {
        window.websocket.send(
          JSON.stringify({
            type: "typing_stop",
            receiver_id: currentChatPartner.id,
          })
        );
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

export function handleTyping() {
  if (!currentChatPartner || !window.websocket) return;
  console.log("Sending typing_start to", currentChatPartner.id);

  // send typing start event to the server
  window.websocket.send(
    JSON.stringify({
      type: "typing_start",
      receiver_id: currentChatPartner.id,
    })
  );
}

// Show and hide the typing indicator
export function showTypingIndicator(show, username = "") {
  const indicator = document.getElementById("typing-indicator");
  if (!indicator) {
    console.error("Typing indicator element not found!");
    return;
  }

  // Check is HTML already exists and if not, create it (to have a smooth animation)
  if (!indicator.querySelector(".typing-message")) {
    indicator.innerHTML = `
      <div class="typing-message">
        <span class="typing-text"></span>
        <span class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </span>
      </div>
    `;
  }

  const typingText = indicator.querySelector(".typing-text");

  if (show && username) {
    typingText.textContent = `${username} is typing`;
    indicator.style.display = "block";
  } else {
    indicator.style.display = "none";
    typingText.textContent = "";
  }
}
