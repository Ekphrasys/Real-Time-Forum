let currentChatPartner = null;
let showingOnlineUsers = true;

export function updateUsersList(users, onlineOnly = true) {
    const usersList = document.querySelector(".users-list");
    if (!usersList) return;

    usersList.innerHTML = '';

    const currentUserId = currentUser?.id;

    users.forEach(user => {
        const item = document.createElement("li");
        // On garde la classe online/offline pour le style visuel
        item.className = `user-item ${user.is_online ? 'online' : 'offline'}`;
        item.dataset.userId = user.id;
        item.dataset.username = user.username;

        // Rendre cliquable tous les utilisateurs sauf l'actuel
        if (user.id !== currentUserId) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                console.log("Opening chat with:", user.id, user.username);
                openChat(user.id, user.username);
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
    if (!currentChatPartner) return;

    const input = document.getElementById("message-input");
    const content = input.value.trim();

    if (content) {
        window.websocket.send(JSON.stringify({
            type: "private_message",
            receiver_id: currentChatPartner.id,
            content: content
        }));

        // Afficher le message immédiatement
        displayMessage({
            sender_id: currentUser.id,
            content: content,
            timestamp: Date.now()
        });

        input.value = "";
    }
}

// Fonction pour afficher les messages
export function displayMessage(msg) {
    const chatDiv = document.getElementById("chat-messages");
    if (!chatDiv) return;

    // Check if the message is sent or received
    const isSentByMe = msg.sender_id === currentUser.id;

    const messageElement = document.createElement("div");
    messageElement.className = isSentByMe ? "message sent" : "message received";

    // Nom à afficher (optionnel)
    const displayName = isSentByMe ? currentUser.username : currentChatPartner?.username || "Other user";

    messageElement.innerHTML = `
          <div class="message-content">${msg.content}</div>
          <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</div>
      `;
    chatDiv.appendChild(messageElement);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

// Fonction pour charger l'historique
export async function loadMessageHistory(userId) {
    try {
        const response = await fetch(`/messages?user_id=${userId}`, {
            credentials: 'include' // Important pour les cookies
        });

        if (!response.ok) {
            throw new Error("Échec du chargement des messages");
        }

        const data = await response.json();
        const chatDiv = document.getElementById("chat-messages");

        if (!chatDiv) {
            console.error("Conteneur des messages introuvable");
            return;
        }

        chatDiv.innerHTML = "";

        // Vérifie si `data` est un tableau avant d'utiliser `forEach`
        if (Array.isArray(data)) {
            data.forEach(msg => {
                displayMessage({
                    sender_id: msg.sender_id,
                    content: msg.content,
                    timestamp: new Date(msg.sent_at).getTime()
                });
            });
        } else {
            console.warn("Aucun message trouvé ou format invalide");
            // Affiche un message à l'utilisateur
            const noMessages = document.createElement("div");
            noMessages.className = "no-messages";
            noMessages.textContent = "Aucun message. Commencez la conversation !";
            chatDiv.appendChild(noMessages);
        }
    } catch (error) {
        console.error("Erreur lors du chargement des messages :", error);
        // Affiche l'erreur à l'utilisateur
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = "Impossible de charger les messages. Réessayez.";
        document.getElementById("chat-messages").appendChild(errorDiv);
    }
}


export function openChat(userId, username) {
    console.log("Opening chat with:", userId, username);
    currentChatPartner = { id: userId, username };

    const chatModal = document.getElementById("chat-modal");
    const partnerName = document.getElementById("chat-partner-name");

    if (chatModal && partnerName) {
        partnerName.textContent = username;
        chatModal.style.display = "flex";
        loadMessageHistory(userId);
    } else {
        console.error("Chat modal elements not found!");
    }
}

// Fonction pour fermer le chat
export function closeChat() {
    const chatModal = document.getElementById("chat-modal");
    if (chatModal) {
        chatModal.style.display = "none"; // Changement ici
    }
    currentChatPartner = null;
}

// Initialisation du chat
export function initChat() {
    console.log("Initializing chat system...");

    // Gestion améliorée des clics
    document.addEventListener('click', function (e) {
        const userItem = e.target.closest('.user-item');
    if (!userItem) return;

        // Essai progressif pour récupérer les données
        let userId, username;

        // Essai 1: Propriété userData
        if (userItem.userData) {
            userId = userItem.userData.id;
            username = userItem.userData.username;
        }

        // Essai 2: Dataset
        if ((!userId || !username) && userItem.dataset) {
            userId = userItem.dataset.userId;
            username = userItem.dataset.username;
        }

        // Essai 3: Attributs HTML
        if ((!userId || !username)) {
            userId = userItem.getAttribute('data-user-id');
            username = userItem.getAttribute('data-username');
        }

        // Essai 4: TextContent comme dernier recours
        if ((!userId || !username)) {
            const nameDiv = userItem.querySelector('.user-name');
            if (nameDiv) {
                username = nameDiv.textContent;
                // On ne peut pas récupérer l'ID dans ce cas
            }
        }

        if (!userId || !username) {
            console.error("Failed to retrieve user data from:", userItem);
            console.dir(userItem); // Inspection complète de l'élément
            return;
        }

        console.log(`Opening chat with ${username} (${userId})`);
        openChat(userId, username);
    });

    // Initialisation des éléments du chat
    const chatModal = document.getElementById('chat-modal');
    if (!chatModal) {
        console.error("Chat modal container not found!");
        return;
    }

    // Bouton d'envoi de message
    const sendBtn = document.getElementById('send-message-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.error("Send message button not found");
    }

    // Champ de saisie de message
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

    // Bouton de fermeture (alternative si le gestionnaire de document.click ne marche pas)
    const closeBtn = document.querySelector('.close-chat');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeChat);
    }

    // Vérification finale
    console.log("Chat system initialized with:", {
        modal: chatModal,
        sendBtn: sendBtn,
        input: messageInput,
        closeBtn: closeBtn
    });
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
        // Ajouter le nouvel utilisateur en ligne
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