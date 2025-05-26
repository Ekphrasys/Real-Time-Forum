import { openChat } from "./chat.js";

// Stores all unread notifications
export let unreadNotifications = [];

// Allows adding a notification
export function addNotification(senderId, senderName, message, timestamp) {
  // Avoid duplicates
  const existingIndex = unreadNotifications.findIndex(
    (n) => n.senderId === senderId
  );

  if (existingIndex !== -1) {
    // Update an existing notification from the same sender
    unreadNotifications[existingIndex] = {
      senderId,
      senderName,
      message,
      timestamp,
      read: false,
    };
  } else {
    // New notification
    unreadNotifications.push({
      senderId,
      senderName,
      message,
      timestamp,
      read: false,
    });
  }

  updateNotificationBadge();
}

// Marks a notification as read
export function markAsRead(senderId) {
  unreadNotifications = unreadNotifications.filter(
    (n) => n.senderId !== senderId
  );
  updateNotificationBadge();
}

// Gets all unread notifications
export function getUnreadNotifications() {
  return unreadNotifications;
}

// Updates the notification badge
export function updateNotificationBadge() {
  const badge = document.querySelector(".notification-badge");
  const count = unreadNotifications.length;

  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      // Use inline style instead of className
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

// Initializes the notification system
export function initNotifications() {
  // Initialize the badge
  updateNotificationBadge();

  // Click handler for the notification button
  const btn = document.getElementById("notification-button");
  if (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      toggleNotificationPanel();
    });
  } else {
    console.log("Notification button not found in DOM"); // (Je le laisse au cas où :))
  }

  // Close the notification panel when clicking elsewhere
  document.addEventListener("click", function (event) {
    const panel = document.querySelector(".notification-panel");
    const btn = document.getElementById("notification-button");

    if (
      panel &&
      panel.style.display === "block" &&
      !panel.contains(event.target) &&
      event.target !== btn
    ) {
      panel.style.display = "none";
    }
  });
}

// Shows or hides the notification panel
export function toggleNotificationPanel() {
  const panel = document.querySelector(".notification-panel");

  if (panel) {
    if (panel.style.display === "block") {
      panel.style.display = "none";
    } else {
      // Update the panel content before displaying it
      updateNotificationPanel();
      panel.style.display = "block";
    }
  }
}

// Updates the content of the notification panel
function updateNotificationPanel() {
  const panel = document.querySelector(".notification-panel");

  if (panel) {
    if (unreadNotifications.length === 0) {
      panel.innerHTML =
        '<div class="empty-notification">No messages received</div>';
    } else {
      // Sort by date (most recent first)
      const sorted = [...unreadNotifications].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      let html = "";
      sorted.forEach((notification) => {
        html += `
          <div class="notification-item" data-user-id="${
            notification.senderId
          }">
            <div class="notification-content">
              Message received from <strong>${notification.senderName}</strong>
            </div>
            <div class="notification-time">
              ${new Date(notification.timestamp).toLocaleTimeString()}
            </div>
          </div>
        `;
      });

      panel.innerHTML = html;

      // Add event listeners
      panel.querySelectorAll(".notification-item").forEach((item) => {
        item.addEventListener("click", function () {
          const userId = this.dataset.userId;
          const username = this.querySelector("strong").textContent;

          // Mark as read
          markAsRead(userId);

          // Open chat with this user
          if (typeof openChat === "function") {
            openChat(userId, username);
          }

          // Hide the panel
          panel.style.display = "none";
        });
      });
    }
  }
}

window.notificationFunctions = {
  addNotification,
  markAsRead,
  initNotifications,
};
