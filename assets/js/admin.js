const API_BASE = window.UR_BANGLA_API_BASE || "https://jerin-api.flyai.online/x006";
const tokenForm = document.querySelector("#adminTokenForm");
const loginSection = document.querySelector("#adminLogin");
const dashboard = document.querySelector("#adminDashboard");
const loginStatus = document.querySelector("#adminLoginStatus");
const postsContainer = document.querySelector("#adminPosts");
const refreshButton = document.querySelector("#refreshPosts");
const logoutButton = document.querySelector("#logoutAdmin");

let adminToken = window.sessionStorage.getItem("urBanglaAdminToken") || "";
let currentStatus = "pending";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortLinkLabel(rawUrl) {
  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const host = url.hostname.replace(/^www\./, "");
    const path = `${url.pathname}${url.search}`.replace(/\/$/, "");
    const label = `${host}${path && path !== "/" ? path : ""}`;
    return label.length > 42 ? `${label.slice(0, 39)}...` : label;
  } catch (error) {
    return rawUrl.length > 42 ? `${rawUrl.slice(0, 39)}...` : rawUrl;
  }
}

function linkifyText(value) {
  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  let output = "";
  let lastIndex = 0;

  String(value ?? "").replace(urlPattern, (match, _unused, offset) => {
    output += escapeHtml(String(value ?? "").slice(lastIndex, offset));
    const cleanMatch = match.replace(/[.,!?;:)]+$/, "");
    const suffix = match.slice(cleanMatch.length);
    const href = cleanMatch.startsWith("http") ? cleanMatch : `https://${cleanMatch}`;
    output += `<a class="inline-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(shortLinkLabel(cleanMatch))}</a>${escapeHtml(suffix)}`;
    lastIndex = offset + match.length;
    return match;
  });

  output += escapeHtml(String(value ?? "").slice(lastIndex));
  return output;
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
    postsContainer.innerHTML = `<p class="empty-state">No ${escapeHtml(currentStatus)} posts right now.</p>`;
    return;
  }

  postsContainer.innerHTML = posts
    .map((post) => {
      const approveLabel = post.status === "rejected" ? "Restore" : "Approve";
      const rejectLabel = post.status === "approved" ? "Move to rejected" : "Reject";

      return `
        <article class="admin-post" data-post-id="${post.id}">
          <div class="admin-post-meta">
            <span>${escapeHtml(post.section_title)}</span>
            <time>${escapeHtml(post.display_date)}</time>
          </div>
          <h2>${escapeHtml(post.visibility === "anonymous" ? "Anonymous" : post.name || "Community member")}</h2>
          <p>${linkifyText(post.experience)}</p>
          <div class="admin-post-actions">
            ${post.status === "approved" ? "" : `<button class="button primary" type="button" data-action="approve">${approveLabel}</button>`}
            ${post.status === "rejected" ? "" : `<button class="button danger" type="button" data-action="reject">${rejectLabel}</button>`}
            <button class="button ghost-danger" type="button" data-action="delete">Remove</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadPosts() {
  postsContainer.innerHTML = `<p class="empty-state">Loading ${escapeHtml(currentStatus)} posts...</p>`;
  const posts = await apiFetch(`/api/admin/posts?status=${encodeURIComponent(currentStatus)}`);
  renderPosts(posts);
}

async function moderatePost(postId, status) {
  await apiFetch(`/api/admin/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  await loadPosts();
}

async function deletePost(postId) {
  await apiFetch(`/api/admin/posts/${postId}`, {
    method: "DELETE",
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
  try {
    if (button.dataset.action === "delete") {
      await deletePost(post.dataset.postId);
      return;
    }

    await moderatePost(post.dataset.postId, button.dataset.action === "approve" ? "approved" : "rejected");
  } catch (error) {
    button.disabled = false;
    postsContainer.insertAdjacentHTML(
      "afterbegin",
      `<p class="empty-state">Could not update this post: ${escapeHtml(error.message)}</p>`,
    );
  }
});

document.querySelectorAll("[data-status-filter]").forEach((button) => {
  button.addEventListener("click", async () => {
    currentStatus = button.dataset.statusFilter;
    document
      .querySelectorAll("[data-status-filter]")
      .forEach((item) => item.classList.toggle("is-active", item === button));
    await loadPosts();
  });
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
