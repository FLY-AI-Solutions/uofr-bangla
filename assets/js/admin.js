const API_BASE = window.UR_BANGLA_API_BASE || "https://jerin-api.flyai.online/x006";
const tokenForm = document.querySelector("#adminTokenForm");
const loginSection = document.querySelector("#adminLogin");
const dashboard = document.querySelector("#adminDashboard");
const loginStatus = document.querySelector("#adminLoginStatus");
const adminStats = document.querySelector("#adminStats");
const postsContainer = document.querySelector("#adminPosts");
const refreshButton = document.querySelector("#refreshPosts");
const logoutButton = document.querySelector("#logoutAdmin");
const importDirectoryButton = document.querySelector("#importDirectory");
const directorySearch = document.querySelector("#directorySearch");
const directoryStatusFilter = document.querySelector("#directoryStatusFilter");
const directoryRoleFilter = document.querySelector("#directoryRoleFilter");
const directoryStatus = document.querySelector("#directoryStatus");
const directoryContacts = document.querySelector("#directoryContacts");
const selectedContactCount = document.querySelector("#selectedContactCount");
const selectVisibleContacts = document.querySelector("#selectVisibleContacts");
const clearSelectedContacts = document.querySelector("#clearSelectedContacts");
const mailingAudience = document.querySelector("#mailingAudience");
const mailingForm = document.querySelector("#mailingForm");
const mailingStatus = document.querySelector("#mailingStatus");
const groupName = document.querySelector("#groupName");
const groupEmails = document.querySelector("#groupEmails");
const groupDefaultRole = document.querySelector("#groupDefaultRole");
const groupDefaultStatus = document.querySelector("#groupDefaultStatus");
const createEmailGroup = document.querySelector("#createEmailGroup");
const groupStatus = document.querySelector("#groupStatus");
const mailingGroupSelect = document.querySelector("#mailingGroupSelect");

let adminToken = window.sessionStorage.getItem("urBanglaAdminToken") || "";
let currentStatus = "pending";
let directoryFilters = { statuses: [], roles: [], sources: [] };
let visibleContacts = [];
const selectedContacts = new Set();

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

function renderOptions(select, items, placeholder) {
  select.innerHTML = `
    <option value="">${placeholder}</option>
    ${items.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.value)} (${item.count})</option>`).join("")}
  `;
}

function renderAudienceOptions(filters) {
  const statusOptions = filters.statuses
    .map(
      (item) => `
        <label class="audience-chip">
          <input type="checkbox" name="statusAudience" value="${escapeHtml(item.value)}" />
          <span>${escapeHtml(item.value)} (${item.count})</span>
        </label>
      `,
    )
    .join("");
  const roleOptions = filters.roles
    .map(
      (item) => `
        <label class="audience-chip">
          <input type="checkbox" name="roleAudience" value="${escapeHtml(item.value)}" />
          <span>${escapeHtml(item.value)} (${item.count})</span>
        </label>
      `,
    )
    .join("");

  mailingAudience.innerHTML = `
    <div class="audience-group">
      <strong>Status</strong>
      <div>${statusOptions || '<span class="muted-note">No statuses yet</span>'}</div>
    </div>
    <div class="audience-group">
      <strong>Role</strong>
      <div>${roleOptions || '<span class="muted-note">No roles yet</span>'}</div>
    </div>
    <p class="muted-note">Leave audience boxes empty to send to every active directory contact.</p>
  `;
}

function renderEmailGroups(groups) {
  if (!groups.length) {
    mailingGroupSelect.innerHTML = '<option disabled>No saved groups yet</option>';
    return;
  }

  mailingGroupSelect.innerHTML = groups
    .map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)} (${group.member_count})</option>`)
    .join("");
}

async function loadEmailGroups() {
  if (!mailingGroupSelect) return;
  const groups = await apiFetch("/api/admin/email-groups");
  renderEmailGroups(groups);
}

function updateSelectedContactCount() {
  const count = selectedContacts.size;
  selectedContactCount.textContent = `${count} selected`;
  mailingStatus.textContent = count
    ? `Selected mode active. The next email will go only to ${count} selected contact${count === 1 ? "" : "s"}.`
    : "";
}

function countFor(items, key) {
  return items.find((item) => item.value === key)?.count || 0;
}

function renderAdminStats(summary) {
  const directory = summary.directory || {};
  const subscribers = summary.subscribers || {};
  adminStats.innerHTML = `
    <article>
      <span>Pending posts</span>
      <strong>${countFor(summary.posts || [], "pending")}</strong>
    </article>
    <article>
      <span>Registered directory</span>
      <strong>${directory.active || 0}</strong>
      <small>${directory.verified || 0} verified</small>
    </article>
    <article>
      <span>Public-ready profiles</span>
      <strong>${directory.public_ready || 0}</strong>
    </article>
    <article>
      <span>Post subscribers</span>
      <strong>${subscribers.active || 0}</strong>
      <small>Separate list</small>
    </article>
  `;
}

async function loadAdminSummary() {
  if (!adminStats) return;
  const summary = await apiFetch("/api/admin/summary");
  renderAdminStats(summary);
}

function renderDirectoryContacts(contacts) {
  if (!contacts.length) {
    directoryContacts.innerHTML = '<p class="empty-state">No directory contacts match this view.</p>';
    return;
  }

  directoryContacts.innerHTML = contacts
    .map(
      (contact) => `
        <article class="directory-contact ${selectedContacts.has(String(contact.id)) ? "is-selected" : ""}">
          <label class="directory-select">
            <input
              type="checkbox"
              value="${escapeHtml(contact.id)}"
              ${selectedContacts.has(String(contact.id)) ? "checked" : ""}
              aria-label="Select ${escapeHtml(contact.name || contact.email)}"
              data-contact-select
            />
            <span>Select</span>
          </label>
          <div>
            <strong>${escapeHtml(contact.name || "Unnamed contact")}</strong>
            <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>
          </div>
          <div class="directory-badges">
            <span>${escapeHtml(contact.affiliation_status || "Unlisted")}</span>
            <span>${escapeHtml(contact.role)}</span>
            ${contact.is_faculty ? "<span>Faculty</span>" : ""}
            ${contact.verified_at ? "<span>Verified</span>" : "<span>Imported</span>"}
            ${contact.public_profile ? "<span>Public-ready</span>" : ""}
          </div>
          <p>${escapeHtml(contact.current_affiliation || contact.department || contact.interests || contact.event_preference || contact.source)}</p>
          ${
            contact.profile_link
              ? `<a class="directory-profile-link" href="${escapeHtml(contact.profile_link)}" target="_blank" rel="noopener noreferrer">Website / LinkedIn</a>`
              : ""
          }
          <small>${escapeHtml(contact.source)}</small>
        </article>
      `,
    )
    .join("");
}

async function loadDirectory() {
  if (!directoryContacts) return;

  directoryStatus.textContent = "Loading directory...";
  const params = new URLSearchParams();
  if (directorySearch.value.trim()) params.set("q", directorySearch.value.trim());
  if (directoryStatusFilter.value) params.set("status", directoryStatusFilter.value);
  if (directoryRoleFilter.value) params.set("role", directoryRoleFilter.value);

  const data = await apiFetch(`/api/admin/directory?${params.toString()}`);
  directoryFilters = data.filters;

  if (directoryStatusFilter.options.length <= 1) {
    renderOptions(directoryStatusFilter, directoryFilters.statuses, "All statuses");
  }
  if (directoryRoleFilter.options.length <= 1) {
    renderOptions(directoryRoleFilter, directoryFilters.roles, "All roles");
  }
  renderAudienceOptions(directoryFilters);
  visibleContacts = data.contacts;
  renderDirectoryContacts(data.contacts);
  directoryStatus.textContent = `${data.contacts.length} active contact${data.contacts.length === 1 ? "" : "s"} shown.`;
  updateSelectedContactCount();
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
    await loadAdminSummary();
    await loadDirectory();
    await loadEmailGroups();
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
    await loadAdminSummary();
  });
});

refreshButton.addEventListener("click", async () => {
  await loadPosts();
  await loadAdminSummary();
});

importDirectoryButton?.addEventListener("click", async () => {
  importDirectoryButton.disabled = true;
  directoryStatus.textContent = "Refreshing directory from seed data...";
  try {
    const result = await apiFetch("/api/admin/directory/import-seed", { method: "POST" });
    directoryStatus.textContent = `Directory refreshed with ${result.imported} seed contacts.`;
    directoryStatusFilter.innerHTML = '<option value="">All statuses</option>';
    directoryRoleFilter.innerHTML = '<option value="">All roles</option>';
    await loadDirectory();
    await loadAdminSummary();
    await loadEmailGroups();
  } catch (error) {
    directoryStatus.textContent = `Could not refresh directory: ${error.message}`;
  } finally {
    importDirectoryButton.disabled = false;
  }
});

directorySearch?.addEventListener("input", () => {
  window.clearTimeout(directorySearch.searchTimer);
  directorySearch.searchTimer = window.setTimeout(loadDirectory, 220);
});

directoryStatusFilter?.addEventListener("change", loadDirectory);
directoryRoleFilter?.addEventListener("change", loadDirectory);

directoryContacts?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-contact-select]");
  if (!checkbox) return;

  if (checkbox.checked) {
    selectedContacts.add(checkbox.value);
  } else {
    selectedContacts.delete(checkbox.value);
  }

  checkbox.closest(".directory-contact")?.classList.toggle("is-selected", checkbox.checked);
  updateSelectedContactCount();
});

createEmailGroup?.addEventListener("click", async () => {
  createEmailGroup.disabled = true;
  groupStatus.textContent = "Creating group...";
  try {
    const result = await apiFetch("/api/admin/email-groups", {
      method: "POST",
      body: JSON.stringify({
        name: groupName.value.trim(),
        description: "",
        pastedEmails: groupEmails.value,
        defaultRole: groupDefaultRole.value.trim() || "Event",
        defaultStatus: groupDefaultStatus.value.trim() || "Event group",
      }),
    });
    groupStatus.textContent = `${result.name}: ${result.parsed_count} email${result.parsed_count === 1 ? "" : "s"} parsed, ${result.added_count} new member${result.added_count === 1 ? "" : "s"} added.`;
    groupEmails.value = "";
    await loadDirectory();
    await loadEmailGroups();
    await loadAdminSummary();
  } catch (error) {
    groupStatus.textContent = `Could not create group: ${error.message}`;
  } finally {
    createEmailGroup.disabled = false;
  }
});

selectVisibleContacts?.addEventListener("click", () => {
  visibleContacts.forEach((contact) => selectedContacts.add(String(contact.id)));
  renderDirectoryContacts(visibleContacts);
  updateSelectedContactCount();
});

clearSelectedContacts?.addEventListener("click", () => {
  selectedContacts.clear();
  renderDirectoryContacts(visibleContacts);
  updateSelectedContactCount();
});

mailingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(mailingForm);
  const selectedContactIds = [...selectedContacts].map((id) => Number(id)).filter(Boolean);
  const groupIds = [...mailingGroupSelect.selectedOptions].map((option) => Number(option.value)).filter(Boolean);
  const payload = {
    subject: formData.get("subject").trim(),
    message: formData.get("message").trim(),
    statuses: formData.getAll("statusAudience"),
    roles: formData.getAll("roleAudience"),
    sources: [],
    selectedContactIds,
    groupIds,
    testEmail: formData.get("testEmail").trim() || null,
  };
  const audienceLabel =
    payload.testEmail ||
    (selectedContactIds.length
      ? `${selectedContactIds.length} selected contact${selectedContactIds.length === 1 ? "" : "s"}`
      : groupIds.length
        ? `${groupIds.length} saved group${groupIds.length === 1 ? "" : "s"}`
        : "the selected active directory audience");

  if (!window.confirm(`Send this email to ${audienceLabel}?`)) return;

  mailingStatus.textContent = "Sending...";
  try {
    const result = await apiFetch("/api/admin/mailing/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mailingStatus.textContent = `Campaign ${result.campaign_id}: ${result.sent_count} sent, ${result.failed_count} failed.`;
    if (!payload.testEmail && result.failed_count === 0) {
      mailingForm.reset();
      selectedContacts.clear();
      [...mailingGroupSelect.options].forEach((option) => {
        option.selected = false;
      });
      renderDirectoryContacts(visibleContacts);
      updateSelectedContactCount();
    }
    await loadAdminSummary();
  } catch (error) {
    mailingStatus.textContent = `Could not send email: ${error.message}`;
  }
});

logoutButton.addEventListener("click", () => {
  adminToken = "";
  window.sessionStorage.removeItem("urBanglaAdminToken");
  dashboard.hidden = true;
  loginSection.hidden = false;
  postsContainer.innerHTML = "";
  adminStats.innerHTML = "";
  directoryContacts.innerHTML = "";
});

if (adminToken) {
  Promise.all([loadPosts(), loadAdminSummary(), loadDirectory(), loadEmailGroups()])
    .then(() => {
      loginSection.hidden = true;
      dashboard.hidden = false;
    })
    .catch(() => {
      window.sessionStorage.removeItem("urBanglaAdminToken");
    });
}
