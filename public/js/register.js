function $(id) {
  return document.getElementById(id);
}

let imagekit = null;

async function init() {
  const form = $("registerForm");
  const submitBtn = $("submitBtn");
  const photosInput = $("photos");
  const studentIdInput = $("studentIdPhoto");
  const photosError = $("photosError");
  const studentIdError = $("studentIdError");
  const uploadProgress = $("uploadProgress");
  const progressBar = $("progressBar");
  const uploadStatus = $("uploadStatus");
  const message = $("message");

  // Initialize ImageKit
  try {
  const authResp = await fetch("/api/v1/images/auth").then((r) => r.json());
    imagekit = new ImageKit({
      publicKey: authResp.publicKey,
      urlEndpoint: authResp.urlEndpoint,
  authenticationEndpoint: "/api/v1/images/auth",
    });
  } catch (err) {
    showMessage("Failed to initialize ImageKit. Please refresh the page.", "error");
    return;
  }

  // Validate photo count
  photosInput.addEventListener("change", () => {
    const files = photosInput.files;
    if (files.length < 3 || files.length > 5) {
      photosError.textContent = "Please select between 3 and 5 photos";
      photosInput.setCustomValidity("Please select between 3 and 5 photos");
    } else {
      photosError.textContent = "";
      photosInput.setCustomValidity("");
    }
  });

  studentIdInput.addEventListener("change", () => {
    studentIdError.textContent = "";
  });

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    message.innerHTML = "";
    uploadProgress.style.display = "none";
    progressBar.style.width = "0%";

    try {
      // Validate files
      const photoFiles = Array.from(photosInput.files);
      const studentIdFile = studentIdInput.files[0];

      if (photoFiles.length < 3 || photoFiles.length > 5) {
        showMessage("Please select between 3 and 5 photos", "error");
        submitBtn.disabled = false;
        return;
      }

      if (!studentIdFile) {
        showMessage("Please select a student ID photo", "error");
        submitBtn.disabled = false;
        return;
      }

      // Determine per-user folder using entered username
      const rawUsername = $("username").value || "";
      const sanitized = (rawUsername || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "_");
      const baseFolder = `/gusto/users/${sanitized || "user_unknown"}`;
      const photosFolder = `${baseFolder}/photos`;
      const studentIdFolder = `${baseFolder}/studentID`;

      // Show upload progress
      uploadProgress.style.display = "block";
      uploadStatus.textContent = "Uploading images to ImageKit...";
      progressBar.style.width = "10%";

      // Upload photos to ImageKit
      const totalFiles = photoFiles.length + 1; // photos + studentId
      let uploadedCount = 0;

      const uploadPhoto = async (file, index) => {
  const auth = await fetch("/api/v1/images/auth").then((r) => r.json());
        const fileName = `photo_${Date.now()}_${index}_${file.name}`;
        const response = await imagekit.upload({
          file: file,
          fileName: fileName,
          folder: photosFolder,
          useUniqueFileName: true,
          token: auth.token,
          signature: auth.signature,
          expire: auth.expire,
        });
        uploadedCount++;
        progressBar.style.width = `${10 + (uploadedCount / totalFiles) * 70}%`;
        uploadStatus.textContent = `Uploading... ${uploadedCount}/${totalFiles} files`;
        return { fileId: response.fileId, url: response.url };
      };

      const uploadStudentId = async (file) => {
  const auth = await fetch("/api/v1/images/auth").then((r) => r.json());
        const fileName = `studentId_${Date.now()}_${file.name}`;
        const response = await imagekit.upload({
          file: file,
          fileName: fileName,
          folder: studentIdFolder,
          useUniqueFileName: true,
          token: auth.token,
          signature: auth.signature,
          expire: auth.expire,
        });
        uploadedCount++;
        progressBar.style.width = `${10 + (uploadedCount / totalFiles) * 70}%`;
        uploadStatus.textContent = `Uploading... ${uploadedCount}/${totalFiles} files`;
        return { fileId: response.fileId, url: response.url };
      };

      // Upload all photos
      const photoPromises = photoFiles.map((file, index) => uploadPhoto(file, index));
      const photos = await Promise.all(photoPromises);

      // Upload student ID
      const studentIdPhoto = await uploadStudentId(studentIdFile);

      progressBar.style.width = "90%";
      uploadStatus.textContent = "Submitting registration...";

      // Prepare form data
      const formData = new FormData();
      formData.append("nickname", $("nickname").value);
      formData.append("dob", $("dob").value);
      formData.append("gender", $("gender").value);
      formData.append("sexuality", $("sexuality").value);
      formData.append("bio", $("bio").value || "");
      formData.append("hobbies", JSON.stringify($("hobbies").value.split(",").map((h) => h.trim()).filter((h) => h)));
      if ($("heightFt").value) formData.append("heightFt", $("heightFt").value);
      if ($("heightIn").value) formData.append("heightIn", $("heightIn").value);
      formData.append("zodiac", $("zodiac").value || "");
      formData.append("mbti", $("mbti").value || "");
      formData.append("name", $("name").value);
      formData.append("batch", $("batch").value);
      formData.append("contact", $("contact").value);
      formData.append("username", $("username").value);
      formData.append("password", $("password").value);

      // Add ImageKit data
      formData.append("photos", JSON.stringify(photos));
      formData.append("studentIdPhoto", JSON.stringify(studentIdPhoto));

      // Submit to server
      const response = await fetch("/api/v1/users/signup", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        progressBar.style.width = "100%";
        uploadStatus.textContent = "Registration successful!";
        showMessage(
          `Registration successful! Welcome, ${result.data.user.nickname}. Your account is pending admin approval.`,
          "success"
        );
        form.reset();
        setTimeout(() => {
          window.location.href = "/login.html";
        }, 2000);
      } else {
        showMessage(result.message || "Registration failed. Please try again.", "error");
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error(err);
      showMessage("An error occurred: " + (err.message || "Unknown error"), "error");
      submitBtn.disabled = false;
    } finally {
      uploadProgress.style.display = "none";
    }
  });
}

function showMessage(text, type) {
  const message = $("message");
  message.textContent = text;
  message.className = type === "error" ? "error" : "success";
  message.style.display = "block";
}

window.addEventListener("DOMContentLoaded", init);

