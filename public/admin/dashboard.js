// Check token first
const token = localStorage.getItem("adminToken");
if (!token) window.location.href = "/admin";

// Theme toggle
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  themeIcon.textContent = document.body.classList.contains("dark-mode") ? "🌙" : "🌞";
});

// Fetch stats and pending users
const pendingCount = document.getElementById("pending-count");
const approvedCount = document.getElementById("approved-count");
const rejectedCount = document.getElementById("rejected-count");
const proposalCount = document.getElementById("proposal-count");
const crushCount = document.getElementById("crush-count");
const matchCount = document.getElementById("match-count");
const tbody = document.getElementById("pending-users-tbody");

const API_BASE = "/api/v1/admins";

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/user-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    pendingCount.textContent = data.data.pending;
    approvedCount.textContent = data.data.approved;
    rejectedCount.textContent = data.data.rejected;

    // fetch counts for proposals, crushes, matches
    const [proposals, crushes, matches] = await Promise.all([
      fetch("/api/v1/proposes", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/v1/crushes", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/v1/matches", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);

    proposalCount.textContent = proposals.data?.length || 0;
    crushCount.textContent = crushes.data?.length || 0;
    matchCount.textContent = matches.data?.length || 0;

  } catch (err) {
    console.error(err);
    alert("Failed to fetch stats");
  }
}

async function fetchPendingUsers() {
  try {
    const res = await fetch(`${API_BASE}/pending-users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    tbody.innerHTML = "";

    data.data.users.forEach((user) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${user.name}</td>
        <td>${user.batch}</td>
        <td>${user.contact}</td>
        <td>${new Date(user.dob).toLocaleDateString()}</td>
        <td>
          <button class="approve" data-id="${user._id}">Approve</button>
          <button class="reject" data-id="${user._id}">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Add event listeners
    document.querySelectorAll(".approve").forEach(btn => {
      btn.addEventListener("click", () => handleAction(btn.dataset.id, "approve"));
    });
    document.querySelectorAll(".reject").forEach(btn => {
      btn.addEventListener("click", () => handleAction(btn.dataset.id, "reject"));
    });

  } catch (err) {
    console.error(err);
    alert("Failed to fetch pending users");
  }
}

async function handleAction(userId, action) {
  try {
    const url = action === "approve" ? `${API_BASE}/approve-user/${userId}` : `${API_BASE}/reject-user/${userId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.status === "success") {
      alert(data.message);
      fetchPendingUsers();
      fetchStats();
    } else {
      alert("Action failed");
    }
  } catch (err) {
    console.error(err);
    alert("Action failed");
  }
}

// Initial load
fetchStats();
fetchPendingUsers();
