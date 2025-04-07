const routes = {
    register: `
        <h1>Register</h1>
        <form onsubmit="register(event)">
            <input type="text" id="nickname" placeholder="Nickname..." required>
            <input type="email" id="email" placeholder="Email..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Register</button>
        </form>
        <p>Already have an account ?<a href="#" onclick="navigateTo('login')">login</a></p>
    `,

    login: `
        <h1>Login</h1>
        <form onsubmit="login(event)">
            <input type="text" id="nickname" placeholder="Nickname..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Login</button>
        </form>
        <p>Don't have an account ?<a href="#" onclick="navigateTo('register')">register</a></p>
    `,

};

window.onload = function () {
    navigateTo('register');
};

// Fonction pour naviguer entre les "pages"
function navigateTo(page) {
    if (routes[page]) {
        document.getElementById("app").innerHTML = routes[page];
        history.pushState({}, page, `#${page}`);
    }
}