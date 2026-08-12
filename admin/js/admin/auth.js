/* ============================================
   🔐 Admin Auth JS - مصادقة لوحة التحكم
   ============================================ */

(function() {
    'use strict';

    const CONFIG = {
        SESSION_KEY: 'shop_store_session',
        DEVICE_KEY: 'shop_store_device',
        API_URL: '/api/',
        MAX_ATTEMPTS: 5,
        LOCKOUT_MINUTES: 30,
        SESSION_HOURS: 8
    };

    let usersData = null;
    let currentUser = null;

    // ─── Feature Detection: هل PHP متاح؟ ───
    let phpAvailable = false;
    let phpChecked = false;

    async function detectPhp() {
        if (phpChecked) return phpAvailable;
        try {
            const response = await fetch(CONFIG.API_URL + 'session.php', { 
                method: 'HEAD',
                cache: 'no-store'
            });
            phpAvailable = response.ok;
        } catch (e) {
            phpAvailable = false;
        }
        phpChecked = true;
        return phpAvailable;
    }

    // ─── MD5 Hash ───
    function md5(string) {
        if (typeof CryptoJS !== 'undefined' && CryptoJS.MD5) {
            return CryptoJS.MD5(string).toString();
        }
        return simpleHash(string);
    }

    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    // ─── Device Fingerprint (مُبسّط وثابت) ───
    function getDeviceFingerprint() {
        const ua = navigator.userAgent;
        const lang = navigator.language;
        return btoa(ua + '|' + lang).slice(0, 32);
    }

    // ─── Load Users from PHP ───
    async function loadUsers() {
        try {
            const response = await fetch(CONFIG.API_URL + 'load_users.php', {
                cache: 'no-store'
            });
            if (response.ok) {
                usersData = await response.json();
                return;
            }
        } catch (e) {
            console.error('Error loading users:', e);
        }
        usersData = null;
    }

    // ─── Save Users via PHP ───
    async function saveUsers() {
        if (!usersData) return false;

        try {
            const response = await fetch(CONFIG.API_URL + 'save_users.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usersData)
            });
            const result = await response.json();
            return result.success;
        } catch (e) {
            console.error('Error saving users:', e);
            return false;
        }
    }

    // ─── PHP Session: Check ───
    async function checkPhpSession() {
        if (!phpAvailable) return null;
        try {
            const response = await fetch(CONFIG.API_URL + 'session.php', {
                cache: 'no-store'
            });
            if (!response.ok) return null;
            const result = await response.json();
            if (result.success) {
                currentUser = result.user;
                // Sync to localStorage for offline/backup
                localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
                    ...result.user,
                    expires_at: new Date(Date.now() + CONFIG.SESSION_HOURS * 60 * 60 * 1000).toISOString()
                }));
                return result.user;
            }
        } catch (e) {
            console.error('PHP session check failed:', e);
        }
        return null;
    }

    // ─── PHP Session: Login ───
    async function phpLogin(username, password) {
        try {
            const response = await fetch(CONFIG.API_URL + 'login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: md5(password) })
            });
            const result = await response.json();
            if (result.success) {
                currentUser = result.user;
                // Sync to localStorage
                localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
                    ...result.user,
                    expires_at: new Date(Date.now() + CONFIG.SESSION_HOURS * 60 * 60 * 1000).toISOString()
                }));
                localStorage.setItem(CONFIG.DEVICE_KEY, getDeviceFingerprint());
                return result;
            }
            return { success: false, error: result.error };
        } catch (e) {
            console.error('PHP login failed:', e);
            return { success: false, error: 'PHP login failed' };
        }
    }

    // ─── PHP Session: Logout ───
    async function phpLogout() {
        if (!phpAvailable) return;
        try {
            await fetch(CONFIG.API_URL + 'logout.php');
        } catch (e) {
            console.error('PHP logout failed:', e);
        }
    }

    // ─── Login (Hybrid: PHP primary, JSON fallback) ───
    async function login(username, password) {
        // محاولة PHP أولاً
        await detectPhp();
        if (phpAvailable) {
            const phpResult = await phpLogin(username, password);
            if (phpResult.success) {
                return { ...phpResult, source: 'php' };
            }
            // إذا فشل PHP بسبب خطأ في الاتصال (ليس بيانات خاطئة)
            if (!phpResult.error || phpResult.error === 'PHP login failed') {
                // fallback to JSON
            } else {
                return phpResult; // خطأ في البيانات
            }
        }

        // ─── Fallback: JSON-based (الطريقة القديمة) ───
        await loadUsers();

        if (!usersData) {
            return { success: false, error: 'خطأ في تحميل البيانات' };
        }

        if (isLockedOut(username)) {
            return { success: false, error: 'الحساب مقفل مؤقتاً. حاول لاحقاً' };
        }

        const hashedPassword = md5(password);

        // Check admin
        if (usersData.admin && usersData.admin.username === username) {
            if (usersData.admin.password === hashedPassword) {
                if (usersData.admin.active === false) {
                    return { success: false, error: 'الحساب معطل' };
                }
                return await processLogin(usersData.admin, 'admin');
            }
        }

        // Check employees
        const employee = usersData.employees.find(emp => 
            emp.username === username && 
            emp.password === hashedPassword &&
            emp.approved === true &&
            emp.active !== false
        );

        if (employee) {
            return await processLogin(employee, 'employee');
        }

        recordFailedAttempt(username);
        return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    // ─── Process Login (Legacy - محفوظة كما هي) ───
    async function processLogin(user, role) {
        const deviceFingerprint = getDeviceFingerprint();

        // فحص الجهاز — للموظفين فقط
        if (role !== 'admin' && user.device_id && user.device_id !== deviceFingerprint) {
            return { 
                success: false, 
                error: 'هذا الحساب مرتبط بجهاز آخر. تواصل مع المدير',
                code: 'DEVICE_MISMATCH'
            };
        }

        // ربط الجهاز عند أول دخول
        if (!user.device_id) {
            if (role === 'admin') {
                usersData.admin.device_id = deviceFingerprint;
            } else {
                const empIndex = usersData.employees.findIndex(e => e.id === user.id);
                if (empIndex !== -1) {
                    usersData.employees[empIndex].device_id = deviceFingerprint;
                }
            }
            await saveUsers();
        }

        const now = new Date().toISOString();
        if (role === 'admin') {
            usersData.admin.last_login = now;
        } else {
            const empIndex = usersData.employees.findIndex(e => e.id === user.id);
            if (empIndex !== -1) {
                usersData.employees[empIndex].last_login = now;
            }
        }

        usersData.login_history.unshift({
            user_id: user.id,
            username: user.username,
            role: role,
            device: deviceFingerprint,
            ip: 'client-side',
            timestamp: now,
            success: true
        });

        if (usersData.login_history.length > 100) {
            usersData.login_history = usersData.login_history.slice(0, 100);
        }

        await saveUsers();

        // ─── Enforce default permissions for employees ───
        if (role === 'employee') {
            user.permissions = user.permissions || {
                dashboard: false,
                orders: true,
                products: false,
                employees: false,
                settings: false,
                statistics: false
            };
        }

        const session = {
            user_id: user.id,
            username: user.username,
            name: user.name,
            role: role,
            permissions: user.permissions || {},
            device_id: deviceFingerprint,
            login_time: now,
            expires_at: new Date(Date.now() + CONFIG.SESSION_HOURS * 60 * 60 * 1000).toISOString()
        };

        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(CONFIG.DEVICE_KEY, deviceFingerprint);

        currentUser = session;

        return { 
            success: true, 
            user: session,
            redirect: role === 'admin' ? 'dashboard.html' : 'orders.html',
            source: 'json'
        };
    }

    // ─── Logout (Hybrid) ───
    function logout() {
        phpLogout(); // لا تنتظر - fire and forget
        localStorage.removeItem(CONFIG.SESSION_KEY);
        localStorage.removeItem(CONFIG.DEVICE_KEY);
        currentUser = null;
        window.location.href = 'login.html';
    }

    // ─── Check Session (Hybrid: PHP primary, localStorage fallback) ───
    function checkSession() {
        // إذا كان PHP متاح، نتحقق منه (async)
        if (phpAvailable) {
            // Return what we have from localStorage for now, 
            // but trigger async PHP check
            checkPhpSession().then(phpUser => {
                if (!phpUser) {
                    // PHP says no session, clear local
                    localStorage.removeItem(CONFIG.SESSION_KEY);
                    currentUser = null;
                }
            });
        }

        // ─── Fallback: localStorage (الطريقة القديمة) ───
        try {
            const sessionStr = localStorage.getItem(CONFIG.SESSION_KEY);
            if (!sessionStr) return null;

            const session = JSON.parse(sessionStr);
            const now = new Date();
            const expires = new Date(session.expires_at);

            if (now > expires) {
                logout();
                return null;
            }

            // فحص الجهاز — للموظفين فقط
            if (session.role !== 'admin') {
                const currentDevice = getDeviceFingerprint();
                if (session.device_id !== currentDevice) {
                    logout();
                    return null;
                }
            }

            currentUser = session;
            return session;
        } catch (e) {
            logout();
            return null;
        }
    }

    // ─── Has Permission ───
    function hasPermission(permission) {
        const session = checkSession();
        if (!session) return false;
        if (session.role === 'admin') return true;
        return session.permissions && session.permissions[permission] === true;
    }

    // ─── Protect Page ───
    function protectPage(requiredPermission) {
        const session = checkSession();

        if (!session) {
            window.location.href = 'login.html';
            return false;
        }

        if (requiredPermission && !hasPermission(requiredPermission)) {
            window.location.href = 'dashboard.html';
            return false;
        }

        return true;
    }

    // ─── Lockout (محفوظ كما هو) ───
    function isLockedOut(username) {
        const lockoutKey = `lockout_${username}`;
        const lockoutData = localStorage.getItem(lockoutKey);

        if (!lockoutData) return false;

        const lockout = JSON.parse(lockoutData);
        const now = Date.now();
        const lockoutEnd = lockout.locked_at + (CONFIG.LOCKOUT_MINUTES * 60 * 1000);

        if (now > lockoutEnd) {
            localStorage.removeItem(lockoutKey);
            return false;
        }

        return true;
    }

    function recordFailedAttempt(username) {
        const attemptsKey = `attempts_${username}`;
        let attempts = parseInt(localStorage.getItem(attemptsKey) || '0');
        attempts++;

        if (attempts >= CONFIG.MAX_ATTEMPTS) {
            localStorage.setItem(`lockout_${username}`, JSON.stringify({
                locked_at: Date.now(),
                attempts: attempts
            }));
            localStorage.removeItem(attemptsKey);
        } else {
            localStorage.setItem(attemptsKey, attempts.toString());
        }
    }

    // ─── Employee Management (محفوظ كما هو) ───
    async function createEmployee(employeeData) {
        await loadUsers();

        const session = checkSession();
        if (!session || session.role !== 'admin') {
            return { success: false, error: 'ليس لديك صلاحية' };
        }

        if (usersData.admin.username === employeeData.username) {
            return { success: false, error: 'اسم المستخدم مستخدم مسبقاً' };
        }

        const exists = usersData.employees.find(e => e.username === employeeData.username);
        if (exists) {
            return { success: false, error: 'اسم المستخدم مستخدم مسبقاً' };
        }

        const newEmployee = {
            id: `emp_${Date.now()}`,
            username: employeeData.username,
            password: md5(employeeData.password),
            name: employeeData.name,
            role: 'employee',
            email: employeeData.email || '',
            phone: employeeData.phone || '',
            created_by: currentUser.user_id,
            created_at: new Date().toISOString(),
            last_login: null,
            device_id: null,
            approved: true,
            active: true,
            permissions: {
                dashboard: false,
                orders: true,
                products: false,
                employees: false,
                settings: false,
                statistics: false
            }
        };

        usersData.employees.push(newEmployee);
        await saveUsers();

        return { success: true, employee: newEmployee };
    }

    async function deleteEmployee(employeeId) {
        await loadUsers();
        if (!hasPermission('employees')) {
            return { success: false, error: 'ليس لديك صلاحية' };
        }

        usersData.employees = usersData.employees.filter(e => e.id !== employeeId);
        await saveUsers();

        return { success: true };
    }

    async function resetEmployeeDevice(employeeId) {
        await loadUsers();
        if (!hasPermission('employees')) {
            return { success: false, error: 'ليس لديك صلاحية' };
        }

        const empIndex = usersData.employees.findIndex(e => e.id === employeeId);
        if (empIndex === -1) {
            return { success: false, error: 'الموظف غير موجود' };
        }

        usersData.employees[empIndex].device_id = null;
        await saveUsers();

        return { success: true };
    }

    async function toggleEmployee(employeeId) {
        await loadUsers();
        if (!hasPermission('employees')) {
            return { success: false, error: 'ليس لديك صلاحية' };
        }

        const empIndex = usersData.employees.findIndex(e => e.id === employeeId);
        if (empIndex === -1) {
            return { success: false, error: 'الموظف غير موجود' };
        }

        usersData.employees[empIndex].active = !usersData.employees[empIndex].active;
        await saveUsers();

        return { success: true, active: usersData.employees[empIndex].active };
    }

    function getCurrentUser() {
        return currentUser || checkSession();
    }

    async function getEmployees() {
        await loadUsers();
        if (!hasPermission('employees')) return [];
        return usersData ? usersData.employees : [];
    }

    function getLoginHistory(limit = 50) {
        if (!hasPermission('statistics')) {
            return [];
        }
        return usersData ? usersData.login_history.slice(0, limit) : [];
    }

    // ─── Expose API ───
    window.AuthAPI = {
        login: login,
        logout: logout,
        checkSession: checkSession,
        protectPage: protectPage,
        hasPermission: hasPermission,
        getCurrentUser: getCurrentUser,
        getDeviceFingerprint: getDeviceFingerprint,
        createEmployee: createEmployee,
        deleteEmployee: deleteEmployee,
        resetEmployeeDevice: resetEmployeeDevice,
        toggleEmployee: toggleEmployee,
        getEmployees: getEmployees,
        getLoginHistory: getLoginHistory,
        loadUsers: loadUsers,
        saveUsers: saveUsers,
        getUsersData: () => usersData
    };

    // ─── Initialize: Detect PHP on load ───
    detectPhp();

    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('login.html')) {
            return;
        }

        const session = checkSession();
        if (!session) {
            if (window.location.pathname.includes('/admin/')) {
                window.location.href = 'login.html';
            }
        }
    });

})();
