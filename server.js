const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// ==================== CONFIGURATION ====================
const EDU_API_URL = "http://edu-api.havirkesht.ir";
const EDU_USERNAME = "edu_40111415039";
const EDU_PASSWORD = "40111415039";

let authToken = null;

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: [
        "http://127.0.0.1:5500",  // این خط را اضافه کنید
        "http://localhost:5500",
        "https://frontend.havirkesht.ir",
        "https://havir-sara.liara.run",
        "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تنظیم برای جلوگیری از استفاده از proxy
process.env.HTTP_PROXY = "";
process.env.HTTPS_PROXY = "";
process.env.NO_PROXY = "*";

// ==================== STATIC FILES ====================
app.use(express.static('public'));
app.use('/src', express.static('src'));

// ==================== HELPER FUNCTIONS ====================
async function testEduConnection() {
    try {
        console.log("🔍 تست اتصال به سرور استاد...");
        
        // تست 1: اتصال پایه
        let connectionTest;
        try {
            const response = await axios.get(EDU_API_URL, {
                timeout: 5000,
                proxy: false
            });
            connectionTest = {
                status: response.status,
                success: response.status < 500,
                message: "سرور پاسخ داد"
            };
        } catch (error) {
            connectionTest = {
                status: 0,
                success: false,
                message: `سرور در دسترس نیست: ${error.message}`
            };
        }
        
        // تست 2: احراز هویت
        let authTest = { success: false, message: "آزمایش نشد" };
        try {
            const formData = new URLSearchParams();
            formData.append('username', EDU_USERNAME);
            formData.append('password', EDU_PASSWORD);
            
            const authResponse = await axios.post(
                `${EDU_API_URL}/token`,
                formData.toString(),
                {
                    timeout: 5000,
                    proxy: false,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            if (authResponse.status === 200) {
                authToken = authResponse.data.access_token;
                authTest = {
                    success: true,
                    message: "احراز هویت موفق",
                    token_received: !!authToken
                };
            } else {
                authTest = {
                    success: false,
                    message: `خطای احراز: ${authResponse.status}`,
                    details: authResponse.data
                };
            }
        } catch (authError) {
            authTest = {
                success: false,
                message: `خطا در احراز: ${authError.message}`
            };
        }
        
        // تست 3: API endpoint (اگر توکن گرفتیم)
        let apiTest = { success: false, message: "توکن دریافت نشد" };
        if (authToken) {
            try {
                const headers = { Authorization: `Bearer ${authToken}` };
                const apiResponse = await axios.get(
                    `${EDU_API_URL}/users/`,
                    {
                        headers,
                        timeout: 5000,
                        proxy: false
                    }
                );
                apiTest = {
                    success: apiResponse.status === 200,
                    status: apiResponse.status,
                    message: "API کاربران کار می‌کند"
                };
            } catch (apiError) {
                apiTest = {
                    success: false,
                    message: `خطای API: ${apiError.message}`
                };
            }
        }
        
        return {
            server: EDU_API_URL,
            connection: connectionTest,
            authentication: authTest,
            api_test: apiTest,
            proxy_status: "غیرفعال",
            overall_success: connectionTest.success && authTest.success
        };
    } catch (error) {
        return {
            server: EDU_API_URL,
            error: error.message,
            proxy_status: "غیرفعال",
            overall_success: false
        };
    }
}

async function makeEduRequest(method, path, token, data = null, params = null) {
    if (!token) {
        throw { status: 401, message: "توکن احراز هویت موجود نیست" };
    }
    
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    const fullUrl = `${EDU_API_URL}${path}`;
    
    try {
        const config = {
            method: method.toLowerCase(),
            url: fullUrl,
            headers: headers,
            timeout: 30000,
            proxy: false,
            params: params
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            config.data = data;
        }
        
        const response = await axios(config);
        
        if (response.status >= 400) {
            throw {
                status: response.status,
                message: `خطا از سرور استاد: ${JSON.stringify(response.data)}`
            };
        }
        
        return response.data;
    } catch (error) {
        if (error.response) {
            throw {
                status: error.response.status,
                message: `خطا از سرور استاد: ${JSON.stringify(error.response.data)}`
            };
        }
        throw {
            status: 503,
            message: `خطا در ارتباط با سرور استاد: ${error.message}`
        };
    }
}

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: "توکن احراز هویت ارائه نشده",
            message: "لطفا وارد شوید"
        });
    }
    
    const token = authHeader.split(' ')[1];
    req.token = token;
    next();
}

// ==================== ROUTES ====================

// صفحه اصلی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// سلامت
app.get('/api/health', (req, res) => {
    res.json({
        status: "healthy",
        service: "Havirkesht Dashboard",
        local_server: `http://localhost:${PORT}`,
        proxy: "disabled"
    });
});

// تست اتصال
app.get('/api/test-edu-connection', async (req, res) => {
    try {
        const result = await testEduConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== AUTH ENDPOINTS ====================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                error: "نام کاربری و رمز عبور الزامی است"
            });
        }
        
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await axios.post(
            `${EDU_API_URL}/token`,
            formData.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000,
                proxy: false
            }
        );
        
        if (response.status !== 200) {
            return res.status(response.status).json({
                error: "خطا در ورود",
                details: response.data
            });
        }
        
        const data = response.data;
        
        if (!data.access_token) {
            return res.status(401).json({
                error: "توکن در پاسخ سرور استاد وجود ندارد"
            });
        }
        
        res.json({
            access_token: data.access_token,
            token_type: "bearer",
            message: "ورود موفقیت‌آمیز بود"
        });
    } catch (error) {
        console.error("Login error:", error);
        if (error.response) {
            res.status(error.response.status).json({
                error: "خطا در ورود",
                details: error.response.data
            });
        } else {
            res.status(503).json({
                error: "خطا در ارتباط با سرور استاد",
                details: error.message
            });
        }
    }
});

app.get('/api/check-auth', verifyToken, (req, res) => {
    res.json({
        authenticated: true,
        message: "کاربر احراز هویت شده"
    });
});

// ==================== CROP YEAR ENDPOINTS ====================
app.get('/api/crop-year/', verifyToken, async (req, res) => {
    try {
        const data = await makeEduRequest(
            'GET',
            '/crop-year/',
            req.token
        );
        
        // اضافه کردن ID برای فرانت‌اند
        if (data && data.items) {
            data.items = data.items.map(item => ({
                ...item,
                id: item.crop_year_id || item.id
            }));
        }
        
        res.json(data);
    } catch (error) {
        res.status(error.status || 500).json({
            error: "خطا در دریافت داده‌ها",
            details: error.message
        });
    }
});

app.post('/api/crop-year/', verifyToken, async (req, res) => {
    try {
        const { crop_year_name } = req.body;
        
        if (!crop_year_name) {
            return res.status(400).json({
                error: "نام سال زراعی الزامی است"
            });
        }
        
        console.log(`🔍 ایجاد سال زراعی جدید: ${crop_year_name}`);
        
        const data = await makeEduRequest(
            'POST',
            '/crop-year/',
            req.token,
            { crop_year_name }
        );
        
        res.json(data);
    } catch (error) {
        console.error(`💥 خطا در ایجاد سال زراعی:`, error);
        res.status(error.status || 500).json({
            error: "خطا در ایجاد سال زراعی",
            details: error.message
        });
    }
});

app.delete('/api/crop-year/:crop_year_id', verifyToken, async (req, res) => {
    try {
        const { crop_year_id } = req.params;
        
        console.log(`🗑️ حذف سال زراعی با ID: ${crop_year_id}`);
        
        const data = await makeEduRequest(
            'DELETE',
            `/crop-year/${encodeURIComponent(crop_year_id)}`,
            req.token
        );
        
        res.json(data);
    } catch (error) {
        console.error(`💥 خطا در حذف سال زراعی:`, error);
        res.status(error.status || 500).json({
            error: "خطا در حذف سال زراعی",
            details: error.message
        });
    }
});

// ==================== PROVINCE ENDPOINTS ====================
app.get('/api/province/', verifyToken, async (req, res) => {
    try {
        const data = await makeEduRequest(
            'GET',
            '/province/',
            req.token
        );
        
        // اضافه کردن ID برای فرانت‌اند
        if (data && data.items) {
            data.items = data.items.map(item => ({
                ...item,
                id: item.province_id || item.id
            }));
        }
        
        res.json(data);
    } catch (error) {
        res.status(error.status || 500).json({
            error: "خطا در دریافت استان‌ها",
            details: error.message
        });
    }
});

app.post('/api/province/', verifyToken, async (req, res) => {
    try {
        const { province } = req.body;
        
        if (!province) {
            return res.status(400).json({
                error: "نام استان الزامی است"
            });
        }
        
        console.log(`🔍 ایجاد استان جدید: ${province}`);
        
        const data = await makeEduRequest(
            'POST',
            '/province/',
            req.token,
            { province }
        );
        
        res.json(data);
    } catch (error) {
        console.error(`💥 خطا در ایجاد استان:`, error);
        res.status(error.status || 500).json({
            error: "خطا در ایجاد استان",
            details: error.message
        });
    }
});

app.delete('/api/province/:province_name', verifyToken, async (req, res) => {
    try {
        const { province_name } = req.params;
        
        console.log(`🗑️ حذف استان: ${province_name}`);
        
        const data = await makeEduRequest(
            'DELETE',
            `/province/${encodeURIComponent(province_name)}`,
            req.token
        );
        
        res.json(data);
    } catch (error) {
        console.error(`💥 خطا در حذف استان:`, error);
        res.status(error.status || 500).json({
            error: "خطا در حذف استان",
            details: error.message
        });
    }
});

// ==================== USERS ENDPOINT ====================
app.get('/api/users', verifyToken, async (req, res) => {
    try {
        const { page = 1, size = 50 } = req.query;
        
        const data = await makeEduRequest(
            'GET',
            '/users/',
            req.token,
            null,
            { page, size }
        );
        
        res.json(data);
    } catch (error) {
        res.status(error.status || 500).json({
            error: "خطا در دریافت کاربران",
            details: error.message
        });
    }
});

// ==================== SECTION PAGES ====================
app.get('/section/:section_name', (req, res) => {
    const { section_name } = req.params;
    res.sendFile(path.join(__dirname, 'src', `${section_name}.html`));
});

// ==================== ERROR HANDLING ====================
app.use((req, res) => {
    res.status(404).json({
        error: "مسیر یافت نشد",
        path: req.path
    });
});

app.use((error, req, res, next) => {
    console.error("Server error:", error);
    res.status(500).json({
        error: "خطای داخلی سرور",
        details: error.message
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log("=".repeat(60));
    console.log("🚀 HAVIRKESHT DASHBOARD - نسخه Node.js");
    console.log("=".repeat(60));
    console.log(`📡 سرور استاد: ${EDU_API_URL}`);
    console.log(`👤 کاربر: ${EDU_USERNAME}`);
    console.log(`🌐 سرور محلی: http://localhost:${PORT}`);
    console.log(`🔗 تست اتصال: http://localhost:${PORT}/api/test-edu-connection`);
    console.log(`👥 کاربران: http://localhost:${PORT}/api/users`);
    console.log("=".repeat(60));
    console.log("🌐 آدرس‌های دسترسی:");
    console.log(`   ✅ http://localhost:${PORT}`);
    console.log(`   ✅ http://127.0.0.1:${PORT}`);
    console.log("=".repeat(60));
    console.log("⚠️  توجه: VPN/Proxy باید غیرفعال باشد");
    console.log("=".repeat(60));
});