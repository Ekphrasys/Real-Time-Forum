export let cachedUsers = []; // Changement: nous stockons tous les utilisateurs, pas seulement ceux en ligne
let pendingStatusUpdates = {};

let _currentUser = null;
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (user) => {
  console.log("Setting current user to:", user);
  _currentUser = user;
};

export function loadAllUsers() {
  fetch("/users/ordered-by-last-message", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  })
    .then((response) => response.json())
    .then((users) => {
      // Pour chaque utilisateur, vérifier s'il est en ligne en comparant avec les utilisateurs en ligne
      fetch("/online-users", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      })
        .then((response) => response.json())
        .then((onlineUsers) => {
          // Créer un Set des IDs des utilisateurs en ligne pour une recherche efficace
          const onlineUserIds = new Set(onlineUsers.map((u) => u.user_id));

          // Mettre à jour le statut en ligne de chaque utilisateur
          const combinedUsers = users.map((user) => ({
            ...user,
            is_online: onlineUserIds.has(user.user_id),
            has_messages: user.last_message_content !== "",
          }));

          updateUsersList(combinedUsers);
        })
        .catch((error) => {
          console.error("Error fetching online users:", error);
          // En cas d'erreur, afficher quand même tous les utilisateurs
          updateUsersList(
            users.map((user) => ({
              ...user,
              is_online: false,
            }))
          );
        });
    })
    .catch((error) => console.error("Error fetching users:", error));
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
    const lastMessageInfo = user.last_message_content;

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

export function getCachedUsers() {
  return cachedUsers;
}

export function updateCachedUsers(users) {
  cachedUsers = users;
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