const STORAGE_NOTICE_KEY = "urBanglaStorageNotice";

if (!document.querySelector("#storageNotice")) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <aside class="storage-notice" id="storageNotice" aria-label="Cookie and browser storage notice" hidden>
        <p><strong>Cookies & storage</strong> We use essential browser storage for verified access, session drafts, and preferences. We do not use advertising cookies.</p>
        <div>
          <button class="button secondary compact-button" id="openStorageDetails" type="button">Details</button>
          <button class="button primary compact-button" id="acceptStorageNotice" type="button">Got it</button>
        </div>
      </aside>
      <dialog class="storage-dialog" id="storageDialog" aria-labelledby="storageTitle">
        <div>
          <header class="post-editor-header">
            <h2 id="storageTitle">Cookies & browser storage</h2>
            <button class="icon-button" id="closeStorageDetails" type="button" aria-label="Close storage details" title="Close">×</button>
          </header>
          <p>This website does not use advertising or analytics cookies.</p>
          <ul>
            <li><strong>Local storage:</strong> remembers verified directory access and your notice preference on this device.</li>
            <li><strong>Session storage:</strong> keeps post drafts in the current tab and admin access in the admin panel.</li>
            <li><strong>Submitted content:</strong> posts and image or PDF attachment locations are stored in the community database after submission and remain pending until moderation.</li>
            <li><strong>External services:</strong> Google Fonts may receive standard connection data when fonts load. External links open only when selected.</li>
          </ul>
          <button class="button primary" id="acceptStorageDetails" type="button">Acknowledge</button>
        </div>
      </dialog>
    `,
  );
}

const storageNotice = document.querySelector("#storageNotice");
const storageDialog = document.querySelector("#storageDialog");
const openStorageDetails = document.querySelector("#openStorageDetails");
const closeStorageDetails = document.querySelector("#closeStorageDetails");
const acceptStorageNotice = document.querySelector("#acceptStorageNotice");
const acceptStorageDetails = document.querySelector("#acceptStorageDetails");

function storagePreference() {
  try {
    return window.localStorage.getItem(STORAGE_NOTICE_KEY);
  } catch (error) {
    return "";
  }
}

function acknowledgeStorageNotice() {
  try {
    window.localStorage.setItem(STORAGE_NOTICE_KEY, "acknowledged");
  } catch (error) {
    // The notice still closes when browser storage is unavailable.
  }
  storageNotice.hidden = true;
  if (storageDialog.open) storageDialog.close();
}

storageNotice.hidden = storagePreference() === "acknowledged";
acceptStorageNotice.addEventListener("click", acknowledgeStorageNotice);
acceptStorageDetails.addEventListener("click", acknowledgeStorageNotice);
openStorageDetails.addEventListener("click", () => storageDialog.showModal());
closeStorageDetails.addEventListener("click", () => storageDialog.close());
storageDialog.addEventListener("click", (event) => {
  if (event.target === storageDialog) storageDialog.close();
});
