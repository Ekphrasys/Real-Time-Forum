import { navigateTo, initializeWebSocket } from "./main.js";
import { setCurrentUser } from "./users.js";

// Function to attach the event to the form
export function attachRegisterEventListener() {
  const form = document.getElementById("registerForm");

  form.addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent default behaviour to let the JS handle the form submission

    // Collect form data
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
      // HTTP request to create a new user
      const response = await fetch("/register", {
        method: "POST",
        body: JSON.stringify(formData), // converts the form data to JSON format
        headers: { "Content-Type": "application/json" },
      });

      // Wait for the response and converts it to JS object
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

// Function to display an error message in the form
function displayError(message, form) {
  const errorContainer = document.getElementById("error-message");

  // If the error container does not exist, create it
  if (!errorContainer) {
    const container = document.createElement("div");
    container.id = "error-message";
    container.className = "error-message";
    form.insertBefore(container, form.firstChild);
  }

  // Set the error message and display it
  const errorElement = document.getElementById("error-message");
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

// Function to attach the event to the login form
export function attachLoginEventListener() {
  const form = document.getElementById("loginForm");

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
        credentials: "include", // Include cookies in the request
      });

      const userData = await response.json();
      if (!response.ok) {
        throw new Error(userData.error || "Login failed");
      }

      // Close the old WebSocket connection if it exists
      if (window.websocket) {
        window.websocket.close();
        window.websocket = null;
      }

      console.log("User data received:", userData);
      // Update the global currentUser variable
      window.currentUser = userData;
      // Update the current user state in the application
      setCurrentUser(userData);
      
      console.log("User data updated, calling navigation");
      // AWait a short timeout to ensure the DOM is updated
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
  // Close the WebSocket connection if it exists
  if (window.websocket) {
    window.websocket.close();
    window.websocket = null;
  }

  fetch("/logout", { method: "POST", credentials: "include" })
    .then((response) => response.json())
    .then(() => {
      // Update the current user state
      window.currentUser = null;
      setCurrentUser(null);
      // redirect to the login page
      navigateTo("login");
    })
    .catch((error) => console.error("Logout error:", error));
}