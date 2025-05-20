import { routes } from "./routes.js";

// Function to load and display posts
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
                    // Ignore clicks on buttons or links to prevent navigation conflicts
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
export function setupPostForm() {
    // Get the elements
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
export function displayComments(comments) {
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
export function setupCommentForm(postId) {
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