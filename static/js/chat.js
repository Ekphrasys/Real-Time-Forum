import { currentUser } from "./main.js";

export let currentChatPartner = null;
let showingOnlineUsers = true;

export function updateUsersList(users, onlineOnly = true) {
    const usersList = document.querySelector(".users-list");
    if (!usersList) return;

    usersList.innerHTML = '';

    const currentUserId = currentUser?.id;

    // Filter if necessary to display only online users
    const usersToDisplay = onlineOnly ? users.filter(user => user.is_online) : users;

    usersToDisplay.forEach(user => {
        const item = document.createElement("li");
        item.className = `user-item ${user.is_online ? 'online' : 'offline'}`;
        
        // Toujours stocker l'ID et le username, même pour les utilisateurs hors ligne
        item.dataset.userId = user.user_id;
        item.dataset.username = user.username;

        // Rendre tous les utilisateurs cliquables sauf l'utilisateur courant
        if (user.user_id !== currentUserId) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                openChat(user.user_id, user.username);
            });
        } else {
            item.classList.add('current-user');
        }

        const statusDiv = document.createElement("div");
        statusDiv.className = `user-status ${user.is_online ? 'online' : 'offline'}`;
        
        const nameDiv = document.createElement("div");
        nameDiv.className = "user-name";
        nameDiv.textContent = user.username;

        item.append(statusDiv, nameDiv);
        usersList.appendChild(item);
    });
}

export function sendMessage() {
    if (!currentChatPartner || !currentUser?.user_id) return;

    const input = document.getElementById("message-input");
    const content = input.value.trim();

    if (content) {
        window.websocket.send(JSON.stringify({
            type: "private_message",
            receiver_id: currentChatPartner.id,
            content: content
        }));

        // Utilisez user_id partout pour la cohérence
        displayMessage({
            sender_id: currentUser.user_id,
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
    const isSentByMe = msg.sender_id === currentUser.user_id;

    const messageElement = document.createElement("div");
    messageElement.className = isSentByMe ? "message sent" : "message received";

    // Add a data attribute with the sender ID for easier filtering
    messageElement.dataset.senderId = msg.sender_id;
    
    // Also add an attribute for the conversation
    if (currentChatPartner && currentChatPartner.id) {
        messageElement.dataset.conversationId = isSentByMe 
            ? `${currentUser.id}-${currentChatPartner.id}` 
            : `${msg.sender_id}-${currentUser.id}`;
    }

    // Display name (optional)
    const displayName = isSentByMe ? currentUser.username : currentChatPartner?.username || "Other user";

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
            document.getElementById("chat-messages").innerHTML = 
                '<div class="error-message">Invalid user ID</div>';
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
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = "Unable to load messages. Please try again.";
        document.getElementById("chat-messages").appendChild(errorDiv);
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
        chatModal.style.display = "none"; // Change here
    }
    currentChatPartner = null;
}

// Chat initialization
export function initChat() {
    // Improved click handling
    document.addEventListener('click', function (e) {
        const userItem = e.target.closest('.user-item');
        if (!userItem) return;

        // Retrieve directly from dataset (more reliable)
        const userId = userItem.dataset.userId;
        const username = userItem.dataset.username;

        if (!userId || !username) {
            console.error("Failed to retrieve user data from:", userItem);
            console.dir(userItem);
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

// Handle user status change
export function handleUserStatusChange(message) {
    if (!showingOnlineUsers) return;
    
    const usersList = document.querySelector(".users-list");
    if (!usersList) return;

    const userItems = usersList.querySelectorAll(".user-item");
    let userFound = false;

    userItems.forEach(item => {
        if (item.dataset.userId === message.user_id) {
            userFound = true;
            if (message.status === "online") {
                item.classList.add("online");
                item.querySelector('.user-status').className = 'user-status online';
            } else {
                item.classList.remove("online");
                item.querySelector('.user-status').className = 'user-status offline';
            }
        }
    });

    if (!userFound && message.status === "online" && showingOnlineUsers) {
        // Add the new online user
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
        usersList.appendChild(item);
    }
}