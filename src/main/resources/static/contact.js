const contactForm = document.getElementById("contactForm");
const contactMessageStatus = document.getElementById("contactMessageStatus");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleText = document.getElementById("themeToggleText");
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL
    ? window.APP_CONFIG.API_BASE_URL
    : "").replace(/\/$/, "");

let currentTheme = localStorage.getItem("lf_theme") || getPreferredTheme();

themeToggleBtn.addEventListener("click", function () {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
});

contactForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        name: document.getElementById("contactName").value,
        email: document.getElementById("contactEmail").value,
        subject: document.getElementById("contactSubject").value,
        message: document.getElementById("contactMessage").value
    };

    try {
        const response = await fetch(API_BASE_URL + "/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        contactMessageStatus.textContent = data.message || "Message sent.";
        if (response.ok) {
            contactForm.reset();
        }
    } catch (error) {
        contactMessageStatus.textContent = "Could not send your message right now.";
    }
});

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("lf_theme", theme);
    themeToggleText.textContent = theme === "dark" ? "Light" : "Dark";
}

function getPreferredTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

applyTheme(currentTheme);
