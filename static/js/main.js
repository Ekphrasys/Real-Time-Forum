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
            <div class="user-info">
                <p>Welcome, {{ .User.Username}}</p>
                <button class="logout-button" type="submit">Logout</button>
            </div>
        </header>
        <h1>Holy Chicken Order 🍗</h1>
        <p>Welcome to the home page!</p>
        

        <div class="main-content">
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
        
        <div class="users-container">
            <h3 class="users-title">Currently Online ({{ .OnlineUsersCount }})</h3>
            <ul class="users-list">
                <li class="user-item">{{ .User.Username}}</li>
            </ul>
        </div>
    </div>
    `,

};

window.onload = function () {
    navigateTo('login');
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

import { attachLoginEventListener, attachRegisterEventListener } from './auth.js';