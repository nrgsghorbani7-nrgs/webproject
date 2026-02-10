// فایل جدید: /static/js/pages/login.js
console.log("🔐 login.js loaded");

window.setupLoginPage = function() {
    console.log("📝 Setting up login page...");
    
    const container = document.getElementById("page-container");
    if (!container) {
        console.error("❌ Container not found");
        return;
    }

    const page = container.querySelector("#login-page");
    if (!page) {
        console.error("❌ Login page element not found");
        return;
    }

    if (page.dataset.initialized) return;
    page.dataset.initialized = "true";

    const form = page.querySelector("#loginForm");
    const usernameInput = page.querySelector("#username");
    const passwordInput = page.querySelector("#password");
    const loginBtn = page.querySelector("#loginBtn");
    const btnText = page.querySelector("#btnText");
    const loadingSpinner = page.querySelector("#loadingSpinner");
    const messageBox = page.querySelector("#messageBox");

    if (!form || !usernameInput || !passwordInput || !loginBtn) {
        console.error("❌ Login form elements not found");
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!username || !password) {
            showMessage('لطفاً تمام فیلدها را پر کنید', 'error');
            return;
        }
        
        // فعال کردن حالت لودینگ
        loginBtn.disabled = true;
        if (btnText) btnText.textContent = 'در حال ورود...';
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        if (messageBox) messageBox.classList.add('hidden');
        
        try {
            // استفاده از تابع login که در app.js تعریف شده
            const result = await window.login(username, password);
            
            if (result.success) {
                showMessage(result.message, 'success');
                
                // انتقال به داشبورد بعد از 1.5 ثانیه
                setTimeout(() => {
                    window.location.hash = '#/dashboard';
                    window.app?.loadPage('dashboard');
                }, 1500);
                
            } else {
                showMessage(result.message, 'error');
                loginBtn.disabled = false;
                if (btnText) btnText.textContent = 'ورود به سیستم';
                if (loadingSpinner) loadingSpinner.classList.add('hidden');
            }
            
        } catch (error) {
            console.error('خطا در ورود:', error);
            showMessage('خطای غیرمنتظره رخ داد', 'error');
            loginBtn.disabled = false;
            if (btnText) btnText.textContent = 'ورود به سیستم';
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    });
    
    function showMessage(text, type) {
        if (!messageBox) return;
        
        messageBox.textContent = text;
        messageBox.className = 'p-3 rounded-lg text-sm';
        
        if (type === 'error') {
            messageBox.classList.add('bg-red-50', 'text-red-600', 'border', 'border-red-200');
        } else if (type === 'success') {
            messageBox.classList.add('bg-green-50', 'text-green-600', 'border', 'border-green-200');
        }
        
        messageBox.classList.remove('hidden');
    }

    // پیش‌پر کردن فیلدها برای تست
    if (usernameInput && !usernameInput.value) {
        usernameInput.value = 'edu_40111415016';
    }
    if (passwordInput && !passwordInput.value) {
        passwordInput.value = '40111415016';
    }

    console.log("✅ Login page setup complete");
};

