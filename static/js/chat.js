import { setCurrentUser, getCurrentUser } from "./main.js";

export let currentChatPartner = null;
let showingOnlineUsers = true;
let cachedOnlineUsers = [];

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
    console.log("Updating users list - raw data:", users);
    showingOnlineUsers = onlineOnly;

    const usersList = document.querySelector(".users-list");
    if (!usersList) {
        console.error("Users list container not found");
        return;
    }

    usersList.innerHTML = '';

    const currentUserId = getCurrentUser()?.user_id ? String(getCurrentUser().user_id) : null;

    if (!Array.isArray(users)) {
        console.error("Invalid users data format:", users);
        return;
    }

    // Utiliser un Map pour dédupliquer efficacement
    const uniqueUsersMap = new Map();
    users.forEach(user => {
        // Si l'utilisateur existe déjà, ne le remplacer que s'il est en ligne
        const existingUser = uniqueUsersMap.get(user.user_id);
        if (!existingUser || user.is_online) {
            uniqueUsersMap.set(user.user_id, user);
        }
    });

    // Convertir le Map en array
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    // Si nous sommes en mode "online only", mettre à jour le cache
    if (onlineOnly) {
        updateCachedOnlineUsers(uniqueUsers.filter(user => user.is_online));
    }

    const usersToDisplay = onlineOnly 
        ? getCachedOnlineUsers()
        : uniqueUsers;

    console.log("Users to display after filtering:", usersToDisplay);

    if (usersToDisplay.length === 0) {
        const noUsersMsg = document.createElement("div");
        noUsersMsg.className = "no-users";
        noUsersMsg.textContent = onlineOnly ? "No users online" : "No users found";
        usersList.appendChild(noUsersMsg);
        return;
    }

    usersToDisplay.forEach(user => {
        const isCurrentUser = String(user.user_id) === currentUserId;
        const item = document.createElement("li");
        item.className = `user-item ${user.is_online ? 'online' : 'offline'} ${isCurrentUser ? 'current-user' : ''}`;
        item.dataset.userId = String(user.user_id);
        item.dataset.username = user.username;

        // Rendre tous les utilisateurs cliquables sauf soi-même
        if (!isCurrentUser) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                openChat(user.user_id, user.username);
            });
        }

        const statusDiv = document.createElement("div");
        statusDiv.className = `user-status ${user.is_online ? 'online' : 'offline'}`;
        
        const nameDiv = document.createElement("div");
        nameDiv.className = "user-name";
        nameDiv.textContent = user.username + (isCurrentUser ? " (You)" : "");

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
    const isSentByMe = String(msg.sender_id) === String(getCurrentUser()?.user_id);

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
    console.log("Handling user status change:", message);
    const usersList = document.querySelector(".users-list");
    if (!usersList) return;

    // Mettre à jour le cache en fonction du statut
    if (message.status === "online") {
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
        updateCachedOnlineUsers(cachedOnlineUsers.filter(u => u.user_id !== message.user_id));
    }

    // Si c'est une nouvelle connexion
    if (message.status === "online") {
        // Vérifier si l'utilisateur est déjà dans la liste
        const existingUser = usersList.querySelector(`[data-user-id="${message.user_id}"]`);
        
        if (!existingUser) {
            // Ajouter le nouvel utilisateur
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
            
            // Rendre cliquable seulement si ce n'est pas l'utilisateur courant
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

            // Supprimer le message "No users online" s'il existe
            const noUsersMsg = usersList.querySelector(".no-users");
            if (noUsersMsg) {
                noUsersMsg.remove();
            }
        } else {
            // Mettre à jour le statut si l'utilisateur existe déjà
            existingUser.classList.remove("offline");
            existingUser.classList.add("online");
            existingUser.querySelector('.user-status').className = 'user-status online';
        }
    } 
    // Gestion des déconnexions
    else if (message.status === "offline") {
        const userItem = usersList.querySelector(`[data-user-id="${message.user_id}"]`);
        if (userItem) {
            if (showingOnlineUsers) {
                userItem.remove();
            } else {
                userItem.classList.remove("online");
                userItem.classList.add("offline");
                userItem.querySelector('.user-status').className = 'user-status offline';
            }
        }

        // Vérifier s'il reste des utilisateurs en ligne
        const onlineUsers = usersList.querySelectorAll(".user-item.online");
        if (onlineUsers.length === 0) {
            const noUsersMsg = document.createElement("div");
            noUsersMsg.className = "no-users";
            noUsersMsg.textContent = showingOnlineUsers ? "No users online" : "No users found";
            usersList.appendChild(noUsersMsg);
        }
    }
}