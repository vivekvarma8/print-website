async function upload() {
  const btn = document.getElementById("uploadBtn");
  const file = document.getElementById("file").files[0];
  const pages = document.getElementById("pages").value;

  if (!file) return alert("Select a file");
  if (!pages || Number(pages) <= 0) return alert("Enter valid pages");

  if (file.size > 10 * 1024 * 1024) return alert("File too large. Max 10MB.");

  const fd = new FormData();
  fd.append("printFile", file);
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
  } catch (e) {
    alert("Network error. Try again.");
    btn.disabled = false;
    btn.innerText = oldText;
  }
}
async function upload() {
  const btn = document.getElementById("uploadBtn");
  const file = document.getElementById("file").files[0];
  const pages = document.getElementById("pages").value;

  if (!file) return alert("Select a file");
  if (!pages || Number(pages) <= 0) return alert("Enter valid pages");
  if (file.size > 10 * 1024 * 1024) return alert("File too large. Max 10MB.");

  const fd = new FormData();
  fd.append("printFile", file);
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
