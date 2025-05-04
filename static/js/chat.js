let currentChatPartner = null;

// Modifiez la fonction updateOnlineUsersList pour rendre les utilisateurs cliquables
export function updateOnlineUsersList(users) {
    const usersList = document.querySelector(".users-list");
    if (!usersList) {
        console.error("Users list element not found!");
        return;
    }

    // Nettoyage complet de la liste
    usersList.innerHTML = '';

    // Filtrage des utilisateurs
    const otherUsers = users.filter(user => user.id !== currentUser?.id);

    if (otherUsers.length === 0) {
        const item = document.createElement("li");
        item.className = "user-item";
        item.textContent = "No other users online";
        usersList.appendChild(item);
        return;
    }

    // Création des éléments utilisateur
    otherUsers.forEach(user => {
        const item = document.createElement("li");
        item.className = "user-item online";

        // Méthode 1: Attributs data-*
        item.setAttribute('data-user-id', user.id);
        item.setAttribute('data-username', user.username);

        // Méthode 2: Propriété dataset
        item.dataset.userId = user.id;
        item.dataset.username = user.username;

        // Méthode 3: Stockage direct
        item.userData = user;

        // Création du contenu
        const nameDiv = document.createElement("div");
        nameDiv.className = "user-name";
        nameDiv.textContent = user.username;

        item.appendChild(nameDiv);
        usersList.appendChild(item);

        // Vérification immédiate
        console.log(`User item created:`, {
            element: item,
            dataset: item.dataset,
            attributes: {
                id: item.getAttribute('data-user-id'),
                username: item.getAttribute('data-username')
            },
            userData: item.userData
        });
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
    console.trace(); // Affiche la pile d'appels

    currentChatPartner = { id: userId, username };

    const chatModal = document.getElementById("chat-modal");
    const partnerName = document.getElementById("chat-partner-name");

    console.log("Modal element:", chatModal);
    console.log("Partner name element:", partnerName);

    if (!chatModal || !partnerName) {
        console.error("Chat elements not found!");
        return;
    }

    partnerName.textContent = username;
    chatModal.style.display = "flex";
    console.log("Chat modal should be visible now");

    // Charger l'historique
    loadMessageHistory(userId);
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
        const userItem = e.target.closest('.user-item.online');
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
    const usersList = document.querySelector(".users-list");
    if (!usersList) return;
  
    // Check if user already in list
    const existingUser = Array.from(
      usersList.querySelectorAll(".user-item")
    ).find((item) => item.textContent === message.username);
  
    if (message.status === "online") {
      // Add user if not already in list
      if (!existingUser) {
        const listItem = document.createElement("li");
        listItem.className = "user-item online";
        listItem.textContent = message.username;
        usersList.appendChild(listItem);
      } else {
        existingUser.classList.add("online");
      }
    } else if (message.status === "offline") {
      // Remove online class if user exists
      if (existingUser) {
        existingUser.classList.remove("online");
      }
    }
  }