// public/admin/login.js
const loginBtn = document.getElementById("login-btn");
const errorMsg = document.getElementById("error-msg");

loginBtn.addEventListener("click", async () => {
  errorMsg.textContent = "";
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    errorMsg.textContent = "Please enter both username and password.";
    return;
  }

  try {
    const res = await fetch("/api/v1/admins/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    // log status for debugging
    console.log("login response status:", res.status, res.statusText);

    const data = await res.json().catch(() => null);
    console.log("login json:", data);

    if (res.ok && data && data.status === "success" && data.token) {
      // Save token and a timestamp for debugging
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminTokenSavedAt", new Date().toISOString());
      // redirect
      window.location.href = "/admin/dashboard";
    } else {
      // show helpful message
      errorMsg.textContent = (data && data.message) || `Login failed (status ${res.status})`;
    }
  } catch (err) {
    console.error("Login error:", err);
    errorMsg.textContent = "Server error. Please try again later.";
  }
});
