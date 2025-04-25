window.currentUser = null;
const routes = {
  register: function () {
    return `
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
    `;
  },

  login: function () {
    return `
        <h1>Login</h1>
        <form id="loginForm">
            <input type="text" id="usernameOrMail" placeholder="Username or Email..." required>
            <input type="password" id="password" placeholder="Password..." required>
            <button type="submit">Login</button>
        </form>
        <div id="errorMessage" style="color: red;"></div>
        <p>Don't have an account ?<a href="#" onclick="navigateTo('register')"> Register</a></p>
    `;
  },

  home: function () {
    return `
      <header>
          <h1>Holy Chicken Order</h1>
            <div class="user-info">
          <p id="welcome">Welcome, ${
            window.currentUser ? currentUser.username : "Guest"
          }</p>
              <button id="logout-button" type="submit">Logout</button>
            </div>
      </header>
   
        <div class="main-content">
        <div class="users-container">
            <h3 class="users-title">Currently Online</h3>
            <ul class="users-list">
            <li class="user-item">${
              window.currentUser ? currentUser.username : "Guest"
            }</li>
            </ul>
        </div>

        <div class="posts-container">
          <div class="create-post">
            <h3>Create a new post</h3>
            <input type="text" id="post-title" placeholder="Enter title..." required>
            <select id="post-category">
              <option value="general">General</option>
              <option value="technology">Technology</option>
              <option value="question">Question</option>
            </select>
            <textarea placeholder="What's on your mind?" rows="3"></textarea>
            <button type="button">Post</button>
          </div>
            
            <h2>Recent Posts</h2>
            <div class="posts">
                <!-- Posts will be loaded here -->
            </div>
        </div>
    </div>
    `;
  },
  "post-detail": function (postId) {
    return `
      <header>
        <h1>Holy Chicken Order</h1>
        <div class="user-info">
          <p id="welcome">Welcome, ${
            window.currentUser ? window.currentUser.username : "Guest"
          }</p>
          <button onclick="navigateTo('home')">Back to Forum</button>
          <button id="logout-button" type="submit">Logout</button>
        </div>
      </header>
      
      <div class="post-detail-container">
        <div id="post-content">
          <h2>Loading post...</h2>
        </div>
        
        <div class="comments-section">
          <h3>Comments</h3>
          <div id="comments-list">
            <!-- Comments will be loaded here -->
          </div>
          
          <div class="comment-form">
            <h4>Add a Comment</h4>
            <textarea id="comment-content" placeholder="Write your comment..." rows="3"></textarea>
            <button id="submit-comment">Post Comment</button>
          </div>
        </div>
      </div>
    `;
  },
};

window.onload = function () {
  checkSession();
};

// Function to navigate between pages
export function navigateTo(page) {
  if (routes[page]) {
    // Check if the route is a function and call it
    const content =
      typeof routes[page] === "function" ? routes[page]() : routes[page];
    document.getElementById("app").innerHTML = content;
    history.pushState({}, page, `#${page}`);
  }
  // Attach event listener for register form after inserting into DOM
  if (page === "register") {
    attachRegisterEventListener();
  }

  if (page === "login") {
    attachLoginEventListener();
  }
  if (page === "home") {
    setupPostForm();
    loadPosts();
  }
}

window.navigateTo = navigateTo;

import {
  attachLoginEventListener,
  attachRegisterEventListener,
} from "./auth.js";

function logout() {
  console.log("Logout clicked");
  fetch("/logout", { method: "POST", credentials: "include" })
    .then((response) => response.json())
    .then(() => {
      updateNavigation(false);
      navigateTo("login");
    })
    .catch((error) => console.error("Logout error:", error));
}

// Verify if the session is still active
function checkSession() {
  fetch("/check-session", { method: "GET", credentials: "include" })
    .then((response) => {
      console.log("Session check response:", response);
      if (response.ok) {
        return response.json(); // Get user data from response
        // console.log("Session is active");
        // updateNavigation(true);
        // navigateTo("home");
      } else {
        console.log("Session is not active");
        updateNavigation(false);
        navigateTo("login");
        return Promise.reject("Not authenticated");
      }
    })
    .then((userData) => {
      console.log("User data:", userData);
      currentUser = userData; // Store user data
      console.log("currentUser after setting:", currentUser); // Debug to verify
      updateNavigation(true);
      navigateTo("home");

      // Initialize WebSocket after successful login
      initializeWebSocket();
    })
    .catch((error) => {
      console.error("Session check error:", error);
      updateNavigation(false);
    });
}

export function updateNavigation(isAuthenticated) {
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

// Function to load and display posts
function loadPosts() {
  fetch("/posts", { method: "GET", credentials: "include" })
    .then((response) => {
      console.log("Posts response status:", response.status);
      return response.json();
    })
    .then((posts) => {
      console.log("Posts received:", posts);
      const postsContainer = document.querySelector(".posts");
      console.log("Posts container found:", !!postsContainer);

      if (!postsContainer) {
        console.error("Posts container not found!");
        return;
      }

      // Clear existing posts
      postsContainer.innerHTML = "";

      if (posts.length === 0) {
        postsContainer.innerHTML = "<p>No posts yet. Be the first to post!</p>";
        return;
      }

      postsContainer.innerHTML = ""; // Clear previous posts

      // Add each post to the container
      posts.forEach((post) => {
        // Convert ISO string to Date properly
        let dateDisplay = "Unknown date";
        try {
          // Check if creation_date exists and isn't null
          if (post.creation_date) {
            const date = new Date(post.creation_date);
            // Verify it's a valid date
            if (!isNaN(date.getTime())) {
              dateDisplay = date.toLocaleString();
            }
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }

        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.style.cursor = "pointer"; // Make it look clickable

        postElement.innerHTML = `
          <h4>${post.username || "Anonymous"}</h4>
          <h3>${post.title || ""}</h3>
          <p>${post.content}</p>
          <div class="post-meta">
            <span>Category: ${post.category || "General"}</span>
            <span>Posted: ${new Date(
              post.creation_date
            ).toLocaleString()}</span>
          </div>
          <button class="view-comments-btn">View Comments</button>
        `;

        // Add click handler for the entire post
        postElement.addEventListener("click", function (e) {
          // Don't trigger if they clicked specifically on a button or link
          if (e.target.tagName === "BUTTON" || e.target.tagName === "A") {
            return;
          }
          viewPost(post.post_id);
        });

        // Add specific click handler for the comments button
        const commentsBtn = postElement.querySelector(".view-comments-btn");
        if (commentsBtn) {
          commentsBtn.addEventListener("click", function (e) {
            e.stopPropagation(); // Prevent triggering the post click event
            viewPost(post.post_id);
          });
        }

        postsContainer.appendChild(postElement);
      });
    })
    .catch((error) => console.error("Error loading posts:", error));
}

// Simplified function to handle post creation
function setupPostForm() {
  console.log("Setting up post form...");

  // Get the elements
  const titleInput = document.getElementById("post-title");
  const categorySelect = document.getElementById("post-category");
  const textarea = document.querySelector(".create-post textarea");
  const postButton = document.querySelector(".create-post button");

  // Check if elements are found
  console.log("Title input found:", !!titleInput);
  console.log("Category select found:", !!categorySelect);
  console.log("Textarea found:", !!textarea);
  console.log("Button found:", !!postButton);

  if (!textarea || !postButton || !titleInput) {
    console.error("Form elements not found!");
    return;
  }

  // Add event listener to the button
  postButton.addEventListener("click", function () {
    const title = titleInput.value.trim();
    const content = textarea.value.trim();
    const category = categorySelect ? categorySelect.value : "general";

    if (!content || !title) {
      alert("Please enter both title and content for your post");
      return;
    }

    // Create post with content
    const postData = {
      title: title,
      content: content,
      category: category,
    };

    // Send to server
    fetch("/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to create post");
        return response.json();
      })
      .then((newPost) => {
        // Clear the form inputs
        titleInput.value = "";
        textarea.value = "";
        if (categorySelect) categorySelect.value = "general";

        // Add the new post to the DOM immediately
        const postsContainer = document.querySelector(".posts");
        if (postsContainer) {
          const postElement = document.createElement("div");
          postElement.className = "post";
          postElement.innerHTML = `
            <h4>${newPost.username || "You"}</h4>
            <h3>${newPost.title}</h3>
            <p>${newPost.content}</p>
            <div class="post-meta">
              <span>Category: ${newPost.category}</span>
              <span>Just now</span>
            </div>
          `;

          // Add to the beginning of the posts container
          postsContainer.insertBefore(postElement, postsContainer.firstChild);
        }
      })
      .catch((error) => console.error("Error:", error));
  });
}

// Function to navigate to a post detail page
function viewPost(postId) {
  // Update URL to include post ID
  history.pushState({}, `Post ${postId}`, `#post/${postId}`);

  // Render the post detail template
  document.getElementById("app").innerHTML = routes["post-detail"](postId);

  // Load post details
  loadPostDetails(postId);

  // Setup comment form
  setupCommentForm(postId);
}

// Function to load post details and comments
function loadPostDetails(postId) {
  fetch(`/post/${postId}`, {
    method: "GET",
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      displayPostDetails(data.post);
      displayComments(data.comments);
    })
    .catch((error) => {
      console.error("Error loading post details:", error);
    });
}

// Function to display post details
function displayPostDetails(post) {
  const container = document.getElementById("post-content");
  if (!container) return;

  container.innerHTML = `
    <h2>${post.title}</h2>
    <div class="post-meta">
      <span>By: ${post.username || "Anonymous"}</span>
      <span>Category: ${post.category || "General"}</span>
      <span>Posted: ${new Date(post.creation_date).toLocaleString()}</span>
    </div>
    <div class="post-body">
      <p>${post.content}</p>
    </div>
  `;
}

// Function to display comments
function displayComments(comments) {
  const container = document.getElementById("comments-list");
  if (!container) return;

  if (!comments || comments.length === 0) {
    container.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
    return;
  }

  let html = "";
  comments.forEach((comment) => {
    html += `
      <div class="comment">
        <div class="comment-header">
          <span class="comment-author">${comment.username || "Anonymous"}</span>
          <span class="comment-date">${new Date(
            comment.creation_date
          ).toLocaleString()}</span>
        </div>
        <div class="comment-body">
          <p>${comment.content}</p>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Function to set up the comment form
function setupCommentForm(postId) {
  const submitButton = document.getElementById("submit-comment");
  const contentInput = document.getElementById("comment-content");

  if (!submitButton || !contentInput) return;

  submitButton.addEventListener("click", () => {
    const content = contentInput.value.trim();
    if (!content) {
      alert("Comment cannot be empty");
      return;
    }

    // Send comment to server
    fetch("/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: postId,
        content: content,
      }),
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to post comment");
        return response.json();
      })
      .then(() => {
        // Clear the input field
        contentInput.value = "";
        // Reload comments to show the new one
        loadPostDetails(postId);
      })
      .catch((error) => {
        console.error("Error posting comment:", error);
      });
  });
}

// Make sure to expose viewPost globally
window.viewPost = viewPost;

function initializeWebSocket() {
  if (window.websocket) {
    // Already connected
    return;
  }

  const socket = new WebSocket("ws://localhost:8080/ws");

  socket.onopen = function () {
    console.log("WebSocket connection established");
  };

  socket.onmessage = function (event) {
    const message = JSON.parse(event.data);
    console.log("WebSocket message received:", message);

    if (message.type === "online_users") {
      updateOnlineUsersList(message.users);
    } else if (message.type === "user_status") {
      handleUserStatusChange(message);
    }
  };

  socket.onclose = function () {
    console.log("WebSocket connection closed");
    window.websocket = null;
  };

  window.websocket = socket;
}

// Update online users list
function updateOnlineUsersList(users) {
  const usersList = document.querySelector(".users-list");
  if (!usersList) return;

  // Clear current list
  usersList.innerHTML = "";

  // Add all online users
  users.forEach((user) => {
    const listItem = document.createElement("li");
    listItem.className = "user-item online";
    listItem.textContent = user.username;
    usersList.appendChild(listItem);
  });

  // If no online users other than current user
  if (users.length <= 1) {
    const listItem = document.createElement("li");
    listItem.className = "user-item";
    listItem.textContent = "No other users online";
    usersList.appendChild(listItem);
  }
}

// Handle user status change
function handleUserStatusChange(message) {
  const usersList = document.querySelector(".users-list");
  if (!usersList) return;

  // Check if user already in list
  const existingUser = Array.from(
    usersList.querySelectorAll(".user-item")
  ).find((item) => item.textContent === message.username);

  if (message.status === "online") {
    // Add user if not already in list
    if (!existingUser) {
      const listItem = document.createElement("li");
      listItem.className = "user-item online";
      listItem.textContent = message.username;
      usersList.appendChild(listItem);
    } else {
      existingUser.classList.add("online");
    }
  } else if (message.status === "offline") {
    // Remove online class if user exists
    if (existingUser) {
      existingUser.classList.remove("online");
    }
  }
}

// Call this when the user logs in
function initializeAfterLogin() {
  // Initialize WebSocket connection
  initializeWebSocket();
}
