const API_BASE = window.UR_BANGLA_API_BASE || "https://jerin-api.flyai.online/x006";

const previewSection = document.querySelector("#directoryPreview");
const accessSection = document.querySelector("#directoryAccess");
const accessForm = document.querySelector("#directoryAccessForm");
const verifyForm = document.querySelector("#directoryVerifyForm");
const accessStatus = document.querySelector("#accessStatus");
const verifyStatus = document.querySelector("#verifyStatus");
const changeAccessEmail = document.querySelector("#changeAccessEmail");
const directorySection = document.querySelector("#memberDirectory");
const directorySort = document.querySelector("#directorySort");
const refreshDirectoryMembers = document.querySelector("#refreshDirectoryMembers");
const closeDirectory = document.querySelector("#closeDirectory");
const memberStatus = document.querySelector("#memberStatus");
const memberGrid = document.querySelector("#memberGrid");
const directoryIndex = document.querySelector("#directoryIndex");
const directorySearch = document.querySelector("#directorySearch");
const alreadyRegisteredLink = document.querySelector('[href="#directoryAccess"]');

const DIRECTORY_TOKEN_KEY = "urBanglaDirectoryToken";
const DIRECTORY_TOKEN_EXPIRY_KEY = "urBanglaDirectoryTokenExpiry";
let pendingEmail = "";
let directoryToken = window.localStorage.getItem(DIRECTORY_TOKEN_KEY) || "";
let allMembers = [];

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
    return label.length > 44 ? `${label.slice(0, 41)}...` : label;
  } catch (error) {
    return rawUrl.length > 44 ? `${rawUrl.slice(0, 41)}...` : rawUrl;
  }
}

function safeExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
}

function memberInitials(name) {
  return String(name || "Member")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function clearSavedAccess() {
  directoryToken = "";
  window.localStorage.removeItem(DIRECTORY_TOKEN_KEY);
  window.localStorage.removeItem(DIRECTORY_TOKEN_EXPIRY_KEY);
}

function hasUnexpiredSavedAccess() {
  if (!directoryToken) return false;
  const expiresAt = window.localStorage.getItem(DIRECTORY_TOKEN_EXPIRY_KEY);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    clearSavedAccess();
    return false;
  }
  return true;
}

async function readApiError(response) {
  try {
    const data = await response.json();
    return data.detail || `Request failed with ${response.status}`;
  } catch (error) {
    return `Request failed with ${response.status}`;
  }
}

function directoryHeaders() {
  return {
    Authorization: `Bearer ${directoryToken}`,
  };
}

function directoryGroup(member) {
  if (directorySort.value === "department") {
    return member.department?.trim() || "Other affiliations";
  }
  const firstCharacter = String(member.name || "#").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
}

function renderMembers() {
  const query = directorySearch.value.trim().toLowerCase();
  const members = allMembers.filter((member) => {
    if (!query) return true;
    return [member.name, member.role, member.department, member.current_affiliation, member.graduation_year]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  if (!members.length) {
    directoryIndex.innerHTML = "";
    memberGrid.innerHTML = '<p class="empty-state">No verified directory profiles are visible yet.</p>';
    memberStatus.textContent = query ? `No members match "${directorySearch.value.trim()}".` : "No members to display.";
    return;
  }

  const groups = new Map();
  members.forEach((member) => {
    const group = directoryGroup(member);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(member);
  });

  const groupEntries = [...groups.entries()];
  directoryIndex.innerHTML = groupEntries
    .map(
      ([group]) =>
        `<a href="#directory-group-${escapeHtml(encodeURIComponent(group))}" title="${escapeHtml(group)}">${escapeHtml(group)}</a>`,
    )
    .join("");

  memberGrid.innerHTML = groupEntries
    .map(([group, groupMembers]) => {
      const rows = groupMembers
        .map((member) => {
          const profileUrl = member.profile_link ? safeExternalUrl(member.profile_link) : "";
          const link = profileUrl
            ? `<a class="directory-profile-link" href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(shortLinkLabel(profileUrl))}">Profile</a>`
            : "";
          const affiliation = member.current_affiliation || member.department || "Affiliation not listed";
          const role = member.is_faculty ? "Faculty" : member.role || "Member";

          return `
            <article class="member-row">
              <span class="member-avatar" aria-hidden="true">${escapeHtml(memberInitials(member.name))}</span>
              <div class="member-identity">
                <strong>${escapeHtml(member.name || "Unnamed member")}</strong>
                <a href="mailto:${escapeHtml(member.email)}">${escapeHtml(member.email)}</a>
              </div>
              <div class="member-affiliation">
                <span>${escapeHtml(affiliation)}</span>
                ${member.graduation_year ? `<small>Class of ${escapeHtml(member.graduation_year)}</small>` : ""}
              </div>
              <div class="member-row-actions">
                <span class="member-role">${escapeHtml(role)}</span>
                ${link}
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="directory-group" id="directory-group-${escapeHtml(encodeURIComponent(group))}">
          <header>
            <h3>${escapeHtml(group)}</h3>
            <span>${groupMembers.length}</span>
          </header>
          <div>${rows}</div>
        </section>
      `;
    })
    .join("");

  memberStatus.textContent = `${members.length} member${members.length === 1 ? "" : "s"}${query ? " found" : ""}`;
}

async function loadMembers() {
  if (!directoryToken) return;

  memberStatus.textContent = "Loading directory...";
  const sort = directorySort.value || "name";
  const response = await fetch(`${API_BASE}/api/directory/members?sort=${encodeURIComponent(sort)}`, {
    headers: directoryHeaders(),
  });

  if (!response.ok) {
    clearSavedAccess();
    previewSection.hidden = false;
    accessSection.hidden = false;
    directorySection.hidden = true;
    throw new Error(await readApiError(response));
  }

  const members = await response.json();
  allMembers = members;
  renderMembers();
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pendingEmail = new FormData(accessForm).get("email").trim().toLowerCase();
  accessStatus.textContent = "Sending access code...";

  try {
    const response = await fetch(`${API_BASE}/api/directory/access/request-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: pendingEmail }),
    });

    if (!response.ok) throw new Error(await readApiError(response));

    accessStatus.textContent = "Access code sent. Check your email.";
    accessForm.hidden = true;
    verifyForm.hidden = false;
    verifyForm.elements.code.focus();
  } catch (error) {
    accessStatus.textContent = `Could not send access code: ${error.message}.`;
  }
});

verifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = new FormData(verifyForm).get("code").trim();
  verifyStatus.textContent = "Verifying...";

  try {
    const response = await fetch(`${API_BASE}/api/directory/access/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: pendingEmail, code }),
    });

    if (!response.ok) throw new Error(await readApiError(response));

    const result = await response.json();
    directoryToken = result.token;
    window.localStorage.setItem(DIRECTORY_TOKEN_KEY, directoryToken);
    window.localStorage.setItem(DIRECTORY_TOKEN_EXPIRY_KEY, result.expires_at || "");
    verifyForm.reset();
    previewSection.hidden = true;
    accessSection.hidden = true;
    directorySection.hidden = false;
    await loadMembers();
  } catch (error) {
    verifyStatus.textContent = `Could not open directory: ${error.message}.`;
  }
});

changeAccessEmail.addEventListener("click", () => {
  verifyForm.hidden = true;
  accessForm.hidden = false;
  verifyStatus.textContent = "";
  accessStatus.textContent = "Enter your registered email to request a fresh code.";
});

directorySort.addEventListener("change", () => {
  loadMembers().catch((error) => {
    memberStatus.textContent = `Could not load directory: ${error.message}`;
  });
});

directorySearch.addEventListener("input", renderMembers);

refreshDirectoryMembers.addEventListener("click", () => {
  loadMembers().catch((error) => {
    memberStatus.textContent = `Could not refresh directory: ${error.message}`;
  });
});

closeDirectory.addEventListener("click", () => {
  clearSavedAccess();
  allMembers = [];
  directorySearch.value = "";
  directorySection.hidden = true;
  previewSection.hidden = false;
  accessSection.hidden = false;
  accessForm.hidden = false;
  verifyForm.hidden = true;
  memberGrid.innerHTML = "";
  directoryIndex.innerHTML = "";
});

alreadyRegisteredLink?.addEventListener("click", (event) => {
  event.preventDefault();
  accessSection.hidden = false;
  accessSection.scrollIntoView({ behavior: "smooth", block: "start" });
  accessForm.hidden = false;
  verifyForm.hidden = true;
  accessForm.elements.email.focus({ preventScroll: true });
});

async function resumeSavedAccess() {
  if (!hasUnexpiredSavedAccess()) return;

  previewSection.hidden = true;
  accessSection.hidden = true;
  directorySection.hidden = false;
  memberStatus.textContent = "Checking saved access...";

  try {
    await loadMembers();
  } catch (error) {
    memberStatus.textContent = "";
    accessStatus.textContent = "Your saved access has expired. Request a new code to continue.";
  }
}

resumeSavedAccess();
