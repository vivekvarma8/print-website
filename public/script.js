async function upload() {
  const btn = document.getElementById("uploadBtn");
  const files = document.getElementById("files").files;
  const pages = document.getElementById("pages").value;

  if (!files.length) return alert("Select files");
  if (files.length > 10) return alert("Max 10 files allowed");
  if (!pages || Number(pages) <= 0) return alert("Enter valid pages");

  const fd = new FormData();
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > 30 * 1024 * 1024) return alert("One file is too large (max 30MB).");
    fd.append("printFile", files[i]);
  }
  fd.append("pages", pages);

  btn.disabled = true;
  const oldText = btn.innerText;
  btn.innerText = "Uploading...";

  try {
    const res = await fetch("/upload", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Upload failed");
      btn.disabled = false;
      btn.innerText = oldText;
      return;
    }

    localStorage.setItem("order", JSON.stringify(data));
    window.location.href = "payment.html";
  } catch {
    alert("Network error. Try again.");
    btn.disabled = false;
    btn.innerText = oldText;
  }
}
