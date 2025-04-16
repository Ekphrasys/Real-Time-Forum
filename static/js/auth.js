import { navigateTo } from "./main.js";

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
      // Optionnel: afficher l'erreur à l'utilisateur
    }
  });
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
      // Call your backend API endpoint
      const response = await fetch("/login", {
        // Make sure this matches your route
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier,
          password: password,
        }),
      });

      const userData = await response.json();
      if (!response.ok) {
        throw new Error(userData.error || "Login failed");
      }

      console.log("Login successful:", userData);

      // Redirect to home page after successful login
      navigateTo("home");
    } catch (error) {
      console.error("Login error:", error);
      errorMessage.textContent = error.message;
    }
  });
}
