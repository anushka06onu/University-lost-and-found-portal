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
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const formatDate = (v) => { if (!v) return "N/A"; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString(); };
const openModal = (modal) => { if (modal) modal.classList.add("active"); };
const closeModal = (modal) => { if (modal) modal.classList.remove("active"); };
window.closeModal = closeModal;
window.switchAuthView = switchView;
window.togglePassword = (id) => {
    const input = document.getElementById(id);
    if (input) {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        // Find the icon and update it
        const btn = input.parentElement.querySelector('button i');
        if (btn) btn.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        refreshIcons();
    }
};

const apiFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const body = await response.text();
        return new Response(response.status === 204 ? null : body, { status: response.status, headers: response.headers });
    } finally { clearTimeout(timer); }
};
const clearSession = () => {
    authToken = ""; studentEmail = ""; studentName = ""; isAdmin = false;
    ["lf_token", "lf_email", "lf_name", "lf_isAdmin"].forEach(key => localStorage.removeItem(key));
};
if (authToken === "demo_token") clearSession();

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
    document.getElementById("logoutBtn")?.classList.toggle("hidden", !loggedIn);
    refreshIcons();
};

function switchView(view) {
    ["login", "register", "verify", "forgot", "reset", "editProfile", "security"].forEach(v => {
        document.getElementById(`${v}View`)?.classList.toggle("hidden", v !== view);
        document.getElementById(`show${v.charAt(0).toUpperCase() + v.slice(1)}Tab`)?.classList.toggle("active", v === view);
    });
};

const updateProfileDisplay = (user) => {
    isAdmin = user.isAdmin;
    localStorage.setItem("lf_isAdmin", isAdmin ? "true" : "false");
    
    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = user.fullName + (isAdmin ? " (Admin)" : "");
    
    const profileEmailDisplay = document.getElementById("profileEmailDisplay");
    if (profileEmailDisplay) profileEmailDisplay.textContent = user.email;
    
    const profilePreview = document.getElementById("profilePreview");
    if (profilePreview) profilePreview.src = user.profilePictureUrl || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
    
    const profileEditName = document.getElementById("profileEditName");
    if (profileEditName) profileEditName.value = user.fullName;
    
    const editProfilePic = document.getElementById("editProfilePic");
    if (editProfilePic) editProfilePic.value = user.profilePictureUrl || "";
    
    updateAuthUi();
};

const loadProfile = async () => {
    if (!authToken) return;
    
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/auth/profile`, { headers: { "Authorization": `Bearer ${authToken}` } });
        if (!r.ok) { if (r.status === 401) { clearSession(); updateAuthUi(); } throw new Error("Profile unavailable"); }
        const user = await r.json();
        updateProfileDisplay(user);
    } catch (e) { console.error("Profile load failed", e); }
};

// Items & Grid
const loadItems = async (type) => {
    if (!itemsContainer) return;
    itemsContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:4rem;">Searching database...</p>';

    let url = `${API_BASE_URL}/api/items`;
    if (type) url += `?type=${encodeURIComponent(type)}`;

    try {
        const response = await apiFetch(url);
        if (!response.ok) throw new Error("Database unavailable");
        const items = await response.json();
        if (!Array.isArray(items)) throw new Error("Invalid response");
        
        renderItems(items || []);
    } catch (e) {
        itemCount.textContent = "—";
        document.getElementById("skeletonLoader")?.classList.add("hidden");
        itemsContainer.classList.remove("hidden");
        itemsContainer.innerHTML = '<p role="alert" style="grid-column:1/-1;padding:2rem">Records are unavailable. Check your connection and try Refresh.</p>';
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

    itemsContainer.classList.remove("hidden");
    const skeleton = document.getElementById("skeletonLoader");
    if (skeleton) skeleton.classList.add("hidden");

    itemsContainer.innerHTML = sorted.map((item, idx) => `
        <div class="card reveal" style="animation-delay:${idx * 0.05}s">
            <div class="card-img">
                <span class="card-badge ${item.type}">${item.type}</span>
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--surface); color:var(--text-dim); gap:0.5rem;"><i data-lucide="image" style="width:32px; height:32px;"></i><span style="font-size:0.8rem;">Picture not uploaded</span></div>`}
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-text">${escapeHtml(item.description)}</p>
                <div class="card-meta">
                    <div><i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${escapeHtml(item.location)}</div>
                    <div><i data-lucide="calendar" style="width:14px; height:14px;"></i> ${formatDate(item.createdAt)}</div>
                    
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-primary" style="flex:1;" onclick="getItemById(${item.id})">Details</button>
                ${authToken && isAdmin ? `<button class="btn btn-danger" style="padding:0.6rem;" onclick="deleteItem(${item.id})"><i data-lucide="trash-2"></i></button>` : ""}
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
        const r = await apiFetch(`${API_BASE_URL}/api/items/${id}`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (!r.ok) throw new Error("Details unavailable");
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
                         <span><strong>Contact:</strong> ${escapeHtml(item.contactInfo || "Available only to the report author or administrator")}</span>
                    </div>
                    <button class="btn btn-secondary" style="margin-top:1.5rem;" onclick="closeModal(document.getElementById('detailModal'))">Close Details</button>
                </div>
            </div>
        `;
    } catch (e) { detailCard.innerHTML = "Error loading details."; }
};

window.deleteItem = async (id) => {
    if (!confirm("Delete this record permanently?")) return;
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/items/${id}`, { 
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
        const r = await apiFetch(`${API_BASE_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        if (r.ok && d.token) { 
            authToken = d.token; studentEmail = d.email; studentName = d.fullName; isAdmin = !!d.isAdmin;
            localStorage.setItem("lf_token", d.token); localStorage.setItem("lf_email", d.email); localStorage.setItem("lf_name", d.fullName); localStorage.setItem("lf_isAdmin", isAdmin ? "true" : "false");
            closeModal(authModal); updateAuthUi(); loadItems("");
        }
        else document.getElementById("loginMessage").textContent = d.message;
    } catch (e) {
        document.getElementById("loginMessage").textContent = "Sign-in unavailable. No session was created. Try again later.";
    }
});

document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value;
    const msg = document.getElementById("forgotMessage");
    msg.textContent = "Sending OTP...";
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const d = await r.json();
        msg.textContent = d.message || "Request failed.";
        if (!r.ok) return;
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
        const r = await apiFetch(`${API_BASE_URL}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
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
    if (file) { msg.textContent = "File upload is not configured. Use a hosted Cloudinary image URL or submit without an image."; return; }

    const item = { title: document.getElementById("title").value, type: document.getElementById("type").value, description: document.getElementById("description").value, location: document.getElementById("location").value, contactInfo: document.getElementById("contactInfo").value, imageUrl: finalImageUrl };
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/items`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify(item) });
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
    if (file) { msg.textContent = "File upload is not configured. Use a hosted image URL instead."; return; }

    const payload = { fullName: document.getElementById("profileEditName").value, profilePictureUrl: finalPicUrl };
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/auth/profile`, { method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify(payload) });
        const d = await r.json();
        msg.textContent = d.message;
        if (r.ok) { studentName = d.fullName; localStorage.setItem("lf_name", d.fullName); updateAuthUi(); loadProfile(); }
    } catch (e) { msg.textContent = "Update failed."; }
});

document.getElementById("passwordForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("securityMessage");
    msg.textContent = "Updating...";

    const payload = {
        oldPassword: document.getElementById("oldPassword").value,
        newPassword: document.getElementById("newPassword").value
    };

    try {
        const r = await apiFetch(`${API_BASE_URL}/api/auth/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });
        const d = await r.json();
        msg.textContent = d.message;
        if (r.ok) {
            document.getElementById("passwordForm").reset();
            clearSession(); updateAuthUi(); msg.textContent = "Password changed. Sign in again.";
        }
    } catch (e) {
        msg.textContent = "Update failed.";
    }
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

document.querySelectorAll(".filter-tab[data-type]").forEach(btn => {
    btn.addEventListener("click", () => {
        currentFilter = btn.dataset.type;
        document.querySelectorAll(".filter-tab[data-type]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter.textContent = currentFilter ? currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1) : "All";
        loadItems(currentFilter);
    });
});

document.querySelectorAll("[data-scroll-target]").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById(btn.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth" });
        navLinks?.classList.remove("active");
    });
});

// Modals
document.getElementById("forgotPasswordLink")?.addEventListener("click", (e) => { e.preventDefault(); switchView("forgot"); });
document.getElementById("forgotPasswordBtnProfile")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal(profileModal);
    openModal(authModal);
    switchView("forgot");
});
document.getElementById("openProfileBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("profileModal");
    if (modal) {
        modal.classList.add("active");
        switchView("editProfile");
        loadProfile();
    }
});
document.getElementById("closeProfileBtn")?.addEventListener("click", () => closeModal(profileModal));
document.getElementById("closeProfileBackdrop")?.addEventListener("click", () => closeModal(profileModal));
document.getElementById("showEditProfileTab")?.addEventListener("click", () => switchView("editProfile"));
document.getElementById("showSecurityTab")?.addEventListener("click", () => switchView("security"));
document.getElementById("openLoginBtn")?.addEventListener("click", () => { openModal(authModal); switchView("login"); });
document.getElementById("navReportBtn")?.addEventListener("click", () => {
    if (!authToken) {
        alert("Please sign in to submit a report.");
        openModal(authModal);
        switchView("login");
    } else {
        openModal(postModal);
    }
});
document.getElementById("heroAccessBtn")?.addEventListener("click", () => {
    if (!authToken) {
        alert("Please sign in to submit a report.");
        openModal(authModal);
        switchView("login");
    } else {
        openModal(postModal);
    }
});
document.getElementById("closeAuthBtn")?.addEventListener("click", () => closeModal(authModal));
document.getElementById("closeAuthBackdrop")?.addEventListener("click", () => closeModal(authModal));
document.getElementById("closePostBtn")?.addEventListener("click", () => closeModal(postModal));
document.getElementById("closePostBackdrop")?.addEventListener("click", () => closeModal(postModal));
document.getElementById("showLoginTab")?.addEventListener("click", () => switchView("login"));
document.getElementById("showRegisterTab")?.addEventListener("click", () => switchView("register"));
document.getElementById("showVerifyTab")?.addEventListener("click", () => switchView("verify"));
document.getElementById("logoutBtn")?.addEventListener("click", async () => { try { await apiFetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${authToken}` } }); } catch {} clearSession(); updateAuthUi(); loadItems(""); closeModal(profileModal); });
document.getElementById("refreshBtn")?.addEventListener("click", () => loadItems(currentFilter));
document.getElementById("sortOrder")?.addEventListener("change", (e) => { currentSort = e.target.value; loadItems(currentFilter); });

document.getElementById("searchInput")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll("#itemsContainer .card").forEach(card => {
        const title = card.querySelector(".card-title").textContent.toLowerCase();
        const desc = card.querySelector(".card-text").textContent.toLowerCase();
        card.classList.toggle("hidden", !title.includes(query) && !desc.includes(query));
    });
});

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { fullName: document.getElementById("registerName").value, email: document.getElementById("registerEmail").value, password: document.getElementById("registerPassword").value };
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        document.getElementById("registerMessage").textContent = d.message || "Registration failed.";
        if (!r.ok) return;
        document.getElementById("verifyEmail").value = p.email;
        setTimeout(() => switchView("verify"), 2000);
    } catch (e) { document.getElementById("registerMessage").textContent = "Register failed."; }
});

document.getElementById("verifyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { email: document.getElementById("verifyEmail").value, otp: document.getElementById("verifyOtp").value };
    
    try {
        const r = await apiFetch(`${API_BASE_URL}/api/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        const d = await r.json();
        document.getElementById("verifyMessage").textContent = d.message;
        if (d.message?.includes("completed")) setTimeout(() => switchView("login"), 1500);
    } catch (e) { document.getElementById("verifyMessage").textContent = "Verify failed."; }
});

document.querySelectorAll(".faq-header").forEach(h => {
    h.addEventListener("click", () => {
        const item = h.parentElement;
        item.classList.toggle("active");
        document.querySelectorAll(".faq-item").forEach(i => { if (i !== item) i.classList.remove("active"); });
    });
});

// Init
document.body.setAttribute("data-theme", currentTheme);
updateAuthUi();
loadItems("");
if (authToken) loadProfile();

