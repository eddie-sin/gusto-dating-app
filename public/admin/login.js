document.getElementById("login-btn").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error-msg");

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

    const data = await res.json();

    if (data.status === "success") {
      localStorage.setItem("adminToken", data.token);
      window.location.href = "/admin/dashboard";
    } else {
      errorMsg.textContent = data.message || "Invalid credentials.";
    }
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Server error. Please try again later.";
  }
});
