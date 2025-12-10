console.log("Dashboard.js loading...");

class DashboardManager {
  constructor() {
    console.log("DashboardManager constructor called");
    this.baseURL = "/api/v1/admins";
    this.currentView = "dashboard";

    try {
      this.init();
    } catch (error) {
      console.error("Error initializing DashboardManager:", error);
    }
  }

  init() {
    console.log("DashboardManager init called");

    // Check authentication
    if (!authManager.requireAuth()) {
      console.log("Not authenticated, redirect should happen");
      return;
    }

    console.log("Authentication passed");

    // Set admin username
    this.setAdminInfo();

    // Setup event listeners
    this.setupEventListeners();

    // Load initial data
    this.loadDashboardData();

    // Setup mobile menu
    this.setupMobileMenu();
  }

  setAdminInfo() {
    const adminData = authManager.adminData;
    if (adminData && adminData.username) {
      document.getElementById("adminUsername").textContent = adminData.username;
    }
  }

  setupEventListeners() {
    // Navigation links
    document.getElementById("dashboardLink").addEventListener("click", (e) => {
      e.preventDefault();
      this.showView("dashboard");
    });

    document
      .getElementById("pendingUsersLink")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.showView("pendingUsers");
      });

    document
      .getElementById("approvedUsersLink")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.showView("approved");
      });

    document
      .getElementById("rejectedUsersLink")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.showView("rejected");
      });

    // Logout button
    document.getElementById("logoutBtn").addEventListener("click", (e) => {
      e.preventDefault();
      this.showLogoutConfirm();
    });

    // Photo modal close button
    document.getElementById("closePhotoModal").addEventListener("click", () => {
      this.hidePhotoModal();
    });

    // Close modal on overlay click
    document.getElementById("photoModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("photoModal")) {
        this.hidePhotoModal();
      }
    });

    // Notifications button
    document
      .getElementById("notificationsBtn")
      .addEventListener("click", () => {
        this.showView("pendingUsers");
      });
  }

  setupMobileMenu() {
    const menuBtn = document.getElementById("menuBtn");
    const overlay = document.getElementById("overlay");
    const sidebar = document.querySelector(".sidebar");

    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("-translate-x-64");
      overlay.classList.toggle("hidden");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.add("-translate-x-64");
      overlay.classList.add("hidden");
    });

    // Close menu when clicking a nav link on mobile
    const navLinks = document.querySelectorAll("nav a");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        sidebar.classList.add("-translate-x-64");
        overlay.classList.add("hidden");
      });
    });
  }

  showLogoutConfirm() {
    if (confirm("Are you sure you want to logout?")) {
      authManager.logout();
    }
  }

  async showView(view) {
    console.log(`Showing view: ${view}`);
    this.currentView = view;

    // Update active navigation
    this.updateActiveNav(view);

    // Hide all sections
    document.getElementById("statsSection").classList.add("hidden");
    document.getElementById("pendingUsersSection").classList.add("hidden");
    document.getElementById("usersTableSection").classList.add("hidden");

    // Show loading
    this.showLoading();

    try {
      switch (view) {
        case "dashboard":
          await this.loadDashboardData();
          document.getElementById("statsSection").classList.remove("hidden");
          document.getElementById("pageTitle").textContent = "Dashboard";
          document.getElementById("pageSubtitle").textContent =
            "Admin panel overview";
          break;

        case "pendingUsers":
          await this.loadPendingUsers();
          document
            .getElementById("pendingUsersSection")
            .classList.remove("hidden");
          document.getElementById("pageTitle").textContent = "Pending Users";
          document.getElementById("pageSubtitle").textContent =
            "Review and approve/reject user registrations";
          break;

        case "approved":
          await this.loadUsersByStatus("approved");
          document
            .getElementById("usersTableSection")
            .classList.remove("hidden");
          document.getElementById("usersTableTitle").textContent =
            "Approved Users";
          document.getElementById("usersTableSubtitle").textContent =
            "All approved users in the system";
          document.getElementById("pageTitle").textContent = "Approved Users";
          document.getElementById("pageSubtitle").textContent =
            "All approved users in the system";
          break;

        case "rejected":
          await this.loadUsersByStatus("rejected");
          document
            .getElementById("usersTableSection")
            .classList.remove("hidden");
          document.getElementById("usersTableTitle").textContent =
            "Rejected Users";
          document.getElementById("usersTableSubtitle").textContent =
            "All rejected users in the system";
          document.getElementById("pageTitle").textContent = "Rejected Users";
          document.getElementById("pageSubtitle").textContent =
            "All rejected users in the system";
          break;
      }
    } catch (error) {
      console.error(`Error showing view ${view}:`, error);
      this.showError(error.message);
    } finally {
      this.hideLoading();
    }
  }

  updateActiveNav(view) {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll("nav a");
    navItems.forEach((item) => {
      item.classList.remove("bg-gray-800", "text-white");
      item.classList.add("text-gray-300");
    });

    // Add active class to current view
    const activeMap = {
      dashboard: "dashboardLink",
      pendingUsers: "pendingUsersLink",
      approved: "approvedUsersLink",
      rejected: "rejectedUsersLink",
    };

    const activeId = activeMap[view];
    if (activeId) {
      const activeItem = document.getElementById(activeId);
      activeItem.classList.add("bg-gray-800", "text-white");
      activeItem.classList.remove("text-gray-300");
    }
  }

  async loadDashboardData() {
    try {
      console.log("Loading dashboard data...");

      // Load stats from admin endpoint
      const statsResponse = await authManager.fetchWithAuth(
        `${this.baseURL}/stats`
      );
      const statsData = await statsResponse.json();

      if (statsData.status === "success") {
        console.log("Stats loaded:", statsData.data);
        this.displayStats(statsData.data);
        this.updatePendingCount(statsData.data.pending);
      } else {
        throw new Error(statsData.message || "Failed to load stats");
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      this.showError("Failed to load dashboard data: " + error.message);
    }
  }

  displayStats(stats) {
    const statsSection = document.getElementById("statsSection");

    const totalUsers =
      (stats.pending || 0) + (stats.approved || 0) + (stats.rejected || 0);

    const statsHTML = `
            <div class="card-hover bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500">Pending Users</p>
                        <h3 class="text-3xl font-bold mt-2">${
                          stats.pending || 0
                        }</h3>
                        <p class="text-sm text-gray-400 mt-1">Awaiting approval</p>
                    </div>
                    <div class="bg-yellow-500 text-white p-4 rounded-lg">
                        <i class="fas fa-clock text-2xl"></i>
                    </div>
                </div>
            </div>
            <div class="card-hover bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500">Approved Users</p>
                        <h3 class="text-3xl font-bold mt-2">${
                          stats.approved || 0
                        }</h3>
                        <p class="text-sm text-gray-400 mt-1">Active users</p>
                    </div>
                    <div class="bg-green-500 text-white p-4 rounded-lg">
                        <i class="fas fa-user-check text-2xl"></i>
                    </div>
                </div>
            </div>
            <div class="card-hover bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500">Rejected Users</p>
                        <h3 class="text-3xl font-bold mt-2">${
                          stats.rejected || 0
                        }</h3>
                        <p class="text-sm text-gray-400 mt-1">Rejected applications</p>
                    </div>
                    <div class="bg-red-500 text-white p-4 rounded-lg">
                        <i class="fas fa-user-times text-2xl"></i>
                    </div>
                </div>
            </div>
            <div class="card-hover bg-white rounded-xl shadow p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500">Total Users</p>
                        <h3 class="text-3xl font-bold mt-2">${totalUsers}</h3>
                        <p class="text-sm text-gray-400 mt-1">Total registrations</p>
                    </div>
                    <div class="bg-blue-500 text-white p-4 rounded-lg">
                        <i class="fas fa-users text-2xl"></i>
                    </div>
                </div>
            </div>
        `;

    statsSection.innerHTML = statsHTML;
  }

  updatePendingCount(count) {
    const pendingCountElement = document.getElementById("pendingCount");
    const notificationCountElement =
      document.getElementById("notificationCount");

    count = count || 0;

    if (count > 0) {
      pendingCountElement.textContent = count;
      pendingCountElement.classList.remove("hidden");
      notificationCountElement.textContent = count;
      notificationCountElement.classList.remove("hidden");
    } else {
      pendingCountElement.textContent = "0";
      pendingCountElement.classList.add("hidden");
      notificationCountElement.classList.add("hidden");
    }
  }

  async loadPendingUsers() {
    try {
      console.log("Loading pending users...");

      // Use the admin endpoint for pending users
      const response = await authManager.fetchWithAuth(
        `${this.baseURL}/pending-users`
      );
      const data = await response.json();

      if (data.status === "success") {
        console.log(`Loaded ${data.data.users?.length || 0} pending users`);
        this.displayPendingUsers(data.data.users);
      } else {
        throw new Error(data.message || "Failed to load pending users");
      }
    } catch (error) {
      console.error("Error loading pending users:", error);
      this.showError("Failed to load pending users: " + error.message);
    }
  }

  displayPendingUsers(users) {
    const tableBody = document.getElementById("pendingUsersTable");
    const noPendingUsers = document.getElementById("noPendingUsers");

    if (!users || users.length === 0) {
      tableBody.innerHTML = "";
      noPendingUsers.classList.remove("hidden");
      return;
    }

    noPendingUsers.classList.add("hidden");

    let tableHTML = "";

    users.forEach((user) => {
      // Format date of birth
      let dobDisplay = "N/A";
      if (user.dob) {
        try {
          const dobDate = new Date(user.dob);
          if (!isNaN(dobDate.getTime())) {
            dobDisplay = dobDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }
        } catch (e) {
          dobDisplay = "Invalid date";
        }
      }

      // Display student ID photo button if available
      let studentIdButton = "No ID";
      if (user.studentIdPhoto && user.studentIdPhoto.url) {
        studentIdButton = `
                    <button onclick="dashboard.showPhotoModal('${user.studentIdPhoto.url}')" 
                            class="text-blue-600 hover:text-blue-800 font-medium flex items-center transition duration-200 hover:scale-105">
                        <i class="fas fa-id-card mr-2"></i> View ID
                    </button>
                `;
      }

      // In displayPendingUsers method, update the buttons:
      tableHTML += `
    <tr class="hover:bg-gray-50 transition duration-150" data-user-id="${
      user._id
    }">
        <td class="px-6 py-4">
            <div class="font-medium text-gray-900">${user.name || "N/A"}</div>
        </td>
        <td class="px-6 py-4">
            <div class="text-gray-900">
                ${user.contact || "N/A"}
                ${
                  user.username
                    ? `<div class="text-sm text-gray-500">@${user.username}</div>`
                    : ""
                }
            </div>
        </td>
        <td class="px-6 py-4">
            <div class="text-gray-900">${dobDisplay}</div>
        </td>
        <td class="px-6 py-4">
            <div class="text-gray-900">${user.batch || "N/A"}</div>
        </td>
        <td class="px-6 py-4">
            ${studentIdButton}
        </td>
        <td class="px-6 py-4">
            <div class="flex space-x-2">
                <button onclick="dashboard.approveUser('${user._id}', '${(
        user.name || "this user"
      ).replace(/'/g, "\\'")}')" 
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center transition duration-200 hover:scale-105 transform">
                    <i class="fas fa-check mr-2"></i> Approve
                </button>
                <button onclick="dashboard.rejectUser('${user._id}', '${(
        user.name || "this user"
      ).replace(/'/g, "\\'")}')" 
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition duration-200 hover:scale-105 transform">
                    <i class="fas fa-times mr-2"></i> Reject
                </button>
            </div>
        </td>
    </tr>
`;
    });

    tableBody.innerHTML = tableHTML;
  }

  async loadUsersByStatus(status) {
    try {
      // Use admin endpoints
      let endpoint;

      switch (status) {
        case "approved":
          endpoint = `${this.baseURL}/users/approved`;
          break;
        case "rejected":
          endpoint = `${this.baseURL}/users/rejected`;
          break;
        default:
          throw new Error(`Invalid status: ${status}`);
      }

      console.log(`Loading ${status} users from:`, endpoint);

      const response = await authManager.fetchWithAuth(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        console.log(`Loaded ${data.data.users?.length || 0} ${status} users`);
        this.displayUsers(data.data.users, status);
      } else {
        throw new Error(data.message || `Failed to load ${status} users`);
      }
    } catch (error) {
      console.error(`Error loading ${status} users:`, error);

      // Show user-friendly error
      let errorMessage = error.message;
      if (error.message.includes("401")) {
        errorMessage = "Authentication failed. Please logout and login again.";
      } else if (error.message.includes("404")) {
        errorMessage = "Endpoint not found. Please update the server routes.";
      }

      this.showError(`Failed to load ${status} users: ${errorMessage}`);
      this.displayEmptyUsersTable(status, errorMessage);
    }
  }

  displayUsers(users, status) {
    const tableBody = document.getElementById("usersTableBody");

    if (!users || users.length === 0) {
      this.displayEmptyUsersTable(status);
      return;
    }

    let tableHTML = "";

    users.forEach((user) => {
      // Format date of birth
      let dobDisplay = "N/A";
      if (user.dob) {
        try {
          const dobDate = new Date(user.dob);
          if (!isNaN(dobDate.getTime())) {
            dobDisplay = dobDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }
        } catch (e) {
          dobDisplay = "Invalid date";
        }
      }

      // Get status badge
      const statusBadge = this.getStatusBadge(user.status);

      // Additional info if available
      let additionalInfo = "";
      if (user.nickname) {
        additionalInfo += `<div class="text-sm text-gray-500">"${user.nickname}"</div>`;
      }
      if (user.program) {
        additionalInfo += `<div class="text-sm text-gray-500">${user.program}</div>`;
      }

      tableHTML += `
                <tr class="hover:bg-gray-50 transition duration-150">
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900">${
                          user.name || "N/A"
                        }</div>
                        ${additionalInfo}
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-gray-900">${
                          user.username || "N/A"
                        }</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-gray-900">${
                          user.contact || "N/A"
                        }</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-gray-900">${dobDisplay}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-gray-900">${user.batch || "N/A"}</div>
                    </td>
                    <td class="px-6 py-4">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4">
                        <button onclick="dashboard.viewUserDetails('${
                          user._id
                        }')" 
                                class="text-blue-600 hover:text-blue-800 font-medium flex items-center transition duration-200">
                            <i class="fas fa-eye mr-2"></i> View Details
                        </button>
                    </td>
                </tr>
            `;
    });

    tableBody.innerHTML = tableHTML;
  }

  displayEmptyUsersTable(status, errorMessage = null) {
    const tableBody = document.getElementById("usersTableBody");

    if (errorMessage) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center">
                        <i class="fas fa-exclamation-triangle text-4xl mb-4 text-yellow-500"></i>
                        <h3 class="text-xl font-medium text-gray-700 mb-2">Error Loading ${
                          status.charAt(0).toUpperCase() + status.slice(1)
                        } Users</h3>
                        <p class="text-gray-500 max-w-md mx-auto">${errorMessage}</p>
                        <button onclick="dashboard.loadUsersByStatus('${status}')" 
                                class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200">
                            <i class="fas fa-redo mr-2"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
    } else {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <i class="fas fa-users text-4xl mb-4 text-gray-300"></i>
                        <h3 class="text-xl font-medium text-gray-700 mb-2">No ${status} users found</h3>
                        <p class="text-gray-500">There are currently no ${status} users in the system.</p>
                    </td>
                </tr>
            `;
    }
  }

  getStatusBadge(status) {
    const badges = {
      pending:
        '<span class="px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Pending</span>',
      approved:
        '<span class="px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Approved</span>',
      rejected:
        '<span class="px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Rejected</span>',
    };
    return (
      badges[status] ||
      '<span class="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Unknown</span>'
    );
  }

  async approveUser(userId, userName) {
    try {
      // Show confirmation modal
      const result = await modalManager.confirmApproveUser(userId, userName);

      if (!result.confirmed) {
        console.log("Approval cancelled");
        return;
      }

      // Show loading modal
      modalManager.showLoading("Approving user...");

      console.log(`Approving user ${userId}...`);

      const response = await authManager.fetchWithAuth(
        `${this.baseURL}/approve/${userId}`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      modalManager.hideLoading();

      if (response.ok) {
        console.log("User approved successfully");

        // Show success modal
        modalManager.showSuccess(
          "✅ User approved successfully! Student ID photo has been deleted."
        );

        // Refresh current view
        if (this.currentView === "pendingUsers") {
          await this.loadPendingUsers();
        }

        // Refresh dashboard stats
        await this.loadDashboardData();

        // If on approved users view, refresh that too
        if (this.currentView === "approved") {
          await this.loadUsersByStatus("approved");
        }
      } else {
        throw new Error(data.message || "Failed to approve user");
      }
    } catch (error) {
      modalManager.hideLoading();
      console.error("Error approving user:", error);
      modalManager.showError("Failed to approve user: " + error.message);
    }
  }

  async rejectUser(userId, userName) {
    try {
      // Show confirmation modal
      const result = await modalManager.confirmRejectUser(userId, userName);

      if (!result.confirmed) {
        console.log("Rejection cancelled");
        return;
      }

      // Show loading modal
      modalManager.showLoading("Rejecting user...");

      console.log(`Rejecting user ${userId}...`);

      const response = await authManager.fetchWithAuth(
        `${this.baseURL}/reject/${userId}`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      modalManager.hideLoading();

      if (response.ok) {
        console.log("User rejected successfully");

        // Show success modal
        modalManager.showSuccess(
          "❌ User rejected successfully! Student ID photo has been deleted."
        );

        // Refresh current view
        if (this.currentView === "pendingUsers") {
          await this.loadPendingUsers();
        }

        // Refresh dashboard stats
        await this.loadDashboardData();

        // If on rejected users view, refresh that too
        if (this.currentView === "rejected") {
          await this.loadUsersByStatus("rejected");
        }
      } else {
        throw new Error(data.message || "Failed to reject user");
      }
    } catch (error) {
      modalManager.hideLoading();
      console.error("Error rejecting user:", error);
      modalManager.showError("Failed to reject user: " + error.message);
    }
  }

  async viewUserDetails(userId) {
    this.showLoading();

    try {
      console.log(`Viewing user details for ${userId}...`);

      // Use admin endpoint for user details
      const response = await authManager.fetchWithAuth(
        `${this.baseURL}/users/${userId}`
      );

      if (response.ok) {
        const data = await response.json();

        // Show user details in a modal or alert
        const user = data.data.user;
        let details = `Name: ${user.name || "N/A"}\n`;
        details += `Username: ${user.username || "N/A"}\n`;
        details += `Contact: ${user.contact || "N/A"}\n`;
        details += `DOB: ${
          user.dob ? new Date(user.dob).toLocaleDateString() : "N/A"
        }\n`;
        details += `Batch: ${user.batch || "N/A"}\n`;
        details += `Program: ${user.program || "N/A"}\n`;
        details += `Status: ${user.status || "N/A"}\n`;
        details += `Gender: ${user.gender || "N/A"}\n`;
        details += `Sexuality: ${user.sexuality || "N/A"}\n`;
        details += `Nickname: ${user.nickname || "N/A"}`;

        alert("User Details:\n\n" + details);
      } else {
        throw new Error("Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error viewing user details:", error);
      this.showError("Unable to load user details: " + error.message);
    } finally {
      this.hideLoading();
    }
  }

  showPhotoModal(photoUrl) {
    const modal = document.getElementById("photoModal");
    const modalPhoto = document.getElementById("modalPhoto");

    modalPhoto.src = photoUrl;
    modalPhoto.onload = () => {
      modal.classList.remove("modal-hidden");
    };

    modalPhoto.onerror = () => {
      this.showError(
        "Failed to load image. The image may have been deleted or is inaccessible."
      );
      this.hidePhotoModal();
    };
  }

  hidePhotoModal() {
    const modal = document.getElementById("photoModal");
    modal.classList.add("modal-hidden");
    document.getElementById("modalPhoto").src = "";
  }

  showLoading() {
    document.getElementById("loadingSpinner").classList.remove("hidden");
  }

  hideLoading() {
    document.getElementById("loadingSpinner").classList.add("hidden");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 transform transition-all duration-300 ease-out translate-x-full ${
      type === "success"
        ? "bg-green-500 border-l-4 border-green-600"
        : type === "error"
        ? "bg-red-500 border-l-4 border-red-600"
        : "bg-blue-500 border-l-4 border-blue-600"
    } text-white max-w-md`;

    notification.innerHTML = `
            <div class="flex items-start">
                <i class="fas ${
                  type === "success"
                    ? "fa-check-circle"
                    : type === "error"
                    ? "fa-exclamation-circle"
                    : "fa-info-circle"
                } text-xl mr-3 mt-0.5"></i>
                <div class="flex-1">
                    <p class="font-medium">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.transform = "translateX(100%)";
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);

    // Allow manual dismissal
    notification.querySelector("button").addEventListener("click", () => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    });
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing dashboard...");
  window.dashboard = new DashboardManager();
});
