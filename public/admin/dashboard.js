
// Check token first
const token = localStorage.getItem("adminToken");
if (!token) window.location.href = "/admin";

// Theme toggle (assumes elements exist in HTML)
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (themeIcon) themeIcon.textContent = document.body.classList.contains("dark-mode") ? "🌙" : "🌞";
  });
}

// Elements
const pendingCount = document.getElementById("pending-count");
const approvedCount = document.getElementById("approved-count");
const rejectedCount = document.getElementById("rejected-count");
const proposalCount = document.getElementById("proposal-count");
const crushCount = document.getElementById("crush-count");
const matchCount = document.getElementById("match-count");
const tbody = document.getElementById("pending-users-tbody");

const API_BASE = "/api/v1/admins";

/** Helper to safely extract array length from various response shapes */
async function fetchCount(url) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return 0;
    const json = await res.json();
    // common patterns:
    // { data: [...], results: n }   OR   { results: n }   OR   [...]   OR   { length: n } (unlikely)
    if (Array.isArray(json)) return json.length;
    if (json.data && Array.isArray(json.data)) return json.data.length;
    if (typeof json.results === "number") return json.results;
    // fallback: try to find arrays inside
    for (const v of Object.values(json)) {
      if (Array.isArray(v)) return v.length;
    }
    return 0;
  } catch (err) {
    console.error("fetchCount error for", url, err);
    return 0;
  }
}

/** Fetch user stats (pending/approved/rejected) */
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/user-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("user-stats fetch failed");
    const json = await res.json();
    const stats = json.data || json || {};
    pendingCount.textContent = stats.pending ?? 0;
    approvedCount.textContent = stats.approved ?? 0;
    rejectedCount.textContent = stats.rejected ?? 0;
  } catch (err) {
    console.error("Failed to load user-stats:", err);
    pendingCount.textContent = approvedCount.textContent = rejectedCount.textContent = "0";
  }

  // fetch proposals/crushes/matches counts in parallel
  const [pCount, cCount, mCount] = await Promise.all([
    fetchCount("/api/v1/proposes"),
    fetchCount("/api/v1/crushes"),
    fetchCount("/api/v1/matches"), // may not exist; fetchCount will return 0 if missing
  ]);
  if (proposalCount) proposalCount.textContent = pCount;
  if (crushCount) crushCount.textContent = cCount;
  if (matchCount) matchCount.textContent = mCount;
}

/** Fetch pending users list */
async function fetchPendingUsers() {
  try {
    const res = await fetch(`${API_BASE}/pending-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("pending-users fetch failed");
    const json = await res.json();
    const users = (json.data && json.data.users) || json.users || json || [];
    tbody.innerHTML = "";

    users.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(user.name || "")}</td>
        <td>${escapeHtml(user.batch || "")}</td>
        <td>${escapeHtml(user.contact || "")}</td>
        <td>${user.dob ? new Date(user.dob).toLocaleDateString() : ""}</td>
        <td>
          <button class="approve" data-id="${user._id}">Approve</button>
          <button class="reject" data-id="${user._id}">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach event listeners
    document.querySelectorAll(".approve").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.id, "approve"));
    });
    document.querySelectorAll(".reject").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.id, "reject"));
    });
  } catch (err) {
    console.error("Failed to load pending users:", err);
    tbody.innerHTML = `<tr><td colspan="5">Failed to load pending users</td></tr>`;
  }
}

/** Try canonical admin endpoints, fall back to alternate names if 404 */
async function patchWithFallback(primaryUrl, fallbackUrl) {
  try {
    let res = await fetch(primaryUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404 && fallbackUrl) {
      res = await fetch(fallbackUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    return res;
  } catch (err) {
    console.error("patchWithFallback error:", err);
    throw err;
  }
}

/** Handle approve/reject action */
async function handleAction(userId, action) {
  try {
    // Try endpoints in order:
    // prefer /approve/:id and /reject/:id (as defined in adminRoutes)
    // fallback to /approve-user/:id and /reject-user/:id if first returns 404
    const primary = `${API_BASE}/${action === "approve" ? "approve" : "reject"}/${userId}`;
    const fallback = `${API_BASE}/${action === "approve" ? "approve-user" : "reject-user"}/${userId}`;

    const res = await patchWithFallback(primary, fallback);
    if (!res) throw new Error("No response from server");
    const json = await res.json();

    if (res.ok && json.status === "success") {
      alert(json.message || "Action successful");
      await fetchPendingUsers();
      await fetchStats();
    } else {
      const msg = json.message || `Action failed (status ${res.status})`;
      alert(msg);
    }
  } catch (err) {
    console.error("Action failed:", err);
    alert("Action failed — see console for details");
  }
}

/** Utility: escape HTML to avoid injecting markup from backend */
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// initial load
fetchStats();
fetchPendingUsers();
