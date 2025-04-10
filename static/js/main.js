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
        <h1>Home</h1>
        <p>Welcome to the home page!</p>
        <button onclick="navigateTo('login')">Logout</button>
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

import { attachLoginEventListener, attachRegisterEventListener } from './auth.js';