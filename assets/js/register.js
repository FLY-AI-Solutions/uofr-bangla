const API_BASE = window.UR_BANGLA_API_BASE || "https://jerin-api.flyai.online/x006";

const registrationForm = document.querySelector("#directoryRegistrationForm");
const otpForm = document.querySelector("#directoryOtpForm");
const registrationStatus = document.querySelector("#registrationStatus");
const otpStatus = document.querySelector("#otpStatus");
const editRegistration = document.querySelector("#editRegistration");
const roleSelect = document.querySelector("#directoryRole");
const currentAffiliationLabel = document.querySelector("#currentAffiliationLabel");

let pendingEmail = "";

async function readApiError(response) {
  try {
    const data = await response.json();
    return data.detail || `Request failed with ${response.status}`;
  } catch (error) {
    return `Request failed with ${response.status}`;
  }
}

function updateAffiliationHint() {
  const input = currentAffiliationLabel.querySelector("input");
  if (roleSelect.value === "Alumni") {
    input.placeholder = "Current company, university, role, or city";
    currentAffiliationLabel.classList.add("is-emphasized");
  } else {
    input.placeholder = "Company, university, lab, employer, or city";
    currentAffiliationLabel.classList.remove("is-emphasized");
  }
}

registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registrationForm);
  pendingEmail = formData.get("email").trim().toLowerCase();
  registrationStatus.textContent = "Sending verification code...";

  const payload = {
    name: formData.get("name").trim(),
    email: pendingEmail,
    role: formData.get("role"),
    department: formData.get("department").trim(),
    phone: formData.get("phone").trim(),
    currentAffiliation: formData.get("currentAffiliation").trim(),
    graduationYear: formData.get("graduationYear").trim(),
    profileLink: formData.get("profileLink").trim(),
    publicProfile: formData.get("publicProfile") === "on",
  };

  try {
    const response = await fetch(`${API_BASE}/api/directory/register/request-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(await readApiError(response));

    registrationStatus.textContent = "Verification code sent. Check your email.";
    registrationForm.hidden = true;
    otpForm.hidden = false;
    otpForm.elements.code.focus();
  } catch (error) {
    registrationStatus.textContent = `Could not send verification code: ${error.message}.`;
  }
});

otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = new FormData(otpForm).get("code").trim();
  otpStatus.textContent = "Verifying...";

  try {
    const response = await fetch(`${API_BASE}/api/directory/register/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: pendingEmail, code }),
    });

    if (!response.ok) throw new Error(await readApiError(response));

    const result = await response.json();
    otpStatus.textContent = `${result.contact.name}, your directory profile is confirmed.`;
    otpForm.reset();
  } catch (error) {
    otpStatus.textContent = `Could not verify registration: ${error.message}.`;
  }
});

editRegistration.addEventListener("click", () => {
  otpForm.hidden = true;
  registrationForm.hidden = false;
  registrationStatus.textContent = "Edit your details and request a fresh code.";
});

roleSelect.addEventListener("change", updateAffiliationHint);
updateAffiliationHint();
