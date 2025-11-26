// Eddie's Note: This is just Helper Function mainly to manipulate localstorage

// --- Local Storage ---
export function getRegId() {
  return localStorage.getItem("registrationId");
}

export function setRegId(id) {
  localStorage.setItem("registrationId", id);
}

export function clearRegId() {
  localStorage.removeItem("registrationId");
}

// --- Fetch wrapper ---
export async function api(endpoint, options = {}) {
  const regId = getRegId();

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(regId ? { "x-registration-id": regId } : {}),
      ...(options.headers || {}),
    },
  };

  if (options.body) config.body = JSON.stringify(options.body);

  const res = await fetch(`/api/v1/register/${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// --- Navigate to another registration page ---
export function goToStep(step, stepsMap) {
  const entries = Object.entries(stepsMap);
  const target = entries.find(([_, s]) => s === step);
  console.log("Destinated Step: ", step);
  console.log(target);

  if (!target) {
    console.error("Step not found:", step);
    return;
  }

  window.location.href = `/registration/${target[0]}`;
}

// --- Get current filename ---
export function getCurrentFilename() {
  return window.location.pathname.split("/").pop();
}
