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

// Send private message, update UI immediately, and sync with server via WebSocket
export function sendMessage() {
  if (!currentChatPartner || !getCurrentUser()?.user_id) return;

  const input = document.getElementById("message-input");
  const content = input.value.trim();

  if (content) {
    // Update cached users immediately without waiting for server response
    const updatedUsers = [...cachedUsers];
    // search for the chat partner in the list
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

    // Send the message to sever via WebSocket
    window.websocket.send(
      JSON.stringify({
        type: "private_message",
        receiver_id: currentChatPartner.id,
        content: content,
        is_sent: true,
      })
    );

    // Display the message immediately in the chat
    const newMessage = {
      sender_id: getCurrentUser().user_id,
      content: content,
      timestamp: Date.now(),
    };
    allLoadedMessages.push(newMessage);
    displayMessage(newMessage);

    input.value = "";

    // Refresh the users list to sync with the server
    setTimeout(() => loadAllUsers(), 300);
  }
}

export function displayMessage(msg) {
  const chatDiv = document.getElementById("chat-messages");
  if (!chatDiv) return;

  // Determine if the message is sent by the current user
  const isSentByMe =
    String(msg.sender_id) === String(getCurrentUser()?.user_id);

  // Create a new message element
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

   // Retrieve the sender's name
  let senderName = "Unknown";
  if (msg.sender) {
    senderName = msg.sender.username || "Unknown";
  } else if (isSentByMe) {
    const currentUser = getCurrentUser();
    senderName = currentUser?.username || "You";
  } else {
    // Checks in the cached users list to find the sender's name
    const sender = cachedUsers.find(u => String(u.user_id) === String(msg.sender_id));
    senderName = sender?.username || currentChatPartner?.username || "Unknown";
  }

  messageElement.innerHTML = `
  <div class="message-content">${msg.content}</div>
        <div class="message-footer">
          <span class="message-sender">${senderName}</span>
          <span class="message-time">${formattedDateTime}</span>
        </div>
    `;
  chatDiv.appendChild(messageElement);
  chatDiv.scrollTop = chatDiv.scrollHeight;
}


// Load message history, firstly 10 messages, then load more on scroll
export async function loadMessageHistory(userId, loadMore = false) {
  if (isLoadingMessages) return; // prevent multiple simultaneous loads

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

  // Request messages to the server by pages
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

    // Delete the loading indicator if it exists on the first load
    const loadingIndicator = chatDiv.querySelector(".loading-indicator");
    if (loadingIndicator && !loadMore) loadingIndicator.remove();

    // Check is server returned any messages
    if (Array.isArray(data) && data.length > 0) {
      // Save the scroll height before adding new messages
      const oldScrollHeight = chatDiv.scrollHeight;

      if (loadMore) {
        // PROGRESSIVE LOADING
        allLoadedMessages = [...data, ...allLoadedMessages];

        // Insert new messages at the top of the chat
        const fragment = document.createDocumentFragment();
        // Sort messages by timestamp before inserting
        data
          .sort((a, b) => {
            const timestampA = a.sent_at || a.timestamp;
            const timestampB = b.sent_at || b.timestamp;
            return new Date(timestampA) - new Date(timestampB);
          })
          .forEach((msg) => {
            fragment.appendChild(createMessageElement(msg));
          });

        // Insert the new messages at the top of the chat
        if (chatDiv.firstChild) {
          chatDiv.insertBefore(fragment, chatDiv.firstChild);
        } else {
          chatDiv.appendChild(fragment);
        }

        // Maintain scroll position
        chatDiv.scrollTop = chatDiv.scrollHeight - oldScrollHeight;
      } else {
        // FIRST LOAD (loadMore is false)
        allLoadedMessages = [...data];

        // Empty the chat and add all messages
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

        // After loading all messages, scroll to the bottom so the user sees the latest messages
        chatDiv.scrollTop = chatDiv.scrollHeight;
      }

      currentPage++;
      hasMoreMessages = data.length === pageSize;
    } else {
      hasMoreMessages = false; // if server returned no messages, we indicate that there are no more messages to load
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

    // Récupérer le nom de l'expéditeur
  let senderName = "Unknown";
  if (msg.sender) {
    // Si l'objet sender est inclus dans le message
    senderName = msg.sender.username || "Unknown";
  } else if (isSentByMe) {
    // Si c'est l'utilisateur actuel
    const currentUser = getCurrentUser();
    senderName = currentUser?.username || "You";
  } else {
    // Chercher dans les utilisateurs en cache
    const sender = cachedUsers.find(u => String(u.user_id) === String(msg.sender_id));
    senderName = sender?.username || currentChatPartner?.username || "Unknown";
  }


  messageElement.innerHTML = `
  <div class="message-content">${msg.content}</div>
        <div class="message-footer">
          <span class="message-sender">${senderName}</span>
          <span class="message-time">${timeString}</span>
        </div>
    `;


  return messageElement;
}

export function openChat(userId, username) {
  if (!userId || !username) return;

  const id = String(userId);

  // Marks messages as read when opening a chat
  markAsRead(id);

  currentPage = 1; // reset the chat page each time a new chat is opened
  hasMoreMessages = true;
  isLoadingMessages = false;
  allLoadedMessages = []; // Empty the loaded messages when opening a new chat

  currentChatPartner = { id: id, username: username };

  const chatModal = document.getElementById("chat-modal");
  const partnerName = document.getElementById("chat-partner-name");

  if (chatModal && partnerName) {
    partnerName.textContent = username;
    chatModal.style.display = "flex";

    loadMessageHistory(id); // Load the message history for the chat partner

    // Automaticaly put the cursor in the input field
    setTimeout(() => {
      const inputField = document.getElementById("message-input");
      if (inputField) inputField.focus();
    }, 300);
  }
}

// Close the chat modal and reset the chat state
export function closeChat() {
  const chatModal = document.getElementById("chat-modal");
  if (chatModal) {
    chatModal.style.display = "none";
  }
  currentChatPartner = null;

  currentPage = 1;
  hasMoreMessages = true; // Potentially more messages
  isLoadingMessages = false;
  allLoadedMessages = [];
}

// Throttle function to limit the rate of function calls
function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;

    // If the function is called for the first time or after the limit, call it and notify the last run time
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      // Cancel the previous timeout if it exists
      clearTimeout(lastFunc);
      // Set a new timeout to call the function after the limit
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan)); // calculate remaining time until recall the func
    }
  };
}

function handleScrollForLoading() {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages || isLoadingMessages || !hasMoreMessages) return;

  // Scroll chat at 50px from the top
  if (chatMessages.scrollTop < 50) {
    loadMessageHistory(currentChatPartner.id, true);
  }
}

// Initialize chat event listeners and handlers
export function initChat() {
  // Open chat when clicking on a user in the users list
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

  // Send message when click button
  const sendBtn = document.getElementById("send-message-btn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  // Send message when pressing Enter
  const messageInput = document.getElementById("message-input");
  if (messageInput) {
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendMessage();
      }
    });

    messageInput.addEventListener("input", handleTyping);
    messageInput.addEventListener("keydown", handleTyping);
    // Stop typing indicator when we stop typing
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

  // Close chat when clicking on the x
  const closeBtn = document.querySelector(".close-chat");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeChat);
  }

  // Load more messages on scroll with throttle
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    const throttledScrollHandler = throttle(handleScrollForLoading, 300);
    chatMessages.addEventListener("scroll", throttledScrollHandler);
  }
}

export function handleTyping() {
  if (!currentChatPartner || !window.websocket) return;

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
