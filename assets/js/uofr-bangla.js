const DATA_URL = "data/uofr-bangla.json";
const API_BASE = window.UR_BANGLA_API_BASE || "https://jerin-api.flyai.online/x006";

const state = {
  settings: {},
  sections: [],
};

const sectionGrid = document.querySelector("#sectionGrid");
const sectionSelect = document.querySelector("#sectionSelect");
const form = document.querySelector("#experienceForm");
const formStatus = document.querySelector("#formStatus");
const subscribeForm = document.querySelector("#subscribeForm");
const subscribeStatus = document.querySelector("#subscribeStatus");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("#siteNav");
const statMembers = document.querySelector('[data-stat="members"]');
const statCommittee = document.querySelector('[data-stat="committee"]');
const statEvents = document.querySelector('[data-stat="events"]');
const postEditorDialog = document.querySelector("#postEditorDialog");
const closePostEditor = document.querySelector("#closePostEditor");
const postAccessGate = document.querySelector("#postAccessGate");
const postComposer = document.querySelector("#postComposer");
const postAccessForm = document.querySelector("#postAccessForm");
const postVerifyForm = document.querySelector("#postVerifyForm");
const postAccessStatus = document.querySelector("#postAccessStatus");
const postVerifyStatus = document.querySelector("#postVerifyStatus");
const changePostEmail = document.querySelector("#changePostEmail");
const changePostAccount = document.querySelector("#changePostAccount");
const postMemberIdentity = document.querySelector("#postMemberIdentity");
const postExperienceEditor = document.querySelector("#postExperienceEditor");
const postCharacterCount = document.querySelector("#postCharacterCount");
const postImage = document.querySelector("#postImage");
const postImagePreview = document.querySelector("#postImagePreview");
const removePostImage = document.querySelector("#removePostImage");
const postAttachment = document.querySelector("#postAttachment");
const postAttachmentStatus = document.querySelector("#postAttachmentStatus");
const savePostDraft = document.querySelector("#savePostDraft");
const clearPostDraft = document.querySelector("#clearPostDraft");
const postDetailDialog = document.querySelector("#postDetailDialog");
const postDetailSection = document.querySelector("#postDetailSection");
const postDetailTitle = document.querySelector("#postDetailTitle");
const postDetailMeta = document.querySelector("#postDetailMeta");
const postDetailBody = document.querySelector("#postDetailBody");
const closePostDetail = document.querySelector("#closePostDetail");

const DIRECTORY_TOKEN_KEY = "urBanglaDirectoryToken";
const DIRECTORY_TOKEN_EXPIRY_KEY = "urBanglaDirectoryTokenExpiry";
const POST_DRAFT_KEY = "urBanglaPostDraft";
const MAX_POST_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_POST_PDF_BYTES = 3 * 1024 * 1024;
const MAX_POST_CHARACTERS = 7500;
const MAX_POST_HTML_CHARACTERS = 15000;
let directoryToken = window.localStorage.getItem(DIRECTORY_TOKEN_KEY) || "";
let pendingPostEmail = "";
let requestedSection = "";
let postImagePreviewUrl = "";
let renderedPostCounter = 0;
const postDetails = new Map();

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function escapeHtml(value) {
  return String(value)
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

function sanitizePostMarkup(value, fallback) {
  if (!value) return linkifyText(fallback);

  const template = document.createElement("template");
  template.innerHTML = value;
  const allowedTags = new Set(["A", "B", "BR", "DIV", "EM", "I", "LI", "OL", "P", "STRONG", "U", "UL"]);
  const blockedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"]);

  [...template.content.querySelectorAll("*")].forEach((element) => {
    if (blockedTags.has(element.tagName)) {
      element.remove();
      return;
    }
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    const rawHref = element.tagName === "A" ? element.getAttribute("href") || "" : "";
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));
    if (element.tagName === "A") {
      try {
        const url = new URL(rawHref, window.location.href);
        if (!["http:", "https:", "mailto:"].includes(url.protocol)) throw new Error("Unsupported link");
        element.href = url.href;
        element.target = "_blank";
        element.rel = "noopener noreferrer nofollow";
      } catch (error) {
        element.replaceWith(...element.childNodes);
      }
    }
  });

  return template.innerHTML || linkifyText(fallback);
}

function safeImageUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
}

function resolveLink(link) {
  return link.url || state.settings[link.settingKey] || "#share";
}

function renderLinks(section) {
  if (!section.links?.length) return "";

  return `
    <div class="resource-links">
      ${section.links
        .map(
          (link) => `
            <a href="${escapeHtml(resolveLink(link))}" target="_blank" rel="noopener">
              ${escapeHtml(link.label)}
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderExperience(item) {
  const name = item.visibility === "anonymous" ? "Anonymous" : item.name || "Community member";
  const imageUrl = safeImageUrl(item.thumbnailUrl || item.imageUrl || "");
  const detailKey = item.id ? `post-${item.id}` : `guide-${renderedPostCounter++}`;
  const title = item.title || "Community experience";
  const excerptSource = String(item.experience || "").replace(/\s+/g, " ").trim();
  const excerpt = excerptSource.length > 240 ? `${excerptSource.slice(0, 237)}...` : excerptSource;
  postDetails.set(detailKey, item);

  return `
    <article class="experience-card">
      ${imageUrl ? `<img class="experience-thumbnail" src="${escapeHtml(imageUrl)}" alt="Photo shared with this experience" loading="lazy" decoding="async" />` : ""}
      <div class="experience-meta">
        <strong>${escapeHtml(name)}</strong>
        <time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>
      </div>
      <h4>${escapeHtml(title)}</h4>
      <p class="experience-excerpt">${escapeHtml(excerpt)}</p>
      <div class="experience-card-actions">
        ${item.attachmentName ? `<span class="attachment-badge">PDF attached</span>` : ""}
        <button class="text-action" type="button" data-post-detail="${escapeHtml(detailKey)}">Read full experience</button>
      </div>
    </article>
  `;
}

navToggle?.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav?.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  siteNav.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
});

async function loadApprovedPosts() {
  const response = await fetch(`${API_BASE}/api/posts?status=approved`);
  if (!response.ok) return [];
  return response.json();
}

async function loadCommunityStats() {
  try {
    const response = await fetch(`${API_BASE}/api/community-stats`);
    if (!response.ok) throw new Error("Stats unavailable");
    const stats = await response.json();
    if (statMembers) statMembers.textContent = stats.members ?? 23;
    if (statCommittee) statCommittee.textContent = stats.committee ?? 4;
    if (statEvents) statEvents.textContent = stats.events ?? 2;
  } catch (error) {
    if (statMembers) statMembers.textContent = "23";
    if (statCommittee) statCommittee.textContent = "4";
    if (statEvents) statEvents.textContent = "2";
  }
}

function mergeApprovedPosts(posts) {
  posts.forEach((post) => {
    const section = state.sections.find((item) => item.id === post.section);
    if (!section || section.readOnly) return;

    section.experiences.unshift({
      id: post.id,
      title: post.title,
      sectionTitle: post.section_title,
      name: post.name || "Anonymous",
      date: post.display_date,
      visibility: post.visibility,
      experience: post.experience,
      experienceHtml: post.experience_html,
      imageUrl: post.image_url,
      thumbnailUrl: post.thumbnail_url,
      attachmentName: post.attachment_name,
      attachmentUrl: post.attachment_url,
    });
  });
}

function renderFacultyMember(member) {
  return `
    <article class="faculty-card">
      <img src="${escapeHtml(member.image)}" alt="${escapeHtml(member.name)}" loading="lazy" />
      <div>
        <h4>${escapeHtml(member.name)}</h4>
        <p>${escapeHtml(member.title)}</p>
        <span>${escapeHtml(member.department)}</span>
        <div class="faculty-actions">
          <a href="mailto:${escapeHtml(member.email)}">${escapeHtml(member.email)}</a>
          <a href="${escapeHtml(member.profile)}" target="_blank" rel="noopener">Profile</a>
        </div>
      </div>
    </article>
  `;
}

function renderFacultySection(section) {
  return `
    <div class="faculty-grid">
      ${section.faculty.map(renderFacultyMember).join("")}
    </div>
  `;
}

function renderPrompts(section) {
  if (!section.prompts?.length) return "";

  return `
    <div class="prompt-list">
      ${section.prompts.map((prompt) => `<span>${escapeHtml(prompt)}</span>`).join("")}
    </div>
  `;
}

function renderExperiences(section) {
  if (section.readOnly) return "";

  return `
    <div class="experiences" data-section-experiences="${escapeHtml(section.id)}">
      ${section.experiences.map(renderExperience).join("")}
    </div>
    <button class="mini-action" type="button" data-section-target="${escapeHtml(section.id)}">Add to this section</button>
  `;
}

function renderSectionMedia(section) {
  const images = section.images?.length ? section.images : [section.image];

  if (images.length === 1) {
    return `
      <div class="section-photo">
        <img src="${escapeHtml(images[0])}" alt="" loading="lazy" />
      </div>
    `;
  }

  return `
    <div class="section-photo section-carousel" data-carousel>
      ${images
        .map(
          (image, imageIndex) => `
            <img
              src="${escapeHtml(image)}"
              alt=""
              loading="lazy"
              class="${imageIndex === 0 ? "is-active" : ""}"
              data-carousel-image
            />
          `,
        )
        .join("")}
      <div class="carousel-dots" aria-label="${escapeHtml(section.title)} photos">
        ${images
          .map(
            (_, imageIndex) => `
              <button
                type="button"
                class="${imageIndex === 0 ? "is-active" : ""}"
                aria-label="Show photo ${imageIndex + 1}"
                data-carousel-dot="${imageIndex}"
              ></button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function initCarousels() {
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const images = [...carousel.querySelectorAll("[data-carousel-image]")];
    const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
    let activeIndex = 0;

    const showSlide = (nextIndex) => {
      activeIndex = nextIndex;
      images.forEach((image, index) => image.classList.toggle("is-active", index === activeIndex));
      dots.forEach((dot, index) => dot.classList.toggle("is-active", index === activeIndex));
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => showSlide(index));
    });

    window.setInterval(() => {
      showSlide((activeIndex + 1) % images.length);
    }, 3600);
  });
}

function renderSections() {
  postDetails.clear();
  renderedPostCounter = 0;
  sectionGrid.innerHTML = state.sections
    .map(
      (section, index) => `
        <article
          class="guide-section reveal ${section.faculty?.length ? "faculty-section" : ""}"
          id="${escapeHtml(section.id)}"
          style="--delay: ${index * 80}ms"
        >
          ${renderSectionMedia(section)}
          <div class="section-body">
            <p class="section-kicker">${escapeHtml(section.kicker)}</p>
            <h3>${escapeHtml(section.title)}</h3>
            <p>${escapeHtml(section.summary)}</p>
            ${renderLinks(section)}
            ${section.faculty?.length ? renderFacultySection(section) : ""}
            ${renderPrompts(section)}
            ${renderExperiences(section)}
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll("[data-section-target]").forEach((button) => {
    button.addEventListener("click", () => {
      openPostEditor(button.dataset.sectionTarget);
    });
  });

  document.querySelectorAll("[data-post-detail]").forEach((button) => {
    button.addEventListener("click", () => openPostDetail(button.dataset.postDetail));
  });

  initCarousels();
  revealOnScroll();
}

function populateSelect() {
  sectionSelect.innerHTML = state.sections
    .filter((section) => !section.readOnly)
    .map((section) => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title)}</option>`)
    .join("");
}

function revealOnScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function appendExperience(payload) {
  const container = document.querySelector(`[data-section-experiences="${payload.section}"]`);
  if (!container) return;

  container.insertAdjacentHTML(
    "afterbegin",
    renderExperience({
      name: payload.name,
      date: payload.date,
      visibility: payload.visibility,
      experience: payload.experience,
      experienceHtml: payload.experienceHtml,
      imageUrl: payload.imageUrl,
    }),
  );
}

function openPostDetail(detailKey) {
  const item = postDetails.get(detailKey);
  if (!item) return;

  const name = item.visibility === "anonymous" ? "Anonymous" : item.name || "Community member";
  const sectionTitle =
    item.sectionTitle || state.sections.find((section) => section.id === item.section)?.title || "Community guide";
  const imageUrl = safeImageUrl(item.imageUrl || "");
  const attachmentUrl = safeImageUrl(item.attachmentUrl || "");

  postDetailSection.textContent = sectionTitle;
  postDetailTitle.textContent = item.title || "Community experience";
  postDetailMeta.innerHTML = `
    <strong>${escapeHtml(name)}</strong>
    <time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>
  `;
  postDetailBody.innerHTML = `
    ${imageUrl ? `<img class="post-detail-image" src="${escapeHtml(imageUrl)}" alt="Photo shared with this experience" />` : ""}
    <div class="experience-content">${sanitizePostMarkup(item.experienceHtml, item.experience)}</div>
    ${
      attachmentUrl
        ? `<a class="attachment-download" href="${escapeHtml(attachmentUrl)}" download rel="noopener">Download PDF · ${escapeHtml(item.attachmentName || "Attachment.pdf")}</a>`
        : ""
    }
  `;
  postDetailDialog.showModal();
}

closePostDetail.addEventListener("click", () => postDetailDialog.close());
postDetailDialog.addEventListener("click", (event) => {
  if (event.target === postDetailDialog) postDetailDialog.close();
});

async function readApiError(response) {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (data.detail) return JSON.stringify(data.detail);
    return `Request failed with ${response.status}`;
  } catch (error) {
    return `Request failed with ${response.status}`;
  }
}

function clearDirectoryAccess() {
  directoryToken = "";
  window.localStorage.removeItem(DIRECTORY_TOKEN_KEY);
  window.localStorage.removeItem(DIRECTORY_TOKEN_EXPIRY_KEY);
}

function showPostAccessGate(message = "") {
  postAccessGate.hidden = false;
  postComposer.hidden = true;
  postAccessStatus.textContent = message;
}

function restorePostDraft() {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem(POST_DRAFT_KEY) || "null");
    if (!draft) return;
    if (draft.section && [...sectionSelect.options].some((option) => option.value === draft.section)) {
      sectionSelect.value = draft.section;
    }
    form.elements.title.value = draft.title || "";
    form.elements.name.value = draft.name || "";
    form.elements.date.value = draft.date || "";
    const visibility = form.querySelector(`[name="visibility"][value="${draft.visibility}"]`);
    if (visibility) visibility.checked = true;
    postExperienceEditor.innerHTML = draft.experienceHtml || "";
    updatePostCharacterCount();
    formStatus.textContent = "Session draft restored. Re-select a photo before submitting.";
  } catch (error) {
    window.sessionStorage.removeItem(POST_DRAFT_KEY);
  }
}

function updatePostCharacterCount() {
  const count = postExperienceEditor.innerText.length;
  postCharacterCount.textContent = `${count.toLocaleString()} / ${MAX_POST_CHARACTERS.toLocaleString()}`;
  postCharacterCount.classList.toggle("is-over-limit", count > MAX_POST_CHARACTERS);
}

function showPostComposer(member) {
  postAccessGate.hidden = true;
  postComposer.hidden = false;
  postMemberIdentity.textContent = `Verified as ${member.name || member.email}`;
  if (!form.elements.name.value && member.name) form.elements.name.value = member.name;
  restorePostDraft();
  if (requestedSection && [...sectionSelect.options].some((option) => option.value === requestedSection)) {
    sectionSelect.value = requestedSection;
  }
  if (!form.elements.date.value) form.elements.date.valueAsDate = new Date();
  postExperienceEditor.focus();
}

async function verifyPostSession() {
  if (!directoryToken) return null;
  const expiresAt = window.localStorage.getItem(DIRECTORY_TOKEN_EXPIRY_KEY);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    clearDirectoryAccess();
    return null;
  }

  const response = await fetch(`${API_BASE}/api/directory/session`, {
    headers: { Authorization: `Bearer ${directoryToken}` },
  });
  if (!response.ok) {
    clearDirectoryAccess();
    return null;
  }
  return response.json();
}

async function openPostEditor(section = "") {
  requestedSection = section;
  if (!postEditorDialog.open) postEditorDialog.showModal();
  formStatus.textContent = "";
  postAccessStatus.textContent = "Checking member access...";

  try {
    const member = await verifyPostSession();
    if (member) {
      showPostComposer(member);
    } else {
      showPostAccessGate("Enter your registered email to continue.");
    }
  } catch (error) {
    showPostAccessGate("Member access could not be checked. Please try again.");
  }
}

function removeSelectedPostImage() {
  if (postImagePreviewUrl) window.URL.revokeObjectURL(postImagePreviewUrl);
  postImagePreviewUrl = "";
  postImage.value = "";
  postImagePreview.hidden = true;
  postImagePreview.querySelector("img").removeAttribute("src");
}

function validatePostImage(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_POST_IMAGE_BYTES) return "The image must be 2 MB or smaller.";
  return "";
}

function validatePostPdf(file) {
  if (!file) return "";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Choose a PDF attachment.";
  }
  if (file.size > MAX_POST_PDF_BYTES) return "The PDF attachment must be 3 MB or smaller.";
  return "";
}

function saveCurrentPostDraft() {
  const formData = new FormData(form);
  const draft = {
    section: formData.get("section"),
    title: formData.get("title").trim(),
    name: formData.get("name").trim(),
    date: formData.get("date"),
    visibility: formData.get("visibility"),
    experienceHtml: postExperienceEditor.innerHTML,
  };
  window.sessionStorage.setItem(POST_DRAFT_KEY, JSON.stringify(draft));
  formStatus.textContent = "Draft saved for this browser tab. Photos and PDFs are not stored in drafts.";
}

postAccessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  pendingPostEmail = new FormData(postAccessForm).get("email").trim().toLowerCase();
  postAccessStatus.textContent = "Sending access code...";

  try {
    const response = await fetch(`${API_BASE}/api/directory/access/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingPostEmail }),
    });
    if (!response.ok) throw new Error(await readApiError(response));
    postAccessStatus.textContent = "Access code sent. Check your email.";
    postAccessForm.hidden = true;
    postVerifyForm.hidden = false;
    postVerifyForm.elements.code.focus();
  } catch (error) {
    postAccessStatus.textContent = `Could not send access code: ${error.message}.`;
  }
});

postVerifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  postVerifyStatus.textContent = "Verifying...";
  const code = new FormData(postVerifyForm).get("code").trim();

  try {
    const response = await fetch(`${API_BASE}/api/directory/access/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingPostEmail, code }),
    });
    if (!response.ok) throw new Error(await readApiError(response));
    const result = await response.json();
    directoryToken = result.token;
    window.localStorage.setItem(DIRECTORY_TOKEN_KEY, result.token);
    window.localStorage.setItem(DIRECTORY_TOKEN_EXPIRY_KEY, result.expires_at || "");
    postVerifyForm.reset();
    showPostComposer({ name: "", email: pendingPostEmail });
  } catch (error) {
    postVerifyStatus.textContent = `Could not verify access: ${error.message}.`;
  }
});

changePostEmail.addEventListener("click", () => {
  postVerifyForm.hidden = true;
  postAccessForm.hidden = false;
  postVerifyStatus.textContent = "";
});

changePostAccount.addEventListener("click", () => {
  clearDirectoryAccess();
  postAccessForm.hidden = false;
  postVerifyForm.hidden = true;
  showPostAccessGate("Enter another registered email.");
});

document.querySelectorAll("[data-open-post-editor]").forEach((button) => {
  button.addEventListener("click", () => openPostEditor());
});

closePostEditor.addEventListener("click", () => postEditorDialog.close());
postEditorDialog.addEventListener("click", (event) => {
  if (event.target === postEditorDialog) postEditorDialog.close();
});

document.querySelectorAll("[data-post-format]").forEach((button) => {
  button.addEventListener("click", () => {
    postExperienceEditor.focus();
    const command = button.dataset.postFormat;
    if (command === "createLink") {
      const rawUrl = window.prompt("Paste a website link")?.trim() || "";
      if (!rawUrl) return;
      try {
        const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
        document.execCommand("createLink", false, url.href);
        updatePostCharacterCount();
      } catch (error) {
        formStatus.textContent = "Enter a valid website link.";
      }
      return;
    }
    document.execCommand(command, false, null);
    updatePostCharacterCount();
  });
});

postExperienceEditor.addEventListener("input", updatePostCharacterCount);

postImage.addEventListener("change", () => {
  const file = postImage.files[0];
  const imageError = validatePostImage(file);
  if (imageError) {
    removeSelectedPostImage();
    formStatus.textContent = imageError;
    return;
  }
  if (postImagePreviewUrl) window.URL.revokeObjectURL(postImagePreviewUrl);
  postImagePreviewUrl = window.URL.createObjectURL(file);
  postImagePreview.querySelector("img").src = postImagePreviewUrl;
  postImagePreview.hidden = false;
  formStatus.textContent = "";
});

postAttachment.addEventListener("change", () => {
  const file = postAttachment.files[0];
  const attachmentError = validatePostPdf(file);
  if (attachmentError) {
    postAttachment.value = "";
    postAttachmentStatus.hidden = true;
    formStatus.textContent = attachmentError;
    return;
  }
  postAttachmentStatus.textContent = file ? `${file.name} · ${(file.size / (1024 * 1024)).toFixed(2)} MB` : "";
  postAttachmentStatus.hidden = !file;
  formStatus.textContent = "";
});

removePostImage.addEventListener("click", removeSelectedPostImage);
savePostDraft.addEventListener("click", () => {
  try {
    saveCurrentPostDraft();
  } catch (error) {
    formStatus.textContent = "This browser could not save the draft.";
  }
});
clearPostDraft.addEventListener("click", () => {
  window.sessionStorage.removeItem(POST_DRAFT_KEY);
  form.reset();
  postExperienceEditor.innerHTML = "";
  updatePostCharacterCount();
  removeSelectedPostImage();
  postAttachmentStatus.hidden = true;
  form.elements.date.valueAsDate = new Date();
  if (requestedSection) sectionSelect.value = requestedSection;
  formStatus.textContent = "Draft cleared.";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const plainExperience = postExperienceEditor.innerText.trim();
  if (plainExperience.length < 20) {
    formStatus.textContent = "Please write at least 20 characters before submitting.";
    postExperienceEditor.focus();
    return;
  }
  if (plainExperience.length > MAX_POST_CHARACTERS || postExperienceEditor.innerHTML.length > MAX_POST_HTML_CHARACTERS) {
    formStatus.textContent = "The post is too long. Keep it below 7,500 characters.";
    return;
  }

  const formValues = new FormData(form);
  const visibility = formValues.get("visibility");
  const displayName = formValues.get("name").trim();
  if (visibility === "credible" && !displayName) {
    formStatus.textContent = "Add a display name for a credible post.";
    form.elements.name.focus();
    return;
  }
  const imageFile = postImage.files[0];
  const imageError = validatePostImage(imageFile);
  if (imageError) {
    formStatus.textContent = imageError;
    return;
  }
  const attachmentFile = postAttachment.files[0];
  const attachmentError = validatePostPdf(attachmentFile);
  if (attachmentError) {
    formStatus.textContent = attachmentError;
    return;
  }

  const section = formValues.get("section");
  const submission = new FormData();
  submission.append("section", section);
  submission.append("title", formValues.get("title").trim());
  submission.append("name", visibility === "anonymous" ? "" : displayName);
  submission.append("date", formValues.get("date"));
  submission.append("visibility", visibility);
  submission.append("experience", plainExperience);
  submission.append("experienceHtml", postExperienceEditor.innerHTML);
  if (imageFile) submission.append("image", imageFile);
  if (attachmentFile) submission.append("attachment", attachmentFile);

  formStatus.textContent = "Sending...";

  try {
    const response = await fetch(`${API_BASE}/api/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${directoryToken}` },
      body: submission,
    });
    if (!response.ok) {
      if (response.status === 401) {
        clearDirectoryAccess();
        showPostAccessGate("Your member access expired. Verify your email again.");
      }
      throw new Error(await readApiError(response));
    }

    form.reset();
    postExperienceEditor.innerHTML = "";
    updatePostCharacterCount();
    removeSelectedPostImage();
    postAttachmentStatus.hidden = true;
    window.sessionStorage.removeItem(POST_DRAFT_KEY);
    form.elements.date.valueAsDate = new Date();
    formStatus.textContent = "Submitted for moderation. It will appear after admin approval.";
  } catch (error) {
    formStatus.textContent = `Could not submit right now: ${error.message}.`;
  }
});

subscribeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(subscribeForm);
  subscribeStatus.textContent = "Subscribing...";

  try {
    const response = await fetch(`${API_BASE}/api/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: formData.get("email").trim(),
        name: formData.get("name").trim(),
      }),
    });

    if (!response.ok) throw new Error(await readApiError(response));

    subscribeForm.reset();
    subscribeStatus.textContent = "Subscribed. You will receive free updates when posts are approved.";
  } catch (error) {
    subscribeStatus.textContent = `Could not subscribe right now: ${error.message}.`;
  }
});

async function init() {
  loadCommunityStats();

  try {
    const response = await fetch(DATA_URL);
    const data = await response.json();
    state.settings = data.settings || {};
    state.sections = data.sections || [];
    try {
      mergeApprovedPosts(await loadApprovedPosts());
    } catch (error) {
      console.warn("Approved posts could not be loaded from backend.");
    }
    populateSelect();
    renderSections();
    form.elements.date.valueAsDate = new Date();
  } catch (error) {
    sectionGrid.innerHTML = '<p class="load-error">Could not load the guide data. Check data/uofr-bangla.json.</p>';
  }
}

init();
