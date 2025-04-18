const routes = {
  register: `
        <h1>Register</h1>
        <form id="registerForm">
            <input type="text" id="username" placeholder="Username..." required>
            <input type="number" id="age" placeholder="Age..." required min="13" max="120">
            <select id="gender" required>
                <option value="" disabled selected>Select Gender</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
                <option value="3">Other</option>
            </select>
            <input type="text" id="first_name" placeholder="Firstname..." required>
            <input type="text" id="last_name" placeholder="Lastname..." required>
            <input type="email" id="email" placeholder="Email..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Register</button>

            <!-- Error container -->
            <div id="error-message" class="error-message"></div>
        </form>
        <p>Already have an account ?<a href="#" onclick="navigateTo('login')"> Login</a></p>
    `,

  login: `
        <h1>Login</h1>
        <form id="loginForm">
            <input type="text" id="usernameOrMail" placeholder="Username or Email..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Login</button>
        </form>
        <div id="errorMessage" style="color: red;"></div>
        <p>Don't have an account ?<a href="#" onclick="navigateTo('register')"> Register</a></p>
    `,

  home: `
      <header>
          <h1>Holy Chicken Order</h1>
            <div class="user-info">
              <p id="welcome">Welcome, {{ .User.Username}}</p>
              <button id="logout-button" type="submit">Logout</button>
            </div>
      </header>
        

        <div class="main-content">
        <div class="users-container">
            <h3 class="users-title">Currently Online</h3>
            <ul class="users-list">
                <li class="user-item">{{ .User.Username}}</li>
            </ul>
        </div>

        <div class="posts-container">
            <div class="create-post">
                <h3>Create a new post</h3>
                <textarea placeholder="What's on your mind?" rows="3"></textarea>
                <button type="button">Post</button>
            </div>
            
            <h2>Recent Posts</h2>
            <div class="posts">
                {{ range .Posts }}
            </div>
        </div>
    </div>
    `,
};

window.onload = function () {
  checkSession();
};

// Function to navigate between pages
export function navigateTo(page) {
  if (routes[page]) {
    document.getElementById("app").innerHTML = routes[page];
    history.pushState({}, page, `#${page}`);
  }
  // Attach event listener for register form after inserting into DOM
  if (page === "register") {
    attachRegisterEventListener();
  }

  if (page === "login") {
    attachLoginEventListener();
  }
}

window.navigateTo = navigateTo;

import {
  attachLoginEventListener,
  attachRegisterEventListener,
} from "./auth.js";

function logout() {
  console.log("Logout clicked");
  fetch("/logout", { method: "POST" })
    .then((response) => response.json())
    .then(() => {
      updateNavigation(false);
      navigateTo("login");
    })
    .catch((error) => console.error("Logout error:", error));
}

// Verify if the session is still active
function checkSession() {
  fetch("/check-session", { method: "GET" })
    .then((response) => {
      if (response.ok) {
        updateNavigation(true);
        navigateTo("home");
      } else {
        updateNavigation(false);
        navigateTo("login");
      }
    })
    .catch((error) => {
      console.error("Session check error:", error);
      updateNavigation(false);
    });
}

function updateNavigation(isAuthenticated) {
  const nav = document.getElementById("auth-nav");

  if (isAuthenticated) {
    nav.innerHTML = `
          <button onclick="logout()">Logout</button>
          <button onclick="goToHome()">Home</button>
      `;
  } else {
    nav.innerHTML = `
          <button onclick="navigateTo('login')">Login</button>
          <button onclick="navigateTo('register')">Register</button>
          <button onclick="goToHome()">Home</button>
      `;
  }
}

// Function to navigate to the home page
function goToHome() {
  navigateTo("home");
}

// Expose functions to the global scope
window.logout = logout;
window.checkSession = checkSession;
window.goToHome = goToHome;
window.updateNavigation = updateNavigation;
window.navigateTo = navigateTo;
