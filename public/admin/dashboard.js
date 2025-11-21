// public/admin/dashboard.js
// token check
const token = localStorage.getItem("adminToken");
console.log("adminToken (from localStorage):", token);
if (!token) {
  console.warn("No adminToken found — redirecting to login");
  window.location.href = "/admin";
}

// small UI banner for errors
function showBanner(msg, type = "error") {
  let b = document.getElementById("fetch-banner");
  if (!b) {
    b = document.createElement("div");
    b.id = "fetch-banner";
    b.style.position = "fixed";
    b.style.top = "0";
    b.style.left = "0";
    b.style.right = "0";
    b.style.padding = "8px 16px";
    b.style.zIndex = "9999";
    b.style.textAlign = "center";
    document.body.prepend(b);
  }
  b.style.background = type === "error" ? "#ffdddd" : "#fff4ce";
  b.style.color = type === "error" ? "#900" : "#663";
  b.textContent = msg;
  setTimeout(() => b.remove(), 6000);
}

// elements
const pendingCount = document.getElementById("pending-count");
const approvedCount = document.getElementById("approved-count");
const rejectedCount = document.getElementById("rejected-count");
const proposalCount = document.getElementById("proposal-count");
const crushCount = document.getElementById("crush-count");
const matchCount = document.getElementById("match-count");
const tbody = document.getElementById("pending-users-tbody");

const API_BASE = "/api/v1/admins";

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const status = res.status;
    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      // ignore non-json
    }
    console.log("safeFetch", url, "status:", status, "json:", json);
    return { ok: res.ok, status, json };
  } catch (err) {
    console.error("Network error fetching", url, err);
    return { ok: false, status: 0, err };
  }
}

// Try count endpoint first: /count -> { status:'success', data:{count: N} }
async function fetchCountPreferCount(urlBase) {
  const countUrl = `${urlBase}/count`;
  const fallbackUrl = `${urlBase}`;
  const headers = { Authorization: `Bearer ${token}` };

  // try count endpoint first
  let r = await safeFetch(countUrl, { headers });
  if (r.ok && r.json && r.json.data && typeof r.json.data.count === "number") {
    return r.json.data.count;
  }

  // if 404 or not usable, try fallback listing endpoint and count elements
  if (r.status === 404 || !r.ok || !r.json) {
    const listRes = await safeFetch(fallbackUrl, { headers });
    if (listRes.ok && listRes.json) {
      // JSON shape may be {data: [...]} or array
      if (Array.isArray(listRes.json)) return listRes.json.length;
      if (listRes.json.data && Array.isArray(listRes.json.data)) return listRes.json.data.length;
      if (typeof listRes.json.results === "number") return listRes.json.results;
    }
  }
  // default fallback
  return 0;
}

// stats (users)
async function fetchStats() {
  const res = await safeFetch(`${API_BASE}/user-stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn("user-stats fetch failed:", res.status);
    showBanner("Failed to load user stats (check auth or server).", "error");
    pendingCount.textContent = approvedCount.textContent = rejectedCount.textContent = "0";
  } else {
    const stats = (res.json && (res.json.data || res.json)) || {};
    pendingCount.textContent = stats.pending ?? 0;
    approvedCount.textContent = stats.approved ?? 0;
    rejectedCount.textContent = stats.rejected ?? 0;
  }

  // proposals/crushes/matches counts (try /count endpoints)
  const [pCount, cCount, mCount] = await Promise.all([
    fetchCountPreferCount("/api/v1/proposes"),
    fetchCountPreferCount("/api/v1/crushes"),
    fetchCountPreferCount("/api/v1/matches"),
  ]).catch((e) => {
    console.error("count fetch error:", e);
    return [0, 0, 0];
  });

  proposalCount.textContent = pCount ?? 0;
  crushCount.textContent = cCount ?? 0;
  matchCount.textContent = mCount ?? 0;
}

// pending users list
async function fetchPendingUsers() {
  const res = await safeFetch(`${API_BASE}/pending-users`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn("pending-users fetch failed:", res.status);
    tbody.innerHTML = `<tr><td colspan="5">Failed to load (status ${res.status})</td></tr>`;
    return;
  }

  const users = (res.json && res.json.data && res.json.data.users) || (res.json && res.json.users) || (Array.isArray(res.json) ? res.json : []);
  if (!Array.isArray(users) || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No pending users</td></tr>`;
    return;
  }

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

  document.querySelectorAll(".approve").forEach((btn) => btn.addEventListener("click", () => handleAction(btn.dataset.id, "approve")));
  document.querySelectorAll(".reject").forEach((btn) => btn.addEventListener("click", () => handleAction(btn.dataset.id, "reject")));
}

async function patchWithFallback(primaryUrl, fallbackUrl) {
  const headers = { Authorization: `Bearer ${token}` };
  let r = await safeFetch(primaryUrl, { method: "PATCH", headers });
  if (!r.ok && r.status === 404 && fallbackUrl) {
    console.warn(`Primary ${primaryUrl} 404 — trying fallback ${fallbackUrl}`);
    r = await safeFetch(fallbackUrl, { method: "PATCH", headers });
  }
  return r;
}

async function handleAction(userId, action) {
  try {
    const primary = `${API_BASE}/${action === "approve" ? "approve" : "reject"}/${userId}`;
    const fallback = `${API_BASE}/${action === "approve" ? "approve-user" : "reject-user"}/${userId}`;
    const res = await patchWithFallback(primary, fallback);
    if (!res.ok) {
      showBanner(`Action failed (status ${res.status})`, "error");
      return;
    }
    const msg = (res.json && res.json.message) || "Action successful";
    showBanner(msg, "info");
    await fetchPendingUsers();
    await fetchStats();
  } catch (err) {
    console.error("handleAction error:", err);
    showBanner("Network error performing action", "error");
  }
}

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// initial
fetchStats();
fetchPendingUsers();
