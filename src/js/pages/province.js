// فایل: /static/js/pages/province.js

// ==================== GLOBAL CHECK ====================
// چک کنید قبلاً تعریف نشده باشد
if (typeof window.__PROVINCE_LOADED === 'undefined') {
    window.__PROVINCE_LOADED = true;
    
    const API_BASE = "http://127.0.0.1:8000";
    const TOKEN_KEY = "access_token";

    async function authFetch(path, options = {}) {
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            console.warn("No access token in localStorage");
            // استفاده از SweetAlert برای خطای عدم وجود توکن
            await Swal.fire({
                icon: 'warning',
                title: 'خطای احراز هویت',
                text: 'توکن دسترسی یافت نشد. لطفاً مجدداً وارد شوید.',
                confirmButtonText: 'باشه'
            });
            throw new Error("No token");
        }

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            // خطای 401 با SweetAlert
            await Swal.fire({
                icon: 'error',
                title: 'دسترسی غیرمجاز',
                text: 'جلسه شما منقضی شده است. لطفاً مجدداً وارد شوید.',
                confirmButtonText: 'ورود مجدد'
            });
            throw new Error("Unauthorized");
        }

        return res;
    }

    /* ===================== PAGE SETUP ===================== */

    function setupProvincePage() {
        console.log("🏙️ صفحه استان راه‌اندازی شد");

        const container = document.getElementById("page-container");
        if (!container) return;

        const page = container.querySelector("#province-page");
        if (!page) return;

        if (page.dataset.initialized) return;
        page.dataset.initialized = "true";

        const selectEl = page.querySelector("#provinceSelect");
        const addBtn = page.querySelector("#addProvinceBtn");
        const tbody = page.querySelector("#provinceTbody");
        const countEl = page.querySelector("#provinceCount");

        if (!selectEl || !addBtn || !tbody || !countEl) return;

        /* ===================== API FUNCTIONS ===================== */

        const apiGetAll = async () => {
            const res = await authFetch("/api/province/");
            const data = await res.json();
            return data.items || data;
        };

        const apiCreate = async (provinceName) => {
            const res = await authFetch("/api/province/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ province: provinceName }),
            });

            return res.json();
        };
        
        const apiDelete = async (provinceName) => {
            console.log(`🗑️ درخواست حذف استان: ${provinceName}`);
            const res = await authFetch(`/api/province/${encodeURIComponent(provinceName)}`, {
                method: "DELETE",
            });
            
            // بررسی خطای سرور
            if (!res.ok) {
                let errorMsg = "خطا در حذف استان";
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.detail || errorData.message || errorMsg;
                } catch {
                    errorMsg = `خطای ${res.status} از سرور`;
                }
                throw new Error(errorMsg);
            }
            
            return res.json();
        };

        /* ===================== RENDER FUNCTION ===================== */

        const render = async () => {
            try {
                const items = await apiGetAll();

                if (!items || !items.length) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="3" class="p-4 text-center text-black/40">
                                هیچ استانی ثبت نشده است
                            </td>
                        </tr>
                    `;
                    if (countEl) countEl.textContent = "۰ مورد";
                    return;
                }

                tbody.innerHTML = items.map(item => {
                    // نام استان می‌تواند در فیلدهای مختلف باشد
                    const provinceName = item.province || item.name || item.province_name;
                    return `
                    <tr>
                        <td class="px-4 py-3">${provinceName || '—'}</td>
                        <td class="px-4 py-3">${item.created_at || "—"}</td>
                        <td class="px-4 py-3">
                            <button data-province="${provinceName}" 
                                    class="delete-btn px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded">
                                حذف
                            </button>
                        </td>
                    </tr>
                    `;
                }).join("");

                if (countEl) countEl.textContent = `تعداد: ${items.length}`;

                // اضافه کردن event listener برای دکمه‌های حذف
                tbody.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const provinceName = e.target.dataset.province;
                        console.log(`🎯 کلیک روی حذف استان: ${provinceName}`);
                        
                        // استفاده از SweetAlert برای تأیید حذف
                        const result = await Swal.fire({
                            title: 'آیا مطمئن هستید؟',
                            text: `آیا از حذف استان "${provinceName}" مطمئن هستید؟`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'بله، حذف کن',
                            cancelButtonText: 'لغو',
                            confirmButtonColor: '#d33',
                            cancelButtonColor: '#3085d6',
                            reverseButtons: true
                        });

                        if (!result.isConfirmed) return;
                        
                        try {
                            const deleteResult = await apiDelete(provinceName);
                            console.log(`✅ حذف موفق:`, deleteResult);
                            
                            // پیام موفقیت - فقط اگر خطایی نبود
                            await Swal.fire({
                                title: 'حذف شد!',
                                text: `استان "${provinceName}" با موفقیت حذف شد.`,
                                icon: 'success',
                                confirmButtonText: 'باشه',
                                timer: 2000,
                                timerProgressBar: true
                            });
                            
                            await render(); // رندر مجدد بعد از حذف
                        } catch (error) {
                            console.error(`❌ خطا در حذف استان ${provinceName}:`, error);
                            
                            // بررسی خطای خاص 500
                            if (error.message.includes("خطای 500") || error.message.includes("خطا در حذف استان")) {
                                await Swal.fire({
                                    title: 'خطا در حذف',
                                    html: `استان "<b>${provinceName}</b>" قابل حذف نیست.<br><br>
                                    <small style="color: #666;">علت: این استان احتمالاً در حال استفاده است یا مشکلی در سرور وجود دارد.</small>`,
                                    icon: 'error',
                                    confirmButtonText: 'متوجه شدم',
                                    confirmButtonColor: '#d33',
                                    width: '450px'
                                });
                            } else if (error.message.includes("404")) {
                                await Swal.fire({
                                    title: 'یافت نشد',
                                    text: `استان "${provinceName}" پیدا نشد.`,
                                    icon: 'warning',
                                    confirmButtonText: 'باشه'
                                });
                            } else if (error.message.includes("409")) {
                                await Swal.fire({
                                    title: 'در حال استفاده',
                                    text: `استان "${provinceName}" در حال استفاده است و نمی‌توان آن را حذف کرد.`,
                                    icon: 'warning',
                                    confirmButtonText: 'متوجه شدم'
                                });
                            } else {
                                // خطای عمومی
                                await Swal.fire({
                                    title: 'خطا',
                                    text: `خطا در حذف استان "${provinceName}": ${error.message}`,
                                    icon: 'error',
                                    confirmButtonText: 'باشه'
                                });
                            }
                        }
                    });
                });

            } catch (e) {
                console.error(e);
                
                // خطای کلی با SweetAlert
                await Swal.fire({
                    title: 'خطا در بارگذاری',
                    text: 'در بارگذاری اطلاعات استان‌ها خطایی رخ داده است.',
                    icon: 'error',
                    confirmButtonText: 'تلاش مجدد',
                    showCancelButton: true,
                    cancelButtonText: 'بستن',
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    preConfirm: () => {
                        return render(); // تلاش مجدد برای رندر
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        // رندر مجدد انجام می‌شود
                    }
                });
                
                // نمایش خطا در جدول
                tbody.innerHTML = `
                    <tr>
                        <td colspan="3" class="p-4 text-red-600 text-center">
                            خطا در بارگذاری اطلاعات: ${e.message}
                        </td>
                    </tr>
                `;
            }
        };

        /* ===================== EVENTS ===================== */

        addBtn.addEventListener("click", async () => {
            const provinceName = selectEl.value;
            
            if (!provinceName) {
                // خطای انتخاب استان
                await Swal.fire({
                    icon: 'warning',
                    title: 'انتخاب استان',
                    text: 'لطفاً نام استان را انتخاب کنید.',
                    confirmButtonText: 'باشه',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            try {
                // بررسی تکراری نبودن استان
                const existingProvinces = await apiGetAll();
                const provinceExists = existingProvinces.some(item => {
                    const existingName = item.province || item.name || item.province_name;
                    return existingName === provinceName;
                });
                
                if (provinceExists) {
                    await Swal.fire({
                        icon: 'warning',
                        title: 'استان تکراری',
                        text: `استان "${provinceName}" قبلاً ثبت شده است.`,
                        confirmButtonText: 'متوجه شدم',
                        confirmButtonColor: '#f39c12'
                    });
                    return;
                }
                
                // نمایش بارگیری
                Swal.fire({
                    title: 'در حال ایجاد استان...',
                    text: 'لطفاً منتظر بمانید',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
                
                await apiCreate(provinceName);
                
                // بستن loading و نمایش موفقیت
                Swal.close();
                await Swal.fire({
                    title: 'موفقیت!',
                    text: `استان "${provinceName}" با موفقیت ایجاد شد.`,
                    icon: 'success',
                    confirmButtonText: 'عالی!',
                    confirmButtonColor: '#28a745',
                    timer: 1500,
                    timerProgressBar: true
                });
                
                await render();
                
            } catch (e) {
                // بستن loading در صورت خطا
                Swal.close();
                
                let errorMessage = 'خطا در ایجاد استان: ' + e.message;
                let errorTitle = 'خطا!';
                
                // تشخیص نوع خطا
                if (e.message.includes("409")) {
                    errorTitle = 'تکراری';
                    errorMessage = `استان "${provinceName}" قبلاً ثبت شده است.`;
                } else if (e.message.includes("Network Error")) {
                    errorTitle = 'خطای شبکه';
                    errorMessage = 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.';
                } else if (e.message.includes("Failed to fetch")) {
                    errorTitle = 'خطای سرور';
                    errorMessage = 'سرور پاسخ نمی‌دهد. لطفاً دوباره تلاش کنید.';
                }
                
                await Swal.fire({
                    title: errorTitle,
                    text: errorMessage,
                    icon: 'error',
                    confirmButtonText: 'متوجه شدم',
                    confirmButtonColor: '#d33'
                });
            }
        });

        // رندر اولیه
        render();
        
        // اضافه کردن event برای تلاش مجدد در صورت خطا
        const retryButton = page.querySelector("#retryBtn");
        if (retryButton) {
            retryButton.addEventListener("click", render);
        }
    }

    window.setupProvincePage = setupProvincePage;
    console.log("✅ province.js با موفقیت لود شد");
} else {
    console.log("ℹ️ province.js قبلاً لود شده است");
}
