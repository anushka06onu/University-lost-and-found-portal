const itemForm = document.getElementById("itemForm");
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL
    ? window.APP_CONFIG.API_BASE_URL
    : "").replace(/\/$/, "");
const formMessage = document.getElementById("formMessage");
const contactForm = document.getElementById("contactForm");
const contactMessageStatus = document.getElementById("contactMessageStatus");
const itemsContainer = document.getElementById("itemsContainer");
const detailCard = document.getElementById("detailCard");
const filterButtons = document.querySelectorAll(".filter-btn[data-type]");
const sortOrder = document.getElementById("sortOrder");
const itemCount = document.getElementById("itemCount");
const activeFilter = document.getElementById("activeFilter");
const searchByIdBtn = document.getElementById("searchByIdBtn");
const itemIdInput = document.getElementById("itemIdInput");
const refreshBtn = document.getElementById("refreshBtn");
const userStatus = document.getElementById("userStatus");
const studentStateText = document.getElementById("studentStateText");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeToggleText = document.getElementById("themeToggleText");
const scrollButtons = document.querySelectorAll("[data-scroll-target]");
const heroViewRecordsBtn = document.getElementById("heroViewRecordsBtn");
const footerContactShortcutBtn = document.getElementById("footerContactShortcutBtn");

const authModal = document.getElementById("authModal");
const postModal = document.getElementById("postModal");
const openRegisterBtn = document.getElementById("openRegisterBtn");
const openLoginBtn = document.getElementById("openLoginBtn");
const heroRegisterBtn = document.getElementById("heroRegisterBtn");
const studentAccessBtn = document.getElementById("studentAccessBtn");
const openPostBtn = document.getElementById("openPostBtn");
const logoutBtn = document.getElementById("logoutBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const closeAuthBackdrop = document.getElementById("closeAuthBackdrop");
const closePostBtn = document.getElementById("closePostBtn");
const closePostBackdrop = document.getElementById("closePostBackdrop");

const showRegisterTab = document.getElementById("showRegisterTab");
const showLoginTab = document.getElementById("showLoginTab");
const showVerifyTab = document.getElementById("showVerifyTab");
const registerView = document.getElementById("registerView");
const verifyView = document.getElementById("verifyView");
const loginView = document.getElementById("loginView");

const registerForm = document.getElementById("registerForm");
const verifyForm = document.getElementById("verifyForm");
const loginForm = document.getElementById("loginForm");
const registerMessage = document.getElementById("registerMessage");
const verifyMessage = document.getElementById("verifyMessage");
const loginMessage = document.getElementById("loginMessage");

let currentFilter = "";
let currentSort = "newest";
let authToken = localStorage.getItem("lf_token") || "";
let studentEmail = localStorage.getItem("lf_email") || "";
let studentName = localStorage.getItem("lf_name") || "";
let currentTheme = localStorage.getItem("lf_theme") || getPreferredTheme();

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        fullName: document.getElementById("registerName").value,
        email: document.getElementById("registerEmail").value,
        password: document.getElementById("registerPassword").value
    };

    try {
        const response = await fetch(API_BASE_URL + "/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        registerMessage.textContent = data.message || "Something went wrong.";
        if (data.devOtp) {
            registerMessage.textContent += " OTP: " + data.devOtp;
        }
        document.getElementById("verifyEmail").value = payload.email;
        switchView("verify");
    } catch (error) {
        registerMessage.textContent = "Could not register right now.";
    }
});

verifyForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        email: document.getElementById("verifyEmail").value,
        otp: document.getElementById("verifyOtp").value
    };

    try {
        const response = await fetch(API_BASE_URL + "/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        verifyMessage.textContent = data.message || "Something went wrong.";
        if ((data.message || "").toLowerCase().includes("completed")) {
            document.getElementById("loginEmail").value = payload.email;
            switchView("login");
        }
    } catch (error) {
        verifyMessage.textContent = "Could not verify OTP.";
    }
});

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
    };

    try {
        const response = await fetch(API_BASE_URL + "/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        loginMessage.textContent = data.message || "Something went wrong.";

        if (data.token) {
            authToken = data.token;
            studentEmail = data.email;
            studentName = data.fullName;
            localStorage.setItem("lf_token", authToken);
            localStorage.setItem("lf_email", studentEmail);
            localStorage.setItem("lf_name", studentName);
            updateAuthUi();
            closeAuthModal();
        }
    } catch (error) {
        loginMessage.textContent = "Could not login right now.";
    }
});

if (contactForm) {
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
}

itemForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!authToken) {
        formMessage.textContent = "Login required.";
        return;
    }

    const item = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        type: document.getElementById("type").value,
        location: document.getElementById("location").value,
        contactInfo: document.getElementById("contactInfo").value,
        imageUrl: document.getElementById("imageUrl").value
    };

    if (item.imageUrl && !item.imageUrl.includes("cloudinary.com")) {
        formMessage.textContent = "Use a Cloudinary image link.";
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + authToken
            },
            body: JSON.stringify(item)
        });

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(data.message || data || "Could not add item");
        }

        itemForm.reset();
        formMessage.textContent = "Item published successfully.";
        loadItems(currentFilter);
    } catch (error) {
        formMessage.textContent = error.message || "Something went wrong while publishing.";
    }
});

filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        currentFilter = button.dataset.type;
        filterButtons.forEach(function (btn) {
            btn.classList.remove("active");
        });
        button.classList.add("active");
        activeFilter.textContent = currentFilter ? capitalize(currentFilter) : "All";
        detailCard.classList.add("hidden");
        loadItems(currentFilter);
    });
});

if (sortOrder) {
    sortOrder.addEventListener("change", function () {
        currentSort = sortOrder.value;
        detailCard.classList.add("hidden");
        loadItems(currentFilter);
    });
}

searchByIdBtn.addEventListener("click", function () {
    const id = itemIdInput.value.trim();
    if (!id) {
        detailCard.classList.remove("hidden");
        detailCard.innerHTML = "<p>Please enter an item id.</p>";
        return;
    }
    getItemById(id);
});

refreshBtn.addEventListener("click", function () {
    detailCard.classList.add("hidden");
    itemIdInput.value = "";
    loadItems(currentFilter);
});

scrollButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        scrollToSection(button.dataset.scrollTarget);
    });
});

if (heroViewRecordsBtn) {
    heroViewRecordsBtn.addEventListener("click", function () {
        scrollToSection("items");
    });
}

if (footerContactShortcutBtn) {
    footerContactShortcutBtn.addEventListener("click", function () {
        window.location.href = "/contact.html";
    });
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(currentTheme);
    });
}

openRegisterBtn.addEventListener("click", function () {
    openAuthModal();
    switchView("register");
});

heroRegisterBtn.addEventListener("click", function () {
    openAuthModal();
    switchView("register");
});

openLoginBtn.addEventListener("click", function () {
    openAuthModal();
    switchView("login");
});

studentAccessBtn.addEventListener("click", function () {
    if (authToken) {
        openPostModal();
    } else {
        openAuthModal();
        switchView("register");
    }
});

openPostBtn.addEventListener("click", openPostModal);
logoutBtn.addEventListener("click", logout);
closeAuthBtn.addEventListener("click", closeAuthModal);
closeAuthBackdrop.addEventListener("click", closeAuthModal);
closePostBtn.addEventListener("click", closePostModal);
closePostBackdrop.addEventListener("click", closePostModal);
showRegisterTab.addEventListener("click", function () { switchView("register"); });
showLoginTab.addEventListener("click", function () { switchView("login"); });
showVerifyTab.addEventListener("click", function () { switchView("verify"); });

async function loadItems(type) {
    let url = API_BASE_URL + "/api/items";
    if (type) {
        url += "?type=" + encodeURIComponent(type);
    }

    try {
        const response = await fetch(url);
        const items = await response.json();
        renderItems(sortItems(items));
    } catch (error) {
        itemsContainer.innerHTML = "<div class='empty-state'>Could not load items right now.</div>";
        itemCount.textContent = "0";
    }
}

function renderItems(items) {
    itemCount.textContent = items.length;

    if (items.length === 0) {
        itemsContainer.innerHTML = "<div class='empty-state'>No items found for this view.</div>";
        return;
    }

    itemsContainer.innerHTML = items.map(function (item, index) {
        return `
            <div class="item-card" style="animation-delay:${index * 0.06}s">
                ${item.imageUrl ? `<div class="item-image-wrap"><img class="item-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}"></div>` : ""}
                <div class="item-top">
                    <h3 class="item-title">${escapeHtml(item.title)}</h3>
                    <span class="badge ${item.type}">${escapeHtml(item.type)}</span>
                </div>
                <p class="item-text">${escapeHtml(item.description)}</p>
                <div class="meta">
                    <span><strong>Location:</strong> ${escapeHtml(item.location || "")}</span>
                    <span><strong>Contact:</strong> ${escapeHtml(item.contactInfo || "")}</span>
                    <span><strong>Posted by:</strong> ${escapeHtml(item.postedBy || "Not available")}</span>
                    <span><strong>Created:</strong> ${formatDate(item.createdAt)}</span>
                </div>
                <div class="actions">
                    <button class="action-btn view" onclick="getItemById(${item.id})">View Details</button>
                    ${authToken ? `<button class="action-btn delete" onclick="deleteItem(${item.id})">Delete</button>` : ""}
                </div>
            </div>
        `;
    }).join("");
}

async function getItemById(id) {
    if (!authToken) {
        detailCard.classList.remove("hidden");
        detailCard.innerHTML = "<p>Login required to view full item details.</p>";
        openAuthModal();
        switchView("login");
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/items/" + id);
        if (!response.ok) {
            detailCard.classList.remove("hidden");
            detailCard.innerHTML = "<p>Item not found.</p>";
            return;
        }

        const item = await response.json();
        detailCard.classList.remove("hidden");
        detailCard.innerHTML = `
            ${item.imageUrl ? `<div class="detail-image-wrap"><img class="detail-image" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}"></div>` : ""}
            <div class="item-top">
                <h3 class="item-title">${escapeHtml(item.title)}</h3>
                <span class="badge ${item.type}">${escapeHtml(item.type)}</span>
            </div>
            <p class="item-text">${escapeHtml(item.description)}</p>
            <div class="meta">
                <span><strong>ID:</strong> ${item.id}</span>
                <span><strong>Location:</strong> ${escapeHtml(item.location || "")}</span>
                <span><strong>Contact:</strong> ${escapeHtml(item.contactInfo || "")}</span>
                <span><strong>Posted by:</strong> ${escapeHtml(item.postedBy || "Not available")}</span>
                <span><strong>Created:</strong> ${formatDate(item.createdAt)}</span>
            </div>
        `;
    } catch (error) {
        detailCard.classList.remove("hidden");
        detailCard.innerHTML = "<p>Could not load item details.</p>";
    }
}

async function deleteItem(id) {
    if (!authToken) {
        window.alert("Login required.");
        return;
    }

    const confirmed = window.confirm("Delete this item?");
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + "/api/items/" + id, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + authToken
            }
        });

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(data.message || data || "Delete failed");
        }

        detailCard.classList.add("hidden");
        loadItems(currentFilter);
    } catch (error) {
        window.alert(error.message || "Could not delete the item.");
    }
}

function openAuthModal() {
    authModal.classList.remove("hidden");
}

function closeAuthModal() {
    authModal.classList.add("hidden");
}

function openPostModal() {
    if (!authToken) {
        openAuthModal();
        switchView("login");
        return;
    }
    postModal.classList.remove("hidden");
}

function closePostModal() {
    postModal.classList.add("hidden");
}

function switchView(view) {
    registerView.classList.toggle("hidden", view !== "register");
    loginView.classList.toggle("hidden", view !== "login");
    verifyView.classList.toggle("hidden", view !== "verify");

    showRegisterTab.classList.toggle("active", view === "register");
    showLoginTab.classList.toggle("active", view === "login");
    showVerifyTab.classList.toggle("active", view === "verify");
}

function updateAuthUi() {
    const loggedIn = Boolean(authToken);

    userStatus.textContent = loggedIn ? studentName || studentEmail : "Guest";
    studentStateText.textContent = loggedIn
        ? "Logged in as " + (studentEmail || "student") + ". You can now post items."
        : "Guest mode active. Login required for posting.";

    openRegisterBtn.classList.toggle("hidden", loggedIn);
    openLoginBtn.classList.toggle("hidden", loggedIn);
    openPostBtn.classList.toggle("hidden", !loggedIn);
    logoutBtn.classList.toggle("hidden", !loggedIn);
}

function sortItems(items) {
    return [...items].sort(function (first, second) {
        if (currentSort === "oldest") {
            return new Date(first.createdAt || 0) - new Date(second.createdAt || 0);
        }

        if (currentSort === "title") {
            return String(first.title || "").localeCompare(String(second.title || ""));
        }

        return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
    });
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("lf_theme", theme);
    themeToggleText.textContent = theme === "dark" ? "Light" : "Dark";
}

function getPreferredTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function scrollToSection(targetId) {
    const section = document.getElementById(targetId);
    if (!section) {
        return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState({}, "", window.location.pathname);
}

function logout() {
    authToken = "";
    studentEmail = "";
    studentName = "";
    localStorage.removeItem("lf_token");
    localStorage.removeItem("lf_email");
    localStorage.removeItem("lf_name");
    updateAuthUi();
    loadItems(currentFilter);
    closePostModal();
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

async function parseResponse(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}

applyTheme(currentTheme);
updateAuthUi();
switchView("register");
loadItems("");
window.history.replaceState({}, "", window.location.pathname);

window.getItemById = getItemById;
window.deleteItem = deleteItem;
