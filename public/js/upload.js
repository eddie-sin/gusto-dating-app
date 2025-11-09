function $(id) { return document.getElementById(id); }

function getFilenameFromPath(path) {
  if (!path) return "upload.jpg";
  const parts = path.split(/[\/\\]/);
  return parts[parts.length - 1] || "upload.jpg";
}

async function init() {
  const uploadBtn = $("uploadBtn");
  const fileInput = $("fileInput");
  const fileNameInput = $("fileName");
  const folderInput = $("folder");
  const bar = $("bar");
  const status = $("status");
  const link = $("link");
  const preview = $("preview");

  const initial = await fetch("/api/v1/images/auth").then(r => r.json());
  const imagekit = new ImageKit({
    publicKey: initial.publicKey,
    urlEndpoint: initial.urlEndpoint,
    authenticationEndpoint: "/api/v1/images/auth",
  });

  function resetProgress() {
    bar.style.width = "0%";
    status.textContent = "";
    link.textContent = "";
    link.href = "#";
    preview.src = "";
    preview.alt = "";
  }

  fileInput.addEventListener("change", () => {
    if (!fileInput.files || !fileInput.files[0]) return;
    if (!fileNameInput.value.trim()) {
      fileNameInput.value = getFilenameFromPath(fileInput.files[0].name);
    }
    resetProgress();
  });

  uploadBtn.addEventListener("click", async () => {
    resetProgress();
    const file = fileInput.files && fileInput.files[0];
    if (!file) { alert("Please choose a file to upload."); return; }
    const fileName = (fileNameInput.value || getFilenameFromPath(file.name)).trim();
    const folder = (folderInput.value || "").trim();

    uploadBtn.disabled = true;
    status.textContent = "Uploading...";

    try {
      // Fetch fresh auth just before upload (ensures valid token/signature)
      const auth = await fetch("/api/v1/images/auth").then(r => r.json());
      const response = await imagekit.upload({
        file,
        fileName,
        folder: folder || undefined,
        useUniqueFileName: true,
        overwriteFile: false,
        // pass auth explicitly to avoid SDK not finding it
        token: auth.token,
        signature: auth.signature,
        expire: auth.expire,
        onProgress: (evt) => {
          if (evt && evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            bar.style.width = pct + "%";
            status.textContent = `Uploading... ${pct}%`;
          }
        },
      });

      bar.style.width = "100%";
      status.textContent = "Upload completed";
      link.textContent = response.url;
      link.href = response.url;
      preview.src = response.url;
      preview.alt = response.name || "Uploaded image";
    } catch (err) {
      console.error(err);
      const msg = (err && (err.message || err.toString())) || "Unknown error";
      status.textContent = "Upload failed: " + msg;
      alert("Upload failed: " + msg);
    } finally {
      uploadBtn.disabled = false;
    }
  });
}

window.addEventListener("DOMContentLoaded", init);


