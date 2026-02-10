// src/js/pages/city.js
export function setupCityPage() {
    const container = document.getElementById("page-container");
    if (!container) return;

    const page = container.querySelector("#city-page");
    if (!page) return;

    const provinceSelect = page.querySelector("#provinceForCitySelect");
    const citySelect = page.querySelector("#citySelect");
    const addBtn = page.querySelector("#addCityBtn");
    const tbody = page.querySelector("#cityTbody");
    const countEl = page.querySelector("#cityCount");

    if (!provinceSelect || !citySelect || !addBtn || !tbody || !countEl) return;

    const STORAGE_PROVINCES = "provinces"; // از صفحه ثبت استان
    const STORAGE_CITIES = "cities";       // شهرستان‌ها

    // دیتای نمونه: برای شروع چند استان + شهرستان (می‌تونی کاملش کنی)
    const cityMap = {
        "تهران": ["تهران", "ری", "شمیرانات", "پردیس", "اسلامشهر", "ملارد", "قدس", "دماوند", "ورامین", "پاکدشت"],
        "اصفهان": ["اصفهان", "کاشان", "نجف‌آباد", "خمینی‌شهر", "شاهین‌شهر", "فولادشهر", "گلپایگان"],
        "فارس": ["شیراز", "مرودشت", "کازرون", "جهرم", "فسا", "لارستان"],
        "خراسان رضوی": ["مشهد", "نیشابور", "سبزوار", "تربت حیدریه", "قوچان"],
        "آذربایجان شرقی": ["تبریز", "مراغه", "مرند", "میانه", "اهر"],
        "مازندران": ["ساری", "بابل", "آمل", "قائم‌شهر", "نوشهر", "چالوس"],
        "گیلان": ["رشت", "انزلی", "لاهیجان", "لنگرود", "رودسر"],
    };

    const todayFa = () =>
        new Date().toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });

    const read = (key) => {
        try {
            return JSON.parse(localStorage.getItem(key) || "[]");
        } catch {
            return [];
        }
    };

    const write = (key, items) => localStorage.setItem(key, JSON.stringify(items));

    const renderTable = () => {
        const items = read(STORAGE_CITIES);

        tbody.innerHTML = items
            .map(
                (r) => `
        <tr>
          <td class="px-4 py-3 vazirmatn-600 text-[#2B1B1B] whitespace-nowrap">${r.province}</td>
          <td class="px-4 py-3 text-black/80 whitespace-nowrap">${r.city}</td>
          <td class="px-4 py-3 text-black/70 whitespace-nowrap">${r.createdAt}</td>
          <td class="px-4 py-3">
            <button class="p-2 rounded-lg hover:bg-black/5 transition"
                    title="حذف"
                    data-city-action="delete"
                    data-id="${r.id}">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-[#7A4A4A]" viewBox="0 0 24 24" fill="none">
                <path d="M9 3h6m-8 4h10m-9 0 1 14h6l1-14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6m4-6v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </td>
        </tr>
      `
            )
            .join("");

        countEl.textContent = `تعداد: ${items.length}`;
    };

    const fillProvinces = () => {
        const provinces = read(STORAGE_PROVINCES).map((p) => p.name);

        provinceSelect.innerHTML = `<option value="">انتخاب استان...</option>`;

        if (provinces.length === 0) {
            // اگر هنوز استان ثبت نشده
            provinceSelect.innerHTML = `<option value="">ابتدا از صفحه «ثبت استان» استان‌ها را ثبت کنید</option>`;
            provinceSelect.disabled = true;
            citySelect.disabled = true;
            addBtn.disabled = true;
            return;
        }

        provinceSelect.disabled = false;
        provinces.forEach((name) => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            provinceSelect.appendChild(opt);
        });
    };

    const fillCitiesByProvince = (provinceName) => {
        const cities = cityMap[provinceName] || [];

        citySelect.innerHTML = "";
        if (!provinceName) {
            citySelect.disabled = true;
            addBtn.disabled = true;
            citySelect.innerHTML = `<option value="">اول استان را انتخاب کنید</option>`;
            return;
        }

        if (cities.length === 0) {
            citySelect.disabled = true;
            addBtn.disabled = true;
            citySelect.innerHTML = `<option value="">برای این استان لیست شهرستان تعریف نشده</option>`;
            return;
        }

        citySelect.disabled = false;
        addBtn.disabled = false;

        cities.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            citySelect.appendChild(opt);
        });
    };

    const addCity = () => {
        const province = provinceSelect.value;
        const city = citySelect.value;
        if (!province || !city) return;

        const items = read(STORAGE_CITIES);

        // جلوگیری از تکراری (استان+شهرستان)
        if (items.some((x) => x.province === province && x.city === city)) {
            alert("این شهرستان برای این استان قبلاً ثبت شده است.");
            return;
        }

        items.unshift({
            id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
            province,
            city,
            createdAt: todayFa(),
        });

        write(STORAGE_CITIES, items);
        renderTable();
    };

    const deleteCity = (id) => {
        write(STORAGE_CITIES, read(STORAGE_CITIES).filter((x) => x.id !== id));
        renderTable();
    };

    if (!page.dataset.bound) {
        provinceSelect.addEventListener("change", (e) => {
            fillCitiesByProvince(e.target.value);
        });

        addBtn.addEventListener("click", addCity);

        page.addEventListener("click", (e) => {
            const btn = e.target.closest('[data-city-action="delete"]');
            if (!btn) return;

            const id = btn.getAttribute("data-id");
            if (!id) return;

            if (confirm("این رکورد حذف شود؟")) deleteCity(id);
        });

        page.dataset.bound = "1";
    }

    // init
    fillProvinces();
    fillCitiesByProvince(provinceSelect.value);
    renderTable();
}
