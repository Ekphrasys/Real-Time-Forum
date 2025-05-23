import { openChat } from "./chat.js";

// Stocke toutes les notifications non lues
export let unreadNotifications = [];

// Permet d'ajouter une notification
export function addNotification(senderId, senderName, message, timestamp) {
  // Évite les doublons
  const existingIndex = unreadNotifications.findIndex(
    (n) => n.senderId === senderId
  );

  if (existingIndex !== -1) {
    // Mise à jour d'une notification existante du même expéditeur
    unreadNotifications[existingIndex] = {
      senderId,
      senderName,
      message,
      timestamp,
      read: false,
    };
  } else {
    // Nouvelle notification
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

// Marque une notification comme lue
export function markAsRead(senderId) {
  unreadNotifications = unreadNotifications.filter(
    (n) => n.senderId !== senderId
  );
  updateNotificationBadge();
}

// Obtient toutes les notifications non lues
export function getUnreadNotifications() {
  return unreadNotifications;
}

// Met à jour le badge de notification
export function updateNotificationBadge() {
  const badge = document.querySelector(".notification-badge");
  const count = unreadNotifications.length;

  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      // Utilise le style inline au lieu de className
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

// Initialise le système de notification
export function initNotifications() {
  // Initialise le badge
  updateNotificationBadge();

  // Gestionnaire de clic sur le bouton de notification
  const btn = document.getElementById("notification-button");
  if (btn) {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      toggleNotificationPanel();
    });
  } else {
    console.log("Notification button not found in DOM"); // (Je le laisse au cas où :))
  }

  // Fermer le panel de notification en cliquant ailleurs
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

// Affiche ou masque le panneau de notification
export function toggleNotificationPanel() {
  const panel = document.querySelector(".notification-panel");

  if (panel) {
    if (panel.style.display === "block") {
      panel.style.display = "none";
    } else {
      // Mettre à jour le contenu du panneau avant de l'afficher
      updateNotificationPanel();
      panel.style.display = "block";
    }
  }
}

// Met à jour le contenu du panneau de notification
function updateNotificationPanel() {
  const panel = document.querySelector(".notification-panel");

  if (panel) {
    if (unreadNotifications.length === 0) {
      panel.innerHTML =
        '<div class="empty-notification">No messages received</div>';
    } else {
      // Trier par date (plus récente d'abord)
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

      // Ajouter les écouteurs d'événements
      panel.querySelectorAll(".notification-item").forEach((item) => {
        item.addEventListener("click", function () {
          const userId = this.dataset.userId;
          const username = this.querySelector("strong").textContent;

          // Marquer comme lu
          markAsRead(userId);

          // Ouvrir le chat avec cet utilisateur
          if (typeof openChat === "function") {
            openChat(userId, username);
          }

          // Masquer le panneau
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
