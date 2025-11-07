function $(id) { return document.getElementById(id); }
function getParam(name) { return new URLSearchParams(location.search).get(name); }

function show(url) {
  const input = $("url");
  const img = $("img");
  if (!url) { img.src = ""; img.alt = ""; return; }
  input.value = url;
  img.src = url;
  img.alt = "Image preview";
  try {
    const next = new URL(location.href);
    next.searchParams.set("url", url);
    history.replaceState({}, "", next);
  } catch (_) {}
}

window.addEventListener("DOMContentLoaded", () => {
  const urlFromQuery = getParam("url");
  if (urlFromQuery) show(urlFromQuery);
  $("loadBtn").addEventListener("click", () => show($("url").value.trim()));
});


