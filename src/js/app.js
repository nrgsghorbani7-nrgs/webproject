console.log("🔥 app.js started");

// ==================== IMMEDIATE GLOBAL DEFINITIONS ====================
// تعریف توابع global بلافاصله
(function() {
    const TOKEN_KEY = "access_token";
    const API_BASE = "http://127.0.0.1:8000";
    
    // ذخیره‌سازی برای استفاده داخلی
    window._TOKEN_KEY = TOKEN_KEY;
    window._API_BASE = API_BASE;
    
    window.login = async function(username, password) {
        try {
            console.log(`🔐 درخواست لاگین برای کاربر: ${username}`);
            const response = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "نام کاربری یا رمز عبور نادرست");
            }
            
            const data = await response.json();
            
            if (data.access_token) {
                localStorage.setItem(TOKEN_KEY, data.access_token);
                console.log("✅ توکن با موفقیت ذخیره شد");
                return { success: true, message: "ورود موفقیت‌آمیز بود" };
            } else {
                throw new Error("توکن در پاسخ دریافت نشد");
            }
            
        } catch (error) {
            console.error("❌ خطا در لاگین:", error);
            return { 
                success: false, 
                message: error.message || "خطا در ارتباط با سرور" 
            };
        }
    };
    
    window.authFetch = async function(path, options = {}) {
        const token = localStorage.getItem(TOKEN_KEY);
    
        if (!token) {
            console.warn("❌ No access token in localStorage");
            window.location.hash = '#/login';
            throw new Error("No token");
        }
    
        console.log(`📤 درخواست API به: ${path}`);
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        });
    
        if (res.status === 401) {
            console.warn("🔒 توکن منقضی شده");
            localStorage.removeItem(TOKEN_KEY);
            window.location.hash = '#/login';
            throw new Error("Unauthorized");
        }
    
        return res;
    };
    
    window.logout = function() {
        console.log("🚪 در حال خروج از سیستم...");
        localStorage.removeItem(TOKEN_KEY);
        window.location.hash = '#/login';
        if (window.app) {
            window.app.loadPage('login');
        }
    };
    
    console.log("✅ توابع global تعریف شدند");
})();

// ==================== ROUTER ====================
class SPARouter {
    constructor() {
        this.container = document.querySelector("#page-container > .max-w-6xl");

        this.pages = {
            login: "/src/pages/login.html",
            dashboard: "/src/pages/dashboard/content.html",
            "F_data/crop-year": "/src/pages/F_data/crop-year/content.html",
            "F_data/province": "/src/pages/F_data/province/content.html",
            "F_data/city": "/src/pages/F_data/city/content.html",
            "F_data/farmer": "/src/pages/F_data/farmer/content.html",
        };

        this.currentPage = null;

        if (!this.container) {
            console.error("❌ container پیدا نشد");
            return;
        }
    }

    async loadPage(pageName, { push = true } = {}) {
        console.log(`📁 درخواست بارگیری صفحه: ${pageName}`);
        
        // بررسی احراز هویت
        const token = localStorage.getItem(window._TOKEN_KEY || 'access_token');
        
        // اگر لاگین نیستیم و صفحه لاگین نیست، به لاگین برو
        if (!token && pageName !== "login") {
            console.log("🔒 کاربر لاگین نکرده، ریدایرکت به لاگین");
            window.location.hash = '#/login';
            return this.loadPage('login');
        }
        
        // اگر لاگین کرده‌ایم و صفحه لاگین است، به داشبورد برو
        if (token && pageName === "login") {
            console.log("✅ کاربر قبلاً لاگین کرده، ریدایرکت به داشبورد");
            window.location.hash = '#/dashboard';
            return this.loadPage('dashboard');
        }

        if (this.currentPage === pageName) return;

        const url = this.pages[pageName];
        if (!url) {
            this.showError(`صفحه "${pageName}" وجود ندارد`);
            return;
        }

        this.container.innerHTML = `
            <div class="p-10 text-center text-sky-600">
                ⏳ در حال بارگیری...
            </div>
        `;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.statusText);

            const html = await res.text();
            this.container.innerHTML = html;

            this.currentPage = pageName;

            if (push) {
                history.pushState({}, "", `#/${pageName}`);
            }

            this.initPage(pageName);
            this.updateHeader();
            
            console.log(`✅ صفحه "${pageName}" با موفقیت بارگیری شد`);
            
        } catch (err) {
            console.error(`❌ خطا در بارگیری صفحه:`, err);
            this.showError(`خطا در بارگیری صفحه: ${err.message}`);
        }
    }

    initPage(pageName) {
        console.log(`🚀 راه‌اندازی صفحه: ${pageName}`);
        
        // تأخیر برای اطمینان از لود شدن DOM
        setTimeout(() => {
            switch (pageName) {
                case "login":
                    if (window.setupLoginPage) {
                        console.log("✅ فراخوانی setupLoginPage");
                        window.setupLoginPage();
                    } else {
                        console.error("❌ setupLoginPage تعریف نشده!");
                        this.setupSimpleLogin();
                    }
                    break;
                case "F_data/crop-year":
                    if (window.setupCropYearPage) {
                        console.log("✅ فراخوانی setupCropYearPage");
                        window.setupCropYearPage();
                    }
                    break;
                case "F_data/province":
                    if (window.setupProvincePage) {  // این خط رو اضافه کنید
                        console.log("✅ فراخوانی setupProvincePage");
                        window.setupProvincePage();
                    } else {
                        console.error("❌ setupProvincePage تعریف نشده");
                }
                break;
                case "F_data/farmer":
                    if (window.setupFarmerPage) {  // این خط رو اضافه کنید
                        console.log("✅ فراخوانی setupFarmerPage");
                        window.setupFarmerPage();
                    } else {
                        console.error("❌ setupFarmerPage تعریف نشده");
                }
                break;
                case "F_data/city":
                    window.setupCityPage?.();
                    break;
            }
        }, 100);
    }

    // لاگین ساده اگر setupLoginPage نداریم
    setupSimpleLogin() {
        console.log("🛠️ ایجاد فرم لاگین ساده...");
        const container = this.container;
        if (!container) return;
        
        const form = container.querySelector("#loginForm");
        if (!form) {
            console.error("❌ فرم لاگین پیدا نشد");
            return;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = form.querySelector("#username")?.value;
            const password = form.querySelector("#password")?.value;
            
            if (!username || !password) {
                alert('لطفاً نام کاربری و رمز عبور را وارد کنید');
                return;
            }
            
            try {
                const result = await window.login(username, password);
                
                if (result.success) {
                    alert(result.message);
                    this.loadPage('dashboard');
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('خطا: ' + error.message);
            }
        });
        
        // پیش‌پر کردن فیلدها
        const usernameInput = form.querySelector("#username");
        const passwordInput = form.querySelector("#password");
        
        if (usernameInput && !usernameInput.value) {
            usernameInput.value = 'edu_40111415016';
        }
        if (passwordInput && !passwordInput.value) {
            passwordInput.value = '40111415016';
        }
    }

    updateHeader() {
        const section = this.container.querySelector("[data-title]");
        if (!section) return;

        const titleEl = document.getElementById("page-title");
        const breadcrumbEl = document.getElementById("breadcrumb");

        if (titleEl) titleEl.textContent = section.dataset.title || "";
        if (breadcrumbEl && section.dataset.breadcrumb) {
            breadcrumbEl.innerHTML = section.dataset.breadcrumb
                .split("/")
                .map(i => `<span>${i.trim()}</span>`)
                .join("<span>/</span>");
        }
    }

    showError(msg) {
        this.container.innerHTML = `
            <div class="p-6 bg-red-50 text-red-700 rounded">
                <h3 class="font-bold mb-2">خطا</h3>
                <p>${msg}</p>
            </div>
        `;
    }
}

// ==================== EVENT MANAGER ====================
class EventManager {
    constructor(app) {
        this.app = app;
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener("click", (e) => {
            /* MENU ACTIONS */
            const actionEl = e.target.closest("[data-action]");
            if (actionEl) {
                const action = actionEl.dataset.action;
                if (action === "toggle-menu") this.toggleMenu();
                if (action === "open-user") this.openUser();
                if (action === "close-user") this.closeUser();
                return;
            }

            /* PAGE LINKS */
            const pageLink = e.target.closest("[data-page]");
            if (pageLink) {
                e.preventDefault();
                const page = pageLink.dataset.page;
                
                // بررسی احراز هویت
                const token = localStorage.getItem(window._TOKEN_KEY || 'access_token');
                if (!token && page !== "login") {
                    console.log("🔒 نیاز به احراز هویت");
                    window.location.hash = '#/login';
                    this.app.loadPage('login');
                    return;
                }
                
                this.app.loadPage(page);

                if (window.innerWidth < 768) {
                    this.toggleMenu();
                }
                return;
            }

            /* ACCORDION */
            const accTitle = e.target.closest(".accr .title");
            if (accTitle) {
                const item = accTitle.closest(".accr .item");
                if (item) this.toggleAccordion(item);
            }
        });

        window.addEventListener("popstate", () => {
            const page = location.hash.replace("#/", "") || "dashboard";
            
            // بررسی احراز هویت
            const token = localStorage.getItem(window._TOKEN_KEY || 'access_token');
            if (!token && page !== "login") {
                console.log("🔒 نیاز به احراز هویت (popstate)");
                window.location.hash = '#/login';
                this.app.loadPage('login');
                return;
            }
            
            this.app.loadPage(page, { push: false });
        });
    }

    toggleMenu() {
        const menu = document.querySelector("#menu");
        const overlay = document.querySelector("#overlay");
        if (!menu || !overlay) return;

        menu.classList.toggle("translate-x-full");
        overlay.classList.toggle("hidden");
    }

    toggleAccordion(item) {
        item.classList.toggle("active");
        const content = item.querySelector(".content");
        const icon = item.querySelector(".icon");

        if (content) {
            content.style.maxHeight = item.classList.contains("active")
                ? content.scrollHeight + "px"
                : "0px";
        }
        icon?.classList.toggle("rotate-180");
    }

    openUser() {
        document.querySelector("#user")?.classList.replace("h-0", "h-full");
    }

    closeUser() {
        document.querySelector("#user")?.classList.replace("h-full", "h-0");
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    console.log("🏁 DOM آماده است");
    
    const app = new SPARouter();
    const events = new EventManager(app);

    window.app = app;
    window.events = events;

    // بررسی اولیه احراز هویت
    const token = localStorage.getItem(window._TOKEN_KEY || 'access_token');
    const initialHash = location.hash.replace("#/", "");
    let initialPage = initialHash || "dashboard";
    
    console.log("🔍 بررسی وضعیت اولیه:");
    console.log("   توکن:", token ? "✅ دارد" : "❌ ندارد");
    console.log("   صفحه درخواستی:", initialPage);
    
    // اگر توکن نداریم و صفحه لاگین نیست، به لاگین برو
    if (!token && initialPage !== "login") {
        console.log("   🔒 ریدایرکت به لاگین...");
        location.hash = '#/login';
        initialPage = "login";
    }
    
    // اگر توکن داریم و صفحه لاگین است، به داشبورد برو
    if (token && initialPage === "login") {
        console.log("   ✅ قبلاً لاگین کرده، ریدایرکت به داشبورد...");
        location.hash = '#/dashboard';
        initialPage = "dashboard";
    }
    
    console.log("   📍 بارگیری صفحه:", initialPage);
    app.loadPage(initialPage);
});