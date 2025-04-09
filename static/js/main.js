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
        <form onsubmit="login(event)">
            <input type="text" id="nickname" placeholder="Nickname..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Login</button>
        </form>
        <p>Don't have an account ?<a href="#" onclick="navigateTo('register')"> Register</a></p>
    `,

};

window.onload = function () {
    navigateTo('register');
};

// Fnction to navigate between pages
function navigateTo(page) {
    if (routes[page]) {
        document.getElementById("app").innerHTML = routes[page];
        history.pushState({}, page, `#${page}`);
    }
    // Attach event listener for register form after inserting into DOM
    if (page === "register") {
        attachRegisterEventListener();
    }
}

// Fonction pour attacher l'événement au formulaire
function attachRegisterEventListener() {
    const form = document.getElementById("registerForm");
    

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        
        const formData = {
            username: document.getElementById("username").value,
            age: parseInt(document.getElementById("age").value),
            gender: parseInt(document.getElementById("gender").value),
            first_name: document.getElementById("first_name").value,
            last_name: document.getElementById("last_name").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };
    
        fetch("/register", {
            method: "POST",
            body: JSON.stringify(formData),
            headers: { "Content-Type": "application/json" },
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) });
            }
            return response.json();
        })
        .then(data => console.log("Success:", data))
        .catch(error => console.error("Error:", error));
    });
}