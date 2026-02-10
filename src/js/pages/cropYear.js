function setupCropYearPage() {
    console.log("📅 صفحه سال زراعی راه‌اندازی شد");

    const container = document.getElementById("page-container");
    if (!container) return;

    const page = container.querySelector("#crop-year-page");
    if (!page) return;

    if (page.dataset.initialized) return;
    page.dataset.initialized = "true";

    const selectEl = page.querySelector("#cropYearSelect");
    const addBtn = page.querySelector("#addCropYearBtn");
    const tbody = page.querySelector("#cropYearTbody");
    const countEl = page.querySelector("#cropYearCount");

    if (!selectEl || !addBtn || !tbody || !countEl) return;

    /* ===================== POPULATE YEARS IN SELECT ===================== */
    const populateYearSelect = () => {
        selectEl.innerHTML = '';
        
        const currentShamsiYear = 1403;
        
        // فقط سال‌های قبل از 1403 و بعد از 1404
        for (let i = -5; i <= 5; i++) {
            const year = currentShamsiYear + i;
            
            // رد کردن سال‌های 1403 و 1404
            if (year === 1403 || year === 1404) continue;
            
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectEl.appendChild(option);
        }
        
        // انتخاب اولین گزینه به عنوان پیش‌فرض
        if (selectEl.options.length > 0) {
            selectEl.value = selectEl.options[0].value;
        }
    };

    // فراخوانی تابع برای پر کردن select
    populateYearSelect();

    /* ===================== API FUNCTIONS ===================== */

    const apiGetAll = async () => {
        const res = await authFetch("/api/crop-year/");
        const data = await res.json();
        return data.items || data;
    };

    const apiCreate = async (year) => {
        const res = await authFetch("/api/crop-year/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ crop_year_name: year }),
        });

        return res.json();
    };
    
    const apiDelete = async (yearName) => {
        console.log(`🗑️ درخواست حذف سال: ${yearName}`);
        const res = await authFetch(`/api/crop-year/${encodeURIComponent(yearName)}`, {
            method: "DELETE",
        });
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
                            هیچ سال زراعی ثبت نشده است
                        </td>
                    </tr>
                `;
                if (countEl) countEl.textContent = "۰ مورد";
                return;
            }

            // فیلتر کردن: نمایش همه سال‌ها اما غیرفعال کردن دکمه حذف برای 1403 و 1404
            tbody.innerHTML = items.map(item => {
                const yearName = item.crop_year_name;
                const isProtected = yearName === "1403" || yearName === "1404";
                
                return `
                <tr>
                    <td class="px-4 py-3">${yearName || '—'}</td>
                    <td class="px-4 py-3">${item.created_at || "—"}</td>
                    <td class="px-4 py-3">
                        ${isProtected ? 
                            `<span class="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded cursor-not-allowed">غیرقابل حذف</span>` :
                            `<button data-year="${yearName}" 
                                    class="delete-btn px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded">
                                حذف
                            </button>`
                        }
                    </td>
                </tr>
                `;
            }).join("");

            if (countEl) countEl.textContent = `تعداد: ${items.length}`;

            // اضافه کردن event listener برای دکمه‌های حذف
            tbody.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const yearName = e.target.dataset.year;
                    console.log(`🎯 کلیک روی حذف سال: ${yearName}`);
                    
                    // استفاده از SweetAlert2 برای تأیید حذف
                    const result = await Swal.fire({
                        title: 'آیا مطمئن هستید؟',
                        text: `آیا از حذف سال زراعی "${yearName}" مطمئن هستید؟`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'بله، حذف کن',
                        cancelButtonText: 'لغو',
                        customClass: {
                            confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded',
                            cancelButton: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded mr-2'
                        },
                        buttonsStyling: false,
                        reverseButtons: true
                    });

                    if (result.isConfirmed) {
                        try {
                            const deleteResult = await apiDelete(yearName);
                            console.log(`✅ حذف موفق:`, deleteResult);
                            
                            // پیام موفقیت SweetAlert2
                            await Swal.fire({
                                title: 'حذف شد!',
                                text: `سال زراعی "${yearName}" با موفقیت حذف شد.`,
                                icon: 'success',
                                confirmButtonText: 'باشه',
                                customClass: {
                                    confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded'
                                },
                                buttonsStyling: false
                            });
                            
                            await render(); // رندر مجدد بعد از حذف
                        } catch (error) {
                            console.error(`❌ خطا در حذف سال ${yearName}:`, error);
                            
                            let errorMessage = '';
                            if (error.message.includes("404")) {
                                errorMessage = `سال "${yearName}" پیدا نشد یا امکان حذف آن وجود ندارد.`;
                            } else if (error.message.includes("409")) {
                                errorMessage = `سال "${yearName}" در حال استفاده است و نمی‌توان آن را حذف کرد.`;
                            } else {
                                errorMessage = `خطا در حذف سال "${yearName}": ${error.message}`;
                            }
                            
                            // نمایش خطا با SweetAlert2
                            await Swal.fire({
                                title: 'خطا!',
                                text: errorMessage,
                                icon: 'error',
                                confirmButtonText: 'متوجه شدم',
                                customClass: {
                                    confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded'
                                },
                                buttonsStyling: false
                            });
                        }
                    }
                });
            });

        } catch (e) {
            console.error(e);
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="p-4 text-red-600 text-center">
                        ${e.message}
                    </td>
                </tr>
            `;
        }
    };

    /* ===================== EVENTS ===================== */

    addBtn.addEventListener("click", async () => {
        const year = selectEl.value;
        
        // بررسی اینکه سال 1403 یا 1404 نباشد
        if (year === "1403" || year === "1404") {
            await Swal.fire({
                title: 'غیرمجاز!',
                text: `امکان اضافه کردن سال ${year} وجود ندارد.`,
                icon: 'error',
                confirmButtonText: 'متوجه شدم',
                customClass: {
                    confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded'
                },
                buttonsStyling: false
            });
            return;
        }
        
        if (!year) {
            await Swal.fire({
                title: 'توجه!',
                text: 'لطفاً سال را انتخاب کنید',
                icon: 'warning',
                confirmButtonText: 'باشه',
                customClass: {
                    confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded'
                },
                buttonsStyling: false
            });
            return;
        }

        try {
            // بررسی تکراری نبودن سال
            const existingYears = await apiGetAll();
            const yearExists = existingYears.some(item => item.crop_year_name === year);
            
            if (yearExists) {
                await Swal.fire({
                    title: 'سال تکراری!',
                    text: `سال زراعی ${year} قبلاً ثبت شده است.`,
                    icon: 'warning',
                    confirmButtonText: 'باشه',
                    customClass: {
                        confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded'
                    },
                    buttonsStyling: false
                });
                return;
            }
            
            await apiCreate(year);
            
            // پیام موفقیت
            await Swal.fire({
                title: 'موفق!',
                text: `سال زراعی ${year} با موفقیت ایجاد شد.`,
                icon: 'success',
                confirmButtonText: 'باشه',
                customClass: {
                    confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded'
                },
                buttonsStyling: false
            });
            
            await render();
            
            // ریست کردن select به اولین گزینه
            if (selectEl.options.length > 0) {
                selectEl.value = selectEl.options[0].value;
            }
            
        } catch (e) {
            await Swal.fire({
                title: 'خطا!',
                text: 'خطا در ایجاد سال زراعی: ' + e.message,
                icon: 'error',
                confirmButtonText: 'متوجه شدم',
                customClass: {
                    confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded'
                },
                buttonsStyling: false
            });
        }
    });

    // رندر اولیه
    render();
}

window.setupCropYearPage = setupCropYearPage;