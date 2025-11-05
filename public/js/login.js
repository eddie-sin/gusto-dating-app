const form = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const msgBox = document.getElementById("msg");

function showMsg(text, type = "success") {
  msgBox.style.display = "block";
  msgBox.textContent = text;
  msgBox.className = "msg " + (type === "success" ? "success" : "error");
}

function clearMsg() {
  msgBox.style.display = "none";
  msgBox.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMsg();
  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    showMsg("Please enter both username and password.", "error");
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
    return;
  }

  try {
    const res = await fetch("/api/v1/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.message || "Login failed. Please try again.";
      showMsg(msg, "error");
    } else {
      showMsg("Login successful! Redirecting...", "success");
      console.log("Login response:", data);
      alert("login success");
    }
  } catch (err) {
    console.error(err);
    showMsg("Network or server error. Try again.", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});
