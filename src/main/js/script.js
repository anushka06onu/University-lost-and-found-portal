const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL ? window.APP_CONFIG.API_BASE_URL : "").replace(/\/$/, "");

// DOM Elements
const authModal = document.getElementById("authModal");
const postModal = document.getElementById("postModal");
const profileModal = document.getElementById("profileModal");
const itemsContainer = document.getElementById("itemsContainer");
const detailCard = document.getElementById("detailCard");
const itemCount = document.getElementById("itemCount");
const activeFilter = document.getElementById("activeFilter");
const userStatus = document.getElementById("userStatus");
const studentStateText = document.getElementById("studentStateText");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navLinks = document.getElementById("navLinks");

// State
let currentFilter = "";
let currentSort = "newest";
let authToken = localStorage.getItem("lf_token") || "";
let studentEmail = localStorage.getItem("lf_email") || "";
let studentName = localStorage.getItem("lf_name") || "";
let isAdmin = localStorage.getItem("lf_isAdmin") === "true";
let currentTheme = localStorage.getItem("lf_theme") || "dark";

// Helpers
const refreshIcons = () => { if (window.lucide) window.lucide.createIcons(); };
const escapeHtml = (v) => String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const formatDate = (v) => { if (!v) return "N/A"; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString(); };
const openModal = (modal) => { if (modal) modal.classList.add("active"); };
const closeModal = (modal) => { if (modal) modal.classList.remove("active"); };
window.closeModal = closeModal;

const uploadToCloudinary = async (file) => {
    console.log("Simulating upload for:", file.name);
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg");
        }, 1500);
    });
};

// Auth & Profile Logic
const updateAuthUi = () => {
    const loggedIn = !!authToken;
    userStatus.textContent = loggedIn ? (studentName.split(' ')[0] || studentEmail) : "Guest";
    
    let stateLabel = loggedIn ? `Verified Student: ${studentEmail}` : "Login required for posting.";
    if (loggedIn && isAdmin) stateLabel = `Logged in as Administrator (${studentEmail})`;
    studentStateText.textContent = stateLabel;
    
    document.getElementById("statusDot").style.background = loggedIn ? (isAdmin ? "#f59e0b" : "var(--primary)") : "#94a3b8";
    
    document.getElementById("openLoginBtn")?.classList.toggle("hidden", loggedIn);
    document.getElementById("openProfileBtn")?.classList.toggle("hidden", !loggedIn);
    document.getElementById("openPostBtn")?.classList.toggle("hidden", !loggedIn);
    refreshIcons();
};

const switchView = (view) => {
    ["login", "register", "verify", "forgot", "reset", "editProfile", "security"].forEach(v => {
        document.getElementById(`${v}View`)?.classList.toggle("hidden", v !== view);
        document.getElementById(`show${v.charAt(0).toUpperCase() + v.slice(1)}Tab`)?.classList.toggle("active", v === view);
    });
};

const loadProfile = async () => {
    if (!authToken) return;
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/profile`, { headers: { "Authorization": `Bearer ${authToken}` } });
        const user = await r.json();
        isAdmin = user.isAdmin;
        localStorage.setItem("lf_isAdmin", isAdmin ? "true" : "false");
        
        document.getElementById("profileName").textContent = user.fullName + (isAdmin ? " (Admin)" : "");
        document.getElementById("profileEmail").textContent = user.email;
        document.getElementById("profilePreview").src = user.profilePictureUrl || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
        document.getElementById("editFullName").value = user.fullName;
        document.getElementById("editProfilePic").value = user.profilePictureUrl || "";
        updateAuthUi();
    } catch (e) { console.error("Profile load failed"); }
};

// Items & Grid
const loadItems = async (type) => {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:4rem;">Searching database...</p>';

    let url = `${API_BASE_URL}/api/items`;
    if (type) url += `?type=${encodeURIComponent(type)}`;

    try {
        const response = await fetch(url);
        const items = await response.json();
        renderItems(items);
    } catch (e) {
        itemsContainer.innerHTML = "<p>Error loading items.</p>";
    }
};

const renderItems = (items) => {
    const sorted = [...items].sort((a, b) => {
        if (currentSort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    itemCount.textContent = sorted.length;
    if (sorted.length === 0) {
        itemsContainer.innerHTML = "<p style='grid-column:1/-1; text-align:center; padding:4rem; opacity:0.5;'>No records found in this category.</p>";
        return;
    }

    itemsContainer.innerHTML = sorted.map((item, idx) => `
        <div class="card reveal" style="animation-delay:${idx * 0.05}s">
            <div class="card-img">
                <span class="card-badge ${item.type}">${item.type}</span>
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : `<i data-lucide="image" style="width:48px; height:48px; color:var(--text-dim);"></i>`}
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-text">${escapeHtml(item.description)}</p>
                <div class="card-meta">
                    <div><i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${escapeHtml(item.location)}</div>
                    <div><i data-lucide="calendar" style="width:14px; height:14px;"></i> ${formatDate(item.createdAt)}</div>
                    <div><i data-lucide="user" style="width:14px; height:14px;"></i> ${escapeHtml(item.postedBy)}</div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary" style="flex:1;" onclick="getItemById(${item.id})">Details</button>
                ${authToken && (item.postedBy === studentEmail || isAdmin) ? `<button class="btn btn-danger" style="padding:0.6rem;" onclick="deleteItem(${item.id})"><i data-lucide="trash-2"></i></button>` : ""}
            </div>
        </div>
    `).join("");
    refreshIcons();
};

window.getItemById = async (id) => {
    if (!authToken) { alert("Please login to view contact details."); openModal(authModal); switchView("login"); return; }
    detailCard.innerHTML = "Loading...";
    openModal(document.getElementById("detailModal"));
    detailCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
        const r = await fetch(`${API_BASE_URL}/api/items/${id}`);
        const item = await r.json();
        detailCard.innerHTML = `
            <div style="display:flex; gap:2rem; align-items:center; flex-wrap:wrap">
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" style="width:150px; height:150px; border-radius:15px; object-fit:cover;">` : ""}
                <div style="flex:1; min-width:250px;">
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <h2 style="margin:0">${escapeHtml(item.title)}</h2>
                        <span class="badge ${item.type}">${item.type}</span>
                    </div>
                    <p style="margin:1rem 0; font-size:1.1rem;">${escapeHtml(item.description)}</p>
                    <div class="meta" style="border:none; padding:0; flex-direction:row; gap:2rem;">
                         <span><strong>Location:</strong> ${escapeHtml(item.location)}</span>
                         <span><strong>Contact:</strong> ${escapeHtml(item.contactInfo || "N/A")}</span>
                    </div>
                    <button class="nav-btn ghost" style="margin-top:1.5rem;" onclick="document.getElementById('detailCard').classList.add('hidden')">Close Details</button>
                </div>
            </div>
        `;
    } catch (e) { detailCard.innerHTML = "Error loading details."; }
};

window.deleteItem = async (id) => {
    if (!confirm("Delete this record permanently?")) return;
    try {
        const r = await fetch(`${API_BASE_URL}/api/items/${id}`, { 
            method: "DELETE", 
            headers: { "Authorization": `Bearer ${authToken}` } 
        });
        if (r.ok) loadItems(currentFilter);
        else { const d = await r.json(); alert(d.message || "Delete failed."); }
    } catch (e) { alert("Delete failed."); }
};

// Forms
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { email: document.getElementById("loginEmail").value, password: document.getElementById("loginPassword").value };
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        if (d.token) { 
            authToken = d.token; studentEmail = d.email; studentName = d.fullName; isAdmin = !!d.isAdmin;
            localStorage.setItem("lf_token", d.token); localStorage.setItem("lf_email", d.email); localStorage.setItem("lf_name", d.fullName); localStorage.setItem("lf_isAdmin", isAdmin ? "true" : "false");
            closeModal(authModal); updateAuthUi(); loadItems("");
        }
        else document.getElementById("loginMessage").textContent = d.message;
    } catch (e) { document.getElementById("loginMessage").textContent = "Login failed."; }
});

document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value;
    const msg = document.getElementById("forgotMessage");
    msg.textContent = "Sending OTP...";
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const d = await r.json();
        msg.innerHTML = `${d.message}<br><strong>OTP: ${d.devOtp || ""}</strong>`;
        document.getElementById("resetEmailField").value = email;
        setTimeout(() => switchView("reset"), 2000);
    } catch (e) { msg.textContent = "Request failed."; }
});

document.getElementById("resetForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { email: document.getElementById("resetEmailField").value, otp: document.getElementById("resetOtp").value, newPassword: document.getElementById("resetNewPassword").value };
    const msg = document.getElementById("resetMessage");
    msg.textContent = "Resetting...";
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        msg.textContent = d.message;
        if (r.ok) setTimeout(() => switchView("login"), 1500);
    } catch (e) { msg.textContent = "Reset failed."; }
});

document.getElementById("itemForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("formMessage");
    msg.textContent = "Publishing...";

    let finalImageUrl = document.getElementById("imageUrl").value;
    const file = document.getElementById("itemImageFile").files[0];
    if (file) finalImageUrl = await uploadToCloudinary(file);

    const item = { title: document.getElementById("title").value, type: document.getElementById("type").value, description: document.getElementById("description").value, location: document.getElementById("location").value, contactInfo: document.getElementById("contactInfo").value, imageUrl: finalImageUrl };
    try {
        const r = await fetch(`${API_BASE_URL}/api/items`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify(item) });
        if (r.ok) { closeModal(postModal); document.getElementById("itemForm").reset(); loadItems(currentFilter); }
        else msg.textContent = "Error publishing.";
    } catch (e) { msg.textContent = "Error publishing."; }
});

document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("profileMessage");
    msg.textContent = "Saving...";

    let finalPicUrl = document.getElementById("editProfilePic").value;
    const file = document.getElementById("profilePicFile").files[0];
    if (file) finalPicUrl = await uploadToCloudinary(file);

    const payload = { fullName: document.getElementById("editFullName").value, profilePictureUrl: finalPicUrl };
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/profile`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify(payload) });
        const d = await r.json();
        msg.textContent = d.message;
        if (r.ok) { studentName = d.fullName; localStorage.setItem("lf_name", d.fullName); updateAuthUi(); loadProfile(); }
    } catch (e) { msg.textContent = "Update failed."; }
});

// Navigation & Interactive
hamburgerBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    navLinks?.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (navLinks?.classList.contains("active") && !navLinks.contains(e.target) && e.target !== hamburgerBtn) {
        navLinks.classList.remove("active");
    }
});

document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", currentTheme);
    localStorage.setItem("lf_theme", currentTheme);
    const icon = document.getElementById("themeIcon");
    if (icon) icon.setAttribute("data-lucide", currentTheme === "dark" ? "moon" : "sun");
    refreshIcons();
});

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.type;
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter.textContent = currentFilter ? currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1) : "All";
        loadItems(currentFilter);
    });
});

document.querySelectorAll("[data-scroll-target]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth" });
        navLinks?.classList.remove("active");
    });
});

// Modals
document.getElementById("forgotPasswordLink")?.addEventListener("click", (e) => { e.preventDefault(); switchView("forgot"); });
document.getElementById("openProfileBtn")?.addEventListener("click", () => { openModal(profileModal); switchView("editProfile"); loadProfile(); });
document.getElementById("closeProfileBtn")?.addEventListener("click", () => closeModal(profileModal));
document.getElementById("closeProfileBackdrop")?.addEventListener("click", () => closeModal(profileModal));
document.getElementById("showEditProfileTab")?.addEventListener("click", () => switchView("editProfile"));
document.getElementById("showSecurityTab")?.addEventListener("click", () => switchView("security"));
document.getElementById("openLoginBtn")?.addEventListener("click", () => { openModal(authModal); switchView("login"); });
document.getElementById("heroRegisterBtn")?.addEventListener("click", () => { openModal(authModal); switchView("register"); });
document.getElementById("openPostBtn")?.addEventListener("click", () => openModal(postModal));
document.getElementById("closeAuthBtn")?.addEventListener("click", () => closeModal(authModal));
document.getElementById("closeAuthBackdrop")?.addEventListener("click", () => closeModal(authModal));
document.getElementById("closePostBtn")?.addEventListener("click", () => closeModal(postModal));
document.getElementById("closePostBackdrop")?.addEventListener("click", () => closeModal(postModal));
document.getElementById("showLoginTab")?.addEventListener("click", () => switchView("login"));
document.getElementById("showRegisterTab")?.addEventListener("click", () => switchView("register"));
document.getElementById("showVerifyTab")?.addEventListener("click", () => switchView("verify"));
document.getElementById("logoutBtn")?.addEventListener("click", () => { authToken = ""; localStorage.clear(); updateAuthUi(); loadItems(""); closeModal(profileModal); });
document.getElementById("refreshBtn")?.addEventListener("click", () => loadItems(currentFilter));
document.getElementById("sortOrder")?.addEventListener("change", (e) => { currentSort = e.target.value; loadItems(currentFilter); });

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { fullName: document.getElementById("registerName").value, email: document.getElementById("registerEmail").value, password: document.getElementById("registerPassword").value };
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        document.getElementById("registerMessage").innerHTML = `${d.message}<br><strong>OTP: ${d.devOtp || ""}</strong>`;
        document.getElementById("verifyEmail").value = p.email;
        setTimeout(() => switchView("verify"), 2000);
    } catch (e) { document.getElementById("registerMessage").textContent = "Register failed."; }
});

document.getElementById("verifyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { email: document.getElementById("verifyEmail").value, otp: document.getElementById("verifyOtp").value };
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        document.getElementById("verifyMessage").textContent = d.message;
        if (d.message?.includes("completed")) setTimeout(() => switchView("login"), 1500);
    } catch (e) { document.getElementById("verifyMessage").textContent = "Verify failed."; }
});

document.querySelectorAll(".accordion-header").forEach(h => {
    h.addEventListener("click", () => {
        const item = h.parentElement;
        item.classList.toggle("active");
        document.querySelectorAll(".accordion-item").forEach(i => { if (i !== item) i.classList.remove("active"); });
    });
});

// Init
document.body.setAttribute("data-theme", currentTheme);
updateAuthUi();
loadItems("");
if (authToken) loadProfile();
