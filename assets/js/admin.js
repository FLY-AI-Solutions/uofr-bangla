const API_BASE = window.UR_BANGLA_API_BASE || "http://127.0.0.1:9007";
const tokenForm = document.querySelector("#adminTokenForm");
const loginSection = document.querySelector("#adminLogin");
const dashboard = document.querySelector("#adminDashboard");
const loginStatus = document.querySelector("#adminLoginStatus");
const postsContainer = document.querySelector("#adminPosts");
const refreshButton = document.querySelector("#refreshPosts");
const logoutButton = document.querySelector("#logoutAdmin");

let adminToken = window.sessionStorage.getItem("urBanglaAdminToken") || "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function authHeaders() {
  return {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with ${response.status}`);
  }

  return response.json();
}

function renderPosts(posts) {
  if (!posts.length) {
    postsContainer.innerHTML = '<p class="empty-state">No pending posts right now.</p>';
    return;
  }

  postsContainer.innerHTML = posts
    .map(
      (post) => `
        <article class="admin-post" data-post-id="${post.id}">
          <div class="admin-post-meta">
            <span>${escapeHtml(post.section_title)}</span>
            <time>${escapeHtml(post.display_date)}</time>
          </div>
          <h2>${escapeHtml(post.visibility === "anonymous" ? "Anonymous" : post.name || "Community member")}</h2>
          <p>${escapeHtml(post.experience)}</p>
          <div class="admin-post-actions">
            <button class="button primary" type="button" data-action="approve">Approve</button>
            <button class="button danger" type="button" data-action="reject">Reject</button>
          </div>
        </article>
      `,
    )
    .join("");
}

async function loadPosts() {
  postsContainer.innerHTML = '<p class="empty-state">Loading pending posts...</p>';
  const posts = await apiFetch("/api/admin/posts?status=pending");
  renderPosts(posts);
}

async function moderatePost(postId, status) {
  await apiFetch(`/api/admin/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  await loadPosts();
}

tokenForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminToken = new FormData(tokenForm).get("token").trim();
  window.sessionStorage.setItem("urBanglaAdminToken", adminToken);

  try {
    await loadPosts();
    loginSection.hidden = true;
    dashboard.hidden = false;
  } catch (error) {
    loginStatus.textContent = "Could not open moderation. Check the admin token and backend.";
  }
});

postsContainer.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const post = button.closest("[data-post-id]");
  button.disabled = true;
  await moderatePost(post.dataset.postId, button.dataset.action === "approve" ? "approved" : "rejected");
});

refreshButton.addEventListener("click", loadPosts);

logoutButton.addEventListener("click", () => {
  adminToken = "";
  window.sessionStorage.removeItem("urBanglaAdminToken");
  dashboard.hidden = true;
  loginSection.hidden = false;
  postsContainer.innerHTML = "";
});

if (adminToken) {
  loadPosts()
    .then(() => {
      loginSection.hidden = true;
      dashboard.hidden = false;
    })
    .catch(() => {
      window.sessionStorage.removeItem("urBanglaAdminToken");
    });
}
