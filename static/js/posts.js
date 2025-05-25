import { routes } from "./routes.js";

// Get the posts list from the server and display them
export function loadPosts() {
    fetch("/posts", { method: "GET", credentials: "include" })
        .then((response) => {
            return response.json();
        })
        .then((posts) => {
            const postsContainer = document.querySelector(".posts");

            if (!postsContainer) {
                console.error("Posts container not found!");
                return;
            }

            // Clear existing posts
            postsContainer.innerHTML = "";

            // If no posts are found, display a message
            if (posts.length === 0) {
                postsContainer.innerHTML = "<p>No posts yet. Be the first to post!</p>";
                return;
            }

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

                // Create a new post element
                const postElement = document.createElement("div");
                postElement.className = "post";

                postElement.innerHTML = `
                    <h4>${post.username || "Anonymous"}</h4>
                    <h3>${post.title || ""}</h3>
                        <p>${post.content}</p>
                    <div class="post-meta">
                        <span>Category: ${post.category || "General"}</span>
                        <br>
                        <span>Posted: ${new Date(
                    post.creation_date
                ).toLocaleString()}</span>
                        <button class="view-comments-btn">View Post Details</button>
                    </div>
                `;

                // Add specific click handler for the comments button
                const commentsBtn = postElement.querySelector(".view-comments-btn");
                if (commentsBtn) {
                    commentsBtn.addEventListener("click", function (e) {
                        viewPost(post.post_id);
                    });
                }

                // Append the post element to the posts container
                postsContainer.appendChild(postElement);
            });
        })
        .catch((error) => console.error("Error loading posts:", error));
}

// Function to handle post creation
export function setupPostForm() {
    // Get the elements from the creation form
    const titleInput = document.getElementById("post-title");
    const categorySelect = document.getElementById("post-category");
    const textarea = document.querySelector(".create-post textarea");
    const postButton = document.querySelector(".create-post button");

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
                    const currentUser = window.currentUser;

                    postElement.innerHTML = `
                        <h4>${currentUser?.username}</h4>
                        <h3>${newPost.title}</h3>
                        <p>${newPost.content}</p>
                        <div class="post-meta">
                            <span>Category: ${newPost.category}</span>
                            <br>
                            <span>Posted: ${new Date(
                        newPost.creation_date
                    ).toLocaleString()}</span>
                            <button class="view-comments-btn">View Post Details</button>
                        </div>
                    `;

                    const DetailsBtn = postElement.querySelector(".view-comments-btn");
                    if (DetailsBtn) {
                        DetailsBtn.addEventListener("click", function (e) {
                            viewPost(newPost.post_id);
                        });
                    }

                    // Add to the beginning of the posts container
                    postsContainer.insertBefore(postElement, postsContainer.firstChild);
                }
            })
            .catch((error) => console.error("Error:", error));
    });
}

// Function to navigate to a post detail page
export function viewPost(postId) {
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
export function loadPostDetails(postId) {
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
export function displayPostDetails(post) {
    const container = document.getElementById("post-content");
    if (!container) return; // If the container is not found, exit

    container.innerHTML = `
      <h2>${post.title}</h2>
      <div class="post-meta">
        <span>By: ${post.username || "Anonymous"}</span>
        <br>
        <span>Category: ${post.category || "General"}</span>
        <br>
        <span>Posted: ${new Date(post.creation_date).toLocaleString()}</span>
      </div>
      <div class="post-body">
        <p>${post.content}</p>
      </div>
    `;
}

// Function to display comments
export function displayComments(comments) {
    const container = document.getElementById("comments-list");
    if (!container) return;

    if (!comments || comments.length === 0) {
        container.innerHTML = "<p>No comments yet. Be the first to comment!</p>";
        return;
    }

    // For each comment, create a new HTML structure
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

    // Set the inner HTML of the comments container
    container.innerHTML = html;
}

// Function to set up the comment form
export function setupCommentForm(postId) {
    const submitButton = document.getElementById("submit-comment");
    const contentInput = document.getElementById("comment-content");

    if (!submitButton || !contentInput) return;

    submitButton.addEventListener("click", () => {
        const content = contentInput.value.trim(); // Get the content from the input field, trim whitespace to ensure it's not empty
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