// Official Support Logic
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL ? window.APP_CONFIG.API_BASE_URL : "").replace(/\/$/, "");

// Elements
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

const showToast = (msg, isError = false) => {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.querySelector('.toast-content').style.borderColor = isError ? '#f43f5e' : 'var(--primary)';
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
};

document.getElementById("contactForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const originalText = btn.textContent;
    btn.textContent = "Transmitting Data...";
    btn.disabled = true;

    const payload = {
        name: document.getElementById("contactName").value,
        email: document.getElementById("contactEmail").value,
        subject: document.getElementById("contactSubject").value,
        message: document.getElementById("contactMessage").value
    };

    try {
        const r = await fetch(`${API_BASE_URL}/api/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (r.ok) {
            showToast("✓ Inquiry transmitted to support database");
            e.target.reset();
        } else {
            showToast("Transmission failed. Database offline.", true);
        }
    } catch (error) {
        showToast("Network encryption error. Retry inquiry.", true);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});
