import { navigateTo } from './main.js';

// // Function to attach the event to the form
export function attachRegisterEventListener() {
    const form = document.getElementById("registerForm");

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        clearErrors(form);
        
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
                return response.json()
                    .catch(() => { throw new Error(response.statusText) })
                    .then(errorData => {
                        // Check for specific error messages from backend
                        if (errorData.error && errorData.error.includes("Email")) {
                            throw new Error("This email is already used");
                        } else if (errorData.error && errorData.error.includes("Username")) {
                            throw new Error("This username is already taken");
                        } else {
                            throw new Error(errorData.error || errorData.message || "Registration failed");
                        }
                    });
            }
            return response.json();
        })
        .then(data => { 
            console.log("Success:", data);
            navigateTo('login');
        })
        .catch(error => {
            console.error("Error:", error);
            displayError(error.message, form);
        });
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

function clearErrors(form) {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
        errorMessage.textContent = "";
    }
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
            const response = await fetch('/login', {  // Make sure this matches your route
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password: password
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }
            
            const userData = await response.json();
            console.log("Login successful:", userData);
            
            // Redirect to home page after successful login
            navigateTo('home');
            
        } catch (error) {
            console.error("Login error:", error);
            errorMessage.textContent = error.message;
        }
    });
}