async function upload() {
  const btn = document.getElementById("uploadBtn");
  const file = document.getElementById("file").files[0];
  const pages = document.getElementById("pages").value;

  if (!file) {
    alert("Select a file");
    return;
  }

  if (!pages || Number(pages) <= 0) {
    alert("Enter valid pages");
    return;
  }

  const fd = new FormData();
  fd.append("printFile", file);
  fd.append("pages", pages);

  btn.disabled = true;
  const oldText = btn.innerText;
  btn.innerText = "Uploading...";

  try {
    const res = await fetch("/upload", { method: "POST", body: fd });
    const data = await res.json();

    if (data.error) {
      alert(data.error);
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
