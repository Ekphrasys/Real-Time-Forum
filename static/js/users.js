export let cachedUsers = []; // Contain all users known to the app
let pendingStatusUpdates = {}; // object to hold timeouts for pending user status updates

let _currentUser = null;
// function to get the current user
export const getCurrentUser = () => _currentUser;
// function to define the current user
export const setCurrentUser = (user) => {
  console.log("Setting current user to:", user);
  _currentUser = user;
};

// Load users and synchonize with online/offline status
export function loadAllUsers() {
  // Get all users ordered by last message
  fetch("/users/ordered-by-last-message", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  })
    .then((response) => response.json())
    .then((users) => {
      // get online users
      fetch("/online-users", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      })
        .then((response) => response.json())
        .then((onlineUsers) => {
          // Create a Set of online user IDs for quick lookup
          const onlineUserIds = new Set(onlineUsers.map((u) => u.user_id));

          // Update online status and last message for each user
          const combinedUsers = users.map((user) => ({
            ...user,
            is_online: onlineUserIds.has(user.user_id), // We had the is_online bool status
            has_messages: user.last_message_content !== "", // We add a has_messages bool status
          }));

          updateUsersList(combinedUsers);
        })
        .catch((error) => {
          console.error("Error fetching online users:", error);
          // In case of error, we assume all users are offline but display them anyway
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

// Display the users in the users list
export function updateUsersList(users) {
  const usersList = document.querySelector(".users-list");
  if (!usersList) return;

  usersList.innerHTML = "";
  const currentUserId = getCurrentUser()?.user_id;

  // For each user, create a list item
  users.forEach((user) => {
    const isCurrentUser = user.user_id === currentUserId;
    const item = document.createElement("li");
    item.className = `user-item ${isCurrentUser ? "current-user" : ""}`;
    item.dataset.userId = user.user_id;
    item.dataset.username = user.username;

    // Fill the HTML with the status and the username
    item.innerHTML = `
      <div class="user-status ${user.is_online ? "online" : "offline"}"></div>
      <div class="user-info">
        <div class="user-name">${user.username}</div>
      </div>
    `;
    usersList.appendChild(item);
  });
  // Update the cached users
  updateCachedUsers(users);
}

// return the cached users list, allow other modules to access it qucikly
export function getCachedUsers() {
  return cachedUsers;
}

// Update the global variable cachedUsers with a new list
export function updateCachedUsers(users) {
  cachedUsers = users;
}

// Timeout to avoid multiple updates for the same user in a short time, so it displays only the last change
export function handleUserStatusChange(message) {
  pendingStatusUpdates[message.user_id] = setTimeout(() => {
    processUserStatusUpdate(message);
    delete pendingStatusUpdates[message.user_id];
  }, 100);
}

// get the online status, update the cached users and then the users list, broadcast the change with websocket
function processUserStatusUpdate(message) {
  const usersList = document.querySelector(".users-list");
  if (!usersList) return;

  // Copy the cached user list to avoid changing the original
  const newCachedUsers = [...cachedUsers];

  // Find the index of the user in the cached list
  const existingIndex = newCachedUsers.findIndex(
    (u) => u.user_id === message.user_id
  );

  if (existingIndex === -1) {
    // If doesn't exist, add a new user
    newCachedUsers.push({
      user_id: message.user_id,
      username: message.username,
      is_online: message.status === "online",
    });
  } else {
    // Only update the status if the user exists
    newCachedUsers[existingIndex].is_online = message.status === "online";
  }

  // Update the global variable and the users list UI
  updateCachedUsers(newCachedUsers);
  updateUsersList(newCachedUsers);

  // Send a message if websocket open to sync the local state with the server
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