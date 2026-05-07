const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL ? window.APP_CONFIG.API_BASE_URL : "").replace(/\/$/, "");

// Application State
let allItems = [];
let currentFilter = "";
let currentSort = "newest";
let authToken = localStorage.getItem("lf_token") || "";
let studentEmail = localStorage.getItem("lf_email") || "";
let studentName = localStorage.getItem("lf_name") || "";
let isAdmin = localStorage.getItem("lf_isAdmin") === "true";
let currentTheme = localStorage.getItem("lf_theme") || "light";

// DOM Elements
const authModal = document.getElementById("authModal");
const postModal = document.getElementById("postModal");
const profileModal = document.getElementById("profileModal");
const detailModal = document.getElementById("detailModal");
const detailCard = document.getElementById("detailCard");
const itemsContainer = document.getElementById("itemsContainer");
const skeletonLoader = document.getElementById("skeletonLoader");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

// Helper Functions
const refreshIcons = () => { if (window.lucide) window.lucide.createIcons(); };
const escapeHtml = (v) => String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const formatDate = (v) => { 
    if (!v) return "N/A"; 
    const d = new Date(v); 
    return isNaN(d) ? v : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); 
};

const showToast = (msg) => {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.classList.add("active");
    setTimeout(() => toast.classList.remove("active"), 3000);
};

const openModal = (modal) => {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
};

const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
};

// Data Loading
const loadItems = async () => {
    if (!itemsContainer || !skeletonLoader) return;
    
    skeletonLoader.classList.remove("hidden");
    itemsContainer.classList.add("hidden");
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/items`);
        if (!response.ok) throw new Error();
        allItems = await response.json();
        renderItems();
    } catch (e) {
        itemsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted);">
                <p>Unable to connect to the database. Please try again.</p>
                <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="loadItems()">Retry</button>
            </div>
        `;
    } finally {
        skeletonLoader.classList.add("hidden");
        itemsContainer.classList.remove("hidden");
    }
};

const renderItems = (searchQuery = "") => {
    let filtered = [...allItems];
    if (currentFilter) filtered = filtered.filter(i => i.type === currentFilter);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.location.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
        const d1 = new Date(a.createdAt || 0);
        const d2 = new Date(b.createdAt || 0);
        return currentSort === "oldest" ? d1 - d2 : d2 - d1;
    });

    document.getElementById("itemCount").textContent = filtered.length;

    if (filtered.length === 0) {
        itemsContainer.innerHTML = "<div style='grid-column:1/-1; text-align:center; padding:5rem; opacity:0.5;'><p>No matching records found.</p></div>";
        return;
    }

    itemsContainer.innerHTML = filtered.map(item => `
        <div class="card">
            <div class="card-img">
                <span class="card-badge ${item.type}">${item.type}</span>
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : `<i data-lucide="package" style="width:48px; height:48px; color:var(--text-dim);"></i>`}
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-text">${escapeHtml(item.description)}</p>
                <div class="card-meta">
                    <div><i data-lucide="map-pin" style="width:14px;"></i> <span>${escapeHtml(item.location)}</span></div>
                    <div><i data-lucide="calendar" style="width:14px;"></i> <span>${formatDate(item.createdAt)}</span></div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn btn-secondary" style="flex:1;" onclick="getItemById(${item.id})">Details</button>
                ${authToken && (item.postedBy === studentEmail || isAdmin) ? `
                    <button class="btn btn-danger" onclick="deleteItem(${item.id})"><i data-lucide="trash-2" style="width:16px;"></i></button>
                ` : ""}
            </div>
        </div>
    `).join("");
    refreshIcons();
};

window.getItemById = async (id) => {
    detailCard.innerHTML = "<div style='padding:4rem; text-align:center;'>Loading...</div>";
    openModal(detailModal);
    try {
        const r = await fetch(`${API_BASE_URL}/api/items/${id}`);
        const item = await r.json();
        detailCard.innerHTML = `
            <button class="modal-close" onclick="closeModal(document.getElementById('detailModal'))">&times;</button>
            <div style="margin-bottom: 1.5rem;">
                <span class="card-badge ${item.type}">${item.type} Item</span>
                <h2 style="margin-top: 0.5rem;">${escapeHtml(item.title)}</h2>
            </div>
            <div style="width:100%; height:250px; background:var(--surface); border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:1.5rem;">
                ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : `<i data-lucide="package" style="width:64px; height:64px; color:var(--text-dim);"></i>`}
            </div>
            <p style="margin-bottom: 2rem;">${escapeHtml(item.description)}</p>
            <div class="card-meta" style="background:var(--surface); padding:1.25rem; border-radius:8px; border:none;">
                <div><i data-lucide="map-pin" style="width:16px; color:var(--primary);"></i> <strong>Location:</strong> ${escapeHtml(item.location)}</div>
                <div><i data-lucide="user" style="width:16px; color:var(--primary);"></i> <strong>Posted By:</strong> ${escapeHtml(item.postedBy)}</div>
                <div><i data-lucide="info" style="width:16px; color:var(--primary);"></i> <strong>Contact:</strong> ${escapeHtml(item.contactInfo || "Visit Security Desk")}</div>
            </div>
            <button class="btn btn-primary" style="width:100%; margin-top: 2rem;" onclick="closeModal(document.getElementById('detailModal'))">Close</button>
        `;
        refreshIcons();
    } catch (e) { detailCard.innerHTML = "<p>Error loading record.</p>"; }
};

window.deleteItem = async (id) => {
    if (!confirm("Delete this report?")) return;
    try {
        const r = await fetch(`${API_BASE_URL}/api/items/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${authToken}` } });
        if (r.ok) { showToast("Record removed."); loadItems(); }
        else { showToast("Unauthorized."); }
    } catch (e) { showToast("Error."); }
};

// UI Interactions
const updateAuthUi = () => {
    const loggedIn = !!authToken;
    document.getElementById("openLoginBtn")?.classList.toggle("hidden", loggedIn);
    document.getElementById("openProfileBtn")?.classList.toggle("hidden", !loggedIn);
    document.getElementById("logoutBtn")?.classList.toggle("hidden", !loggedIn);
    
    const stateText = document.getElementById("studentStateText");
    if (stateText) {
        stateText.textContent = loggedIn ? (isAdmin ? "Administrator Mode" : `Logged in as ${studentEmail}`) : "Sign in to report items and access full features.";
    }
    refreshIcons();
};

const switchAuthView = (view) => {
    ["login", "register", "verify", "forgot", "reset"].forEach(v => {
        document.getElementById(`${v}View`)?.classList.toggle("hidden", v !== view);
    });
};

document.getElementById("showLoginTab")?.addEventListener("click", () => {
    switchAuthView("login");
    document.getElementById("showLoginTab").classList.add("active");
    document.getElementById("showRegisterTab").classList.remove("active");
});
document.getElementById("showRegisterTab")?.addEventListener("click", () => {
    switchAuthView("register");
    document.getElementById("showRegisterTab").classList.add("active");
    document.getElementById("showLoginTab").classList.remove("active");
});

document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    currentTheme = currentTheme === "light" ? "dark" : "light";
    document.body.setAttribute("data-theme", currentTheme);
    localStorage.setItem("lf_theme", currentTheme);
    refreshIcons();
});

document.querySelectorAll(".filter-tab").forEach(btn => btn.addEventListener("click", () => {
    currentFilter = btn.dataset.type;
    document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderItems();
}));

document.getElementById("searchInput")?.addEventListener("input", (e) => renderItems(e.target.value));
document.getElementById("sortOrder")?.addEventListener("change", (e) => { currentSort = e.target.value; renderItems(); });

document.getElementById("heroAccessBtn")?.addEventListener("click", () => {
    if (authToken) openModal(postModal); else openModal(authModal);
});

// Forms
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const d = await r.json();
        if (d.token) {
            authToken = d.token; studentEmail = d.email; studentName = d.fullName; isAdmin = !!d.isAdmin;
            localStorage.setItem("lf_token", d.token); localStorage.setItem("lf_email", d.email); localStorage.setItem("lf_name", d.fullName); localStorage.setItem("lf_isAdmin", isAdmin);
            closeModal(authModal); updateAuthUi(); loadItems(); showToast(`Welcome, ${studentName}`);
        } else { showToast(d.message || "Login failed"); }
    } catch (e) { showToast("Server error"); }
});

document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = { fullName: document.getElementById("registerName").value, email: document.getElementById("registerEmail").value, password: document.getElementById("registerPassword").value };
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (r.ok) { showToast("Code sent!"); document.getElementById("verifyEmail").value = payload.email; switchAuthView("verify"); }
        else { showToast(d.message || "Error"); }
    } catch (e) { showToast("Error"); }
});

document.getElementById("verifyForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = { email: document.getElementById("verifyEmail").value, otp: document.getElementById("verifyOtp").value };
    try {
        const r = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
        if (r.ok) { showToast("Verified! Please Login."); switchAuthView("login"); }
        else { showToast("Invalid code."); }
    } catch (e) { showToast("Error"); }
});

document.getElementById("itemForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        title: document.getElementById("title").value,
        type: document.getElementById("type").value,
        description: document.getElementById("description").value,
        location: document.getElementById("location").value,
        contactInfo: document.getElementById("contactInfo").value,
        imageUrl: document.getElementById("imageUrl").value
    };
    try {
        const r = await fetch(`${API_BASE_URL}/api/items`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }, body: JSON.stringify(payload) });
        if (r.ok) { closeModal(postModal); e.target.reset(); showToast("Reported!"); loadItems(); }
        else { showToast("Failed to post."); }
    } catch (e) { showToast("Error."); }
});

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    authToken = ""; localStorage.clear(); updateAuthUi(); loadItems(); showToast("Logged out.");
});

document.getElementById("openProfileBtn")?.addEventListener("click", () => {
    document.getElementById("profileName").textContent = studentName;
    document.getElementById("profileEmailDisplay").textContent = studentEmail;
    document.getElementById("profileEditName").value = studentName;
    document.getElementById("profileInitial").textContent = studentName.charAt(0).toUpperCase();
    openModal(profileModal);
});

// FAQ Accordion
document.querySelectorAll(".faq-header").forEach(header => {
    header.addEventListener("click", () => {
        const item = header.parentElement;
        item.classList.toggle("active");
    });
});

// Init
document.body.setAttribute("data-theme", currentTheme);
updateAuthUi();
loadItems();
refreshIcons();
window.closeModal = closeModal;
window.switchAuthView = switchAuthView;
