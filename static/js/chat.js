import { setCurrentUser, getCurrentUser } from "./main.js";

export let currentChatPartner = null;
let showingOnlineUsers = true;
let cachedOnlineUsers = [];
let pendingStatusUpdates = {}; // Store pending updates

export function setShowingOnlineUsers(value) {
    showingOnlineUsers = value;
}

export function getCachedOnlineUsers() {
    return cachedOnlineUsers;
}

export function updateCachedOnlineUsers(users) {
    console.log("Updating cached online users:", users);
    cachedOnlineUsers = users;
}

export function updateUsersList(users, onlineOnly = true) {
    console.log("Updating users list:", users);
    showingOnlineUsers = onlineOnly;

    const usersList = document.querySelector(".users-list");
    if (!usersList) {
        console.error("Users list element not found!");
        return;
    }

    usersList.innerHTML = '';
    const currentUserId = getCurrentUser()?.user_id;

    if (!users || !users.length) {
        usersList.innerHTML = `<div class="no-users">${onlineOnly ? "No users online" : "No users found"}</div>`;
        return;
    }

    // Use users array directly without deduplication
    users.forEach(user => {
        const isCurrentUser = user.user_id === currentUserId;
        const item = document.createElement("li");
        item.className = `user-item ${user.is_online ? 'online' : 'offline'} ${isCurrentUser ? 'current-user' : ''}`;
        item.dataset.userId = user.user_id; // Add user ID as data attribute
        item.dataset.username = user.username; // Add username as data attribute
        item.innerHTML = `
            <div class="user-status ${user.is_online ? 'online' : 'offline'}"></div>
            <div class="user-name">${user.username}${isCurrentUser ? ' (You)' : ''}</div>
        `;

        if (!isCurrentUser) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => openChat(user.user_id, user.username));
        }

        usersList.appendChild(item);
    });

    // Update cache if onlineOnly mode
    if (onlineOnly) {
        updateCachedOnlineUsers(users.filter(user => user.is_online));
    }
}

export function sendMessage() {
    if (!currentChatPartner || !getCurrentUser()?.user_id) return;

    const input = document.getElementById("message-input");
    const content = input.value.trim();

    if (content) {
        window.websocket.send(JSON.stringify({
            type: "private_message",
            receiver_id: currentChatPartner.id,
            content: content
        }));

        // Use user_id consistently
        displayMessage({
            sender_id: getCurrentUser().user_id,
            content: content,
            timestamp: Date.now()
        });

        input.value = "";
    }
}

// Function to display messages
export function displayMessage(msg) {
    const chatDiv = document.getElementById("chat-messages");
    if (!chatDiv) return;

    // Check if the message is sent or received
    const isSentByMe = String(msg.sender_id) === String(getCurrentUser()?.user_id);

    const messageElement = document.createElement("div");
    messageElement.className = isSentByMe ? "message sent" : "message received";

    // Add a data attribute with the sender ID for easier filtering
    messageElement.dataset.senderId = msg.sender_id;
    
    // Also add an attribute for the conversation
    if (currentChatPartner && currentChatPartner.id) {
        messageElement.dataset.conversationId = isSentByMe 
            ? `${getCurrentUser().user_id}-${currentChatPartner.id}` 
            : `${msg.sender_id}-${getCurrentUser().user_id}`;
    }

    // Display name (optional)
    const displayName = isSentByMe ? getCurrentUser().username : currentChatPartner?.username || "Other user";

    messageElement.innerHTML = `
          <div class="message-content">${msg.content}</div>
          <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      `;
    chatDiv.appendChild(messageElement);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Function to load message history
export async function loadMessageHistory(userId) {
    try {
        // Check that the ID exists
        if (!userId) {
            console.error("User ID is undefined or null");
            const chatDiv = document.getElementById("chat-messages");
            if (chatDiv) {
                chatDiv.innerHTML = '<div class="error-message">Invalid user ID</div>';
            }
            return;
        }
        
        const response = await fetch(`/messages?user_id=${userId}`, {
            credentials: 'include' // Important for cookies
        });

        if (!response.ok) {
            throw new Error("Failed to load messages");
        }

        const data = await response.json();
        const chatDiv = document.getElementById("chat-messages");

        if (!chatDiv) {
            console.error("Message container not found");
            return;
        }

        // Clear the container before adding new messages
        chatDiv.innerHTML = "";

        // Check if `data` is an array before using `forEach`
        if (Array.isArray(data) && data.length > 0) {
            data.forEach(msg => {
                displayMessage({
                    sender_id: msg.sender_id,
                    content: msg.content,
                    timestamp: new Date(msg.sent_at).getTime()
                });
            });
        } else {
            console.warn("No messages found or invalid format");
            // Display a message to the user
            const noMessages = document.createElement("div");
            noMessages.className = "no-messages";
            noMessages.textContent = "No messages. Start the conversation!";
            chatDiv.appendChild(noMessages);
        }
    } catch (error) {
        console.error("Error loading messages:", error);
        // Display the error to the user
        const chatDiv = document.getElementById("chat-messages");
        if (chatDiv) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "error-message";
            errorDiv.textContent = "Unable to load messages. Please try again.";
            chatDiv.appendChild(errorDiv);
        }
    }
}

export function openChat(userId, username) {
    // Check that the ID and username are defined
    if (!userId || !username) {
        console.error("Invalid userId or username:", { userId, username });
        return;
    }
    
    // Always ensure the ID is a string
    const id = String(userId);
    
    // Set the current chat partner
    currentChatPartner = { id: id, username: username };

    const chatModal = document.getElementById("chat-modal");
    const partnerName = document.getElementById("chat-partner-name");

    if (chatModal && partnerName) {
        partnerName.textContent = username;
        chatModal.style.display = "flex";
        
        // Load message history
        loadMessageHistory(id);
    } else {
        console.error("Chat modal elements not found!");
    }
}

// Function to close the chat
export function closeChat() {
    const chatModal = document.getElementById("chat-modal");
    if (chatModal) {
        chatModal.style.display = "none";
    }
    currentChatPartner = null;
}

// Chat initialization
export function initChat() {
    // Improved click handling
    document.addEventListener('click', function (e) {
        const userItem = e.target.closest('.user-item');
        if (!userItem) return;

        const userId = userItem.dataset.userId;
        const username = userItem.dataset.username;

        if (!userId || !username) {
            console.error("Failed to retrieve user data from:", userItem);
            return;
        }
        openChat(userId, username);
    });

    // Initialize chat elements
    const chatModal = document.getElementById('chat-modal');
    if (!chatModal) {
        console.error("Chat modal container not found!");
        return;
    }

    // Send message button
    const sendBtn = document.getElementById('send-message-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.error("Send message button not found");
    }

    // Message input field
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    } else {
        console.error("Message input field not found");
    }

    // Close button
    const closeBtn = document.querySelector('.close-chat');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeChat);
    }
}

// Handle user status change with improved reliability
export function handleUserStatusChange(message) {
    console.log("Handling user status change:", message);
    
    // Clear any pending updates for this user
    if (pendingStatusUpdates[message.user_id]) {
        clearTimeout(pendingStatusUpdates[message.user_id]);
        delete pendingStatusUpdates[message.user_id];
    }
    
    // Schedule the update with a short delay to ensure proper UI rendering
    pendingStatusUpdates[message.user_id] = setTimeout(() => {
        processUserStatusUpdate(message);
        delete pendingStatusUpdates[message.user_id];
    }, 100); // Short delay to ensure DOM operations complete
}

// Process the actual user status update
function processUserStatusUpdate(message) {
    const usersList = document.querySelector(".users-list");
    if (!usersList) {
        console.error("Users list not found during status update!");
        return;
    }
    
    // Update the cached online users
    if (message.status === "online") {
        // Add or update user in cache
        const newCachedUsers = [...cachedOnlineUsers];
        const existingIndex = newCachedUsers.findIndex(u => u.user_id === message.user_id);
        
        if (existingIndex === -1) {
            newCachedUsers.push({
                user_id: message.user_id,
                username: message.username,
                is_online: true
            });
        } else {
            newCachedUsers[existingIndex].is_online = true;
        }
        updateCachedOnlineUsers(newCachedUsers);
    } else if (message.status === "offline") {
        // Remove user from cache
        updateCachedOnlineUsers(cachedOnlineUsers.filter(u => u.user_id !== message.user_id));
    }
    
    // User is coming online
    if (message.status === "online") {
        // Check if user is already in the list
        const existingUser = usersList.querySelector(`[data-user-id="${message.user_id}"]`);
        
        if (!existingUser) {
            // Only add new users to list if we're showing online users
            if (showingOnlineUsers) {
                // Add the new user
                const item = document.createElement("li");
                item.className = "user-item online";
                item.dataset.userId = message.user_id;
                item.dataset.username = message.username;
    
                const statusDiv = document.createElement("div");
                statusDiv.className = "user-status online";
                
                const nameDiv = document.createElement("div");
                nameDiv.className = "user-name";
                nameDiv.textContent = message.username;
    
                item.appendChild(statusDiv);
                item.appendChild(nameDiv);
                
                // Make clickable only if not the current user
                if (String(message.user_id) !== String(getCurrentUser()?.user_id)) {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', () => {
                        openChat(message.user_id, message.username);
                    });
                } else {
                    item.classList.add('current-user');
                    nameDiv.textContent += " (You)";
                }
    
                usersList.appendChild(item);
    
                // Remove "No users online" message if it exists
                const noUsersMsg = usersList.querySelector(".no-users");
                if (noUsersMsg) {
                    noUsersMsg.remove();
                }
            }
        } else {
            // Update status if user already exists
            existingUser.classList.remove("offline");
            existingUser.classList.add("online");
            const statusElement = existingUser.querySelector('.user-status');
            if (statusElement) {
                statusElement.className = 'user-status online';
            }
        }
    } 
    // User is going offline
    else if (message.status === "offline") {
        const userItem = usersList.querySelector(`[data-user-id="${message.user_id}"]`);
        
        if (userItem) {
            if (showingOnlineUsers) {
                // In online-only view, remove offline users with animation
                userItem.style.transition = "opacity 0.5s";
                userItem.style.opacity = "0";
                
                // Remove element after animation completes
                setTimeout(() => {
                    userItem.remove();
                    
                    // Check if there are any remaining online users
                    const remainingUsers = usersList.querySelectorAll(".user-item");
                    if (remainingUsers.length === 0) {
                        const noUsersMsg = document.createElement("div");
                        noUsersMsg.className = "no-users";
                        noUsersMsg.textContent = "No users online";
                        usersList.appendChild(noUsersMsg);
                    }
                }, 500);
            } else {
                // In all-users view, just update status
                userItem.classList.remove("online");
                userItem.classList.add("offline");
                const statusElement = userItem.querySelector('.user-status');
                if (statusElement) {
                    statusElement.className = 'user-status offline';
                }
            }
        }
    }
    
    // Request fresh list of online users to ensure we're in sync
    if (window.websocket && showingOnlineUsers) {
        setTimeout(() => {
            window.websocket.send(JSON.stringify({
                type: "get_online_users"
            }));
        }, 300); // Delay to allow server to process the status change
    }
}