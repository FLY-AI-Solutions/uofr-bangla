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

  return `
    <article class="experience-card">
      <div class="experience-meta">
        <strong>${escapeHtml(name)}</strong>
        <time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>
      </div>
      <p>${escapeHtml(item.experience)}</p>
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

function mergeApprovedPosts(posts) {
  posts.forEach((post) => {
    const section = state.sections.find((item) => item.id === post.section);
    if (!section || section.readOnly) return;

    section.experiences.unshift({
      name: post.name || "Anonymous",
      date: post.display_date,
      visibility: post.visibility,
      experience: post.experience,
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
    <a class="mini-action" href="#share" data-section-target="${escapeHtml(section.id)}">Add to this section</a>
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

  document.querySelectorAll("[data-section-target]").forEach((link) => {
    link.addEventListener("click", () => {
      sectionSelect.value = link.dataset.sectionTarget;
    });
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
    }),
  );
}

async function sendToGoogleSheets(payload) {
  const endpoint = state.settings.googleSheetsEndpoint;

  if (!endpoint) {
    return { skipped: true };
  }

  await fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return { skipped: false };
}

async function submitToBackend(payload) {
  const response = await fetch(`${API_BASE}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

async function readApiError(response) {
  try {
    const data = await response.json();
    return data.detail || `Request failed with ${response.status}`;
  } catch (error) {
    return `Request failed with ${response.status}`;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    section: formData.get("section"),
    sectionTitle: state.sections.find((section) => section.id === formData.get("section"))?.title || "",
    name: formData.get("visibility") === "anonymous" ? "" : formData.get("name").trim(),
    date: formData.get("date"),
    visibility: formData.get("visibility"),
    experience: formData.get("experience").trim(),
    submittedAt: new Date().toISOString(),
  };

  formStatus.textContent = "Sending...";

  try {
    await submitToBackend(payload);
    await sendToGoogleSheets(payload);
    form.reset();
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
