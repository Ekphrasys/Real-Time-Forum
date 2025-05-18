import { setCurrentUser, getCurrentUser } from "./main.js";

export let currentChatPartner = null;
let showingOnlineUsers = true;
let cachedOnlineUsers = [];
let pendingStatusUpdates = {}; // Store pending updates

let currentPage = 1;
let isLoadingMessages = false;
let hasMoreMessages = true;
let lastMessageTimestamp = null; // Pour garder une trace du dernier message chargé

export function setShowingOnlineUsers(value) {
    showingOnlineUsers = value;
}

export function getCachedOnlineUsers() {
    return cachedOnlineUsers;
}

export function updateCachedOnlineUsers(users) {
    cachedOnlineUsers = users;
}

export function updateUsersList(users, onlineOnly = true) {
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
export async function loadMessageHistory(userId, loadMore = false) {
    // Avoid duplicate requests
    if (isLoadingMessages) {
        console.log("A loading request is already in progress...");
        return;
    }
    
    // If starting a new conversation (not loading more messages)
    if (!loadMore) {
        currentPage = 1;
        hasMoreMessages = true;
        const chatDiv = document.getElementById("chat-messages");
        if (chatDiv) {
            chatDiv.innerHTML = '<div class="loading-indicator">Loading messages...</div>';
        }
    } 
    // If requesting more messages but there are none left
    else if (!hasMoreMessages) {
        console.log("No additional messages to load.");
        return;
    }

    console.log(`Loading messages: page ${currentPage}, loadMore=${loadMore}`);
    isLoadingMessages = true;
    
    try {
        // Use a standard page size for consistent pagination
        const pageSize = 10;
        
        // Add pagination parameters
        const response = await fetch(`/messages?user_id=${userId}&page=${currentPage}&limit=${pageSize}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to load messages: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Received ${data.length} messages from API`);
        
        const chatDiv = document.getElementById("chat-messages");
        if (!chatDiv) {
            console.error("Message container not found");
            return;
        }

        // Remove loading indicator if present
        const loadingIndicator = chatDiv.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Clear only if it's the first load
        if (!loadMore) {
            chatDiv.innerHTML = "";
        }

        if (Array.isArray(data) && data.length > 0) {
            // Store current scroll position and height
            const scrollPosition = chatDiv.scrollTop;
            const oldScrollHeight = chatDiv.scrollHeight;

            // Add new messages at the top in the correct order (newest at bottom)
            const fragment = document.createDocumentFragment();
            
            // Reverse the list to display oldest at top
            data.reverse().forEach(msg => {
                const messageElement = createMessageElement(msg);
                fragment.appendChild(messageElement); // Insert at end for proper order
            });

            // Insert at the beginning for loading more messages
            if (loadMore) {
                chatDiv.insertBefore(fragment, chatDiv.firstChild);
            } else {
                chatDiv.appendChild(fragment);
            }

            // Adjust scroll position after adding new content
            if (loadMore) {
                // When loading older messages (scrolling up), maintain the same view
                const newScrollHeight = chatDiv.scrollHeight;
                chatDiv.scrollTop = newScrollHeight - oldScrollHeight + scrollPosition;
            } else {
                // When loading first page, scroll to bottom
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }

            // KEY CHANGE: Check the content length against expected page size
            // If we got exactly the page size we requested, there might be more
            hasMoreMessages = data.length >= pageSize;
            
            // Only increment the page if we're going to request more
            if (hasMoreMessages) {
                currentPage++;
            }
            
            console.log(`Update: page=${currentPage}, hasMoreMessages=${hasMoreMessages}, data.length=${data.length}, pageSize=${pageSize}`);
        } else {
            if (!loadMore) {
                chatDiv.innerHTML = '<div class="no-messages">No messages. Start the conversation!</div>';
            }
            hasMoreMessages = false;
        }
    } catch (error) {
        console.error("Error loading messages:", error);
        const chatDiv = document.getElementById("chat-messages");
        if (chatDiv && chatDiv.querySelector('.loading-indicator')) {
            chatDiv.innerHTML = '<div class="error-message">Failed to load messages. Please try again.</div>';
        }
    } finally {
        isLoadingMessages = false;
    }
}

function isScrolledToBottom(element) {
    return element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
}

function isScrolledNearTop(element) {
    return element.scrollTop < 100;
}

function createMessageElement(msg) {
    const isSentByMe = String(msg.sender_id) === String(getCurrentUser()?.user_id);
    const messageElement = document.createElement("div");
    messageElement.className = isSentByMe ? "message sent" : "message received";
    messageElement.dataset.senderId = msg.sender_id;
    messageElement.dataset.messageId = msg.id; // Ajout d'un identifiant unique pour le message
    
    if (currentChatPartner && currentChatPartner.id) {
        messageElement.dataset.conversationId = isSentByMe 
            ? `${getCurrentUser().user_id}-${currentChatPartner.id}` 
            : `${msg.sender_id}-${getCurrentUser().user_id}`;
    }

    // Format the timestamp
    let timeString;
    try {
        // Timestamp could be a unix timestamp (number) or a date string
        const timestamp = typeof msg.sent_at === 'string' ? msg.sent_at : (msg.timestamp || new Date());
        timeString = new Date(timestamp).toLocaleTimeString();
    } catch (e) {
        console.error("Error formatting timestamp:", e);
        timeString = "Unknown time";
    }

    messageElement.innerHTML = `
        <div class="message-content">${msg.content}</div>
        <div class="message-time">${timeString}</div>
    `;
    return messageElement;
}

export function openChat(userId, username) {
    // Check that the ID and username are defined
    if (!userId || !username) {
        console.error("Invalid userId or username:", { userId, username });
        return;
    }
    
    // Always ensure the ID is a string
    const id = String(userId);
    
    // Reset pagination state
    currentPage = 1;
    hasMoreMessages = true;
    isLoadingMessages = false;
    
    // Set the current chat partner
    currentChatPartner = { id: id, username: username };

    const chatModal = document.getElementById("chat-modal");
    const partnerName = document.getElementById("chat-partner-name");

    if (chatModal && partnerName) {
        partnerName.textContent = username;
        chatModal.style.display = "flex";
        
        // Load message history
        loadMessageHistory(id);
        
        // Focus sur le champ de saisie
        setTimeout(() => {
            const inputField = document.getElementById("message-input");
            if (inputField) inputField.focus();
        }, 300);
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
    
    // Reset pagination state
    currentPage = 1;
    hasMoreMessages = true;
    isLoadingMessages = false;
}

function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

// Fonction pour le chargement lors du défilement
function handleScrollForLoading() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // Si proche du haut, charger plus de messages
    if (isScrolledNearTop(chatMessages) && !isLoadingMessages && hasMoreMessages && currentChatPartner) {
        console.log("Défilement détecté près du haut - chargement de plus de messages");
        loadMessageHistory(currentChatPartner.id, true);
    }
}

// Chat initialization
export function initChat() {
    console.log("Initializing chat...");
    
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

    // Configuration de l'événement de défilement pour le chargement
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        console.log("Adding scroll event listener to chat messages container");
        
        // Nettoyer l'écouteur précédent si présent
        chatMessages.removeEventListener('scroll', handleScrollForLoading);
        
        // Ajouter le nouvel écouteur avec throttle
        const throttledScrollHandler = throttle(handleScrollForLoading, 300);
        chatMessages.addEventListener('scroll', throttledScrollHandler); 
        
        // Log pour debug
        chatMessages.addEventListener('scroll', () => {
            console.log(`ScrollTop: ${chatMessages.scrollTop}, ScrollHeight: ${chatMessages.scrollHeight}, ClientHeight: ${chatMessages.clientHeight}`);
        });
    } else {
        console.error("Chat messages container not found");
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