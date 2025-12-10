// Eddie's Note: this is main logic that runs on every registration page.
import { registrationSteps } from "./registrationSteps.js";
import {
  api,
  getRegId,
  setRegId,
  clearRegId,
  goToStep,
  getCurrentFilename,
} from "./utils.js";

(async function initRegistration() {
  //1. Check What Step is Current Page
  const filename = getCurrentFilename();
  const pageStep = registrationSteps[filename];

  console.log("pageStep: ", pageStep);

  // this is just incase, any typo errors in code
  if (!pageStep) {
    alert("Page step not found for:", filename);
    return;
  }

  //2. Check registration ID
  let regId = getRegId();
  console.log("YES! regId: ", regId);

  // If no registrationId → request one
  if (!regId) {
    const { registrationId } = await api("start", { method: "POST" });
    console.log("regId requested");
    setRegId(registrationId);
    console.log("regId: ", getRegId());
    regId = registrationId;
  }

  // Get session status
  let status;
  try {
    status = await api(`status?registrationId=${regId}`);
    console.log("status requested");
    console.log("current step: ", status);
  } catch (err) {
    // Session expired → reset and start again
    clearRegId();
    alert("Your session expired. Starting a new registration.");
    const newStart = await api("start", { method: "POST" });
    setRegId(newStart.registrationId);
    return window.location.reload();
  }

  const { currentStep } = status;

  // ───────────────────────────────
  // Step logic
  // ───────────────────────────────

  // User jumped ahead too far → redirect back
  if (pageStep > currentStep) {
    alert("You have not completed the previous steps yet.");
    return goToStep(currentStep, registrationSteps);
  }

  // User is returning to a past step → prefill data
  if (pageStep < currentStep) {
    const { data: prefill } = await api(`data?registrationId=${regId}`);
    console.log("prefill requested to data?registrationId");
    console.log(prefill);

    // Call a page-specific hook if it exists
    if (window.prefillPage) {
      window.prefillPage(prefill);
    }
  }

  // ───────────────────────────────
  // Save handler (works with or without forms)
  // ───────────────────────────────
  function handleSave(e) {
    if (e) e.preventDefault();

    if (!window.collectPageData) {
      return alert("collectPageData() not implemented for this page");
    }

    const stepData = window.collectPageData();
    if (!stepData) return; // page script will show its own validation

    api(`step/${pageStep}`, {
      method: "POST",
      body: { data: stepData },
    })
      .then(() => {
        goToStep(pageStep + 1, registrationSteps);
      })
      .catch((err) => {
        alert(err.message || "Failed to save step");
      });
  }
  // If form exists → also handle form submit
  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", handleSave);
  }

  // Always listen for custom events
  document.addEventListener("registration:submit", handleSave);

  /* Back Step Back logic */
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      goToStep(pageStep - 1, registrationSteps);
    });
  }
})();
