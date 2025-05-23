import { navigateTo, initializeWebSocket } from "./main.js";
import { setCurrentUser } from "./users.js";

// Function to attach the event to the form
export function attachRegisterEventListener() {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = {
      username: document.getElementById("username").value,
      age: parseInt(document.getElementById("age").value),
      gender: parseInt(document.getElementById("gender").value),
      first_name: document.getElementById("first_name").value,
      last_name: document.getElementById("last_name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
    };

    try {
      const response = await fetch("/register", {
        method: "POST",
        body: JSON.stringify(formData),
        headers: { "Content-Type": "application/json" },
      });

      // Utilise la même approche que le login (cohérence)
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      console.log("Success:", data);
      navigateTo("login");
    } catch (error) {
      console.error("Error:", error);
      displayError(error.message, form);
    }
  });
}

function displayError(message, form) {
  const errorContainer = document.getElementById("error-message");

  if (!errorContainer) {
    const container = document.createElement("div");
    container.id = "error-message";
    container.className = "error-message";
    form.insertBefore(container, form.firstChild);
  }

  const errorElement = document.getElementById("error-message");
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

// Function to attach the event to the login form
export function attachLoginEventListener() {
  const form = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const identifier = document.getElementById("usernameOrMail").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier,
          password: password,
        }),
        credentials: "include",
      });

      const userData = await response.json();
      if (!response.ok) {
        throw new Error(userData.error || "Login failed");
      }

      // Fermer l'ancien WebSocket s'il existe
      if (window.websocket) {
        window.websocket.close();
        window.websocket = null;
      }

      // Mettre à jour currentUser via la fonction exportée
      console.log("User data received:", userData);
      // Mettre à jour aussi window.currentUser pour compatibilité
      window.currentUser = userData;
      // Utiliser la fonction dédiée pour mettre à jour currentUser
      setCurrentUser(userData);
      
      console.log("User data updated, calling navigation");
      // Attendre que les données soient bien mises à jour
      setTimeout(() => {
        document.getElementById("logout-button");
        initializeWebSocket();
        navigateTo("home");
      }, 50);
    } catch (error) {
      console.error("Login error:", error);
      errorMessage.textContent = error.message;
    }
  });
}

export function logout() {
  // Fermer le WebSocket s'il existe
  if (window.websocket) {
    window.websocket.close();
    window.websocket = null;
  }

  fetch("/logout", { method: "POST", credentials: "include" })
    .then((response) => response.json())
    .then(() => {
      // Mettre à jour les données utilisateur
      window.currentUser = null;
      setCurrentUser(null);
      
      navigateTo("login");
    })
    .catch((error) => console.error("Logout error:", error));
}