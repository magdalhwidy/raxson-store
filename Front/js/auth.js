/* ============================================
   🔐 Auth JS - نظام تسجيل/دخول العملاء
   ============================================ */

(function() {
    'use strict';

    // ─── Configuration ───
    const CONFIG = {
        API_URL: 'https://raxson.freepage.cc/api/customers.php',
        STORAGE_KEY: 'shop_customer_session',
        MESSAGES: {
            loginSuccess: 'تم تسجيل الدخول بنجاح! ',
            registerSuccess: 'تم إنشاء الحساب بنجاح! ',
            logoutSuccess: 'تم تسجيل الخروج',
            emailExists: 'هذا الإيميل مسجل مسبقاً',
            invalidCredentials: 'البريد أو كلمة المرور غير صحيحة',
            requiredFields: 'جميع الحقول مطلوبة',
            passwordShort: 'كلمة المرور 6 أحرف على الأقل',
            nameShort: 'الاسم حرفين على الأقل',
            resetSent: 'تم إرسال رابط الاستعادة!',
            resetSuccess: 'تم تغيير كلمة المرور بنجاح!'
        }
    };

    // ─── DOM Elements ───
    let authModal, authOverlay, authClose, authTabs;
    let loginForm, registerForm, forgotPasswordForm, resetPasswordForm;
    let loginEmail, loginPassword, registerName, registerEmail, registerPassword;
    let forgotEmail, resetToken, newPassword, confirmPassword;
    let loginTrigger, logoutBtn, forgotPasswordLink;

    // ─── State ───
    let currentCustomer = null;
    let resetEmail = null;  // Store email for reset flow

    // ─── Initialization ───
    function init() {
        cacheDOM();
        bindEvents();
        checkSession();
        updateUI();
        checkResetToken();
    }

    function cacheDOM() {
        authModal = document.getElementById('authModal');
        authOverlay = document.getElementById('authOverlay');
        authClose = document.getElementById('authClose');
        authTabs = document.querySelectorAll('.auth-tab');
        loginForm = document.getElementById('loginForm');
        registerForm = document.getElementById('registerForm');
        forgotPasswordForm = document.getElementById('forgotPasswordForm');
        resetPasswordForm = document.getElementById('resetPasswordForm');
        loginEmail = document.getElementById('loginEmail');
        loginPassword = document.getElementById('loginPassword');
        registerName = document.getElementById('registerName');
        registerEmail = document.getElementById('registerEmail');
        registerPassword = document.getElementById('registerPassword');
        forgotEmail = document.getElementById('forgotEmail');
        resetToken = document.getElementById('resetToken');
        newPassword = document.getElementById('newPassword');
        confirmPassword = document.getElementById('confirmPassword');
        loginTrigger = document.querySelector('.login-trigger');
        logoutBtn = document.getElementById('logoutBtn');
        forgotPasswordLink = document.getElementById('forgotPasswordLink');
    }

    function bindEvents() {
        loginTrigger?.addEventListener('click', handleLoginTrigger);
        authClose?.addEventListener('click', closeAuthModal);
        authOverlay?.addEventListener('click', closeAuthModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isAuthModalOpen()) closeAuthModal();
        });

        authTabs?.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        loginForm?.addEventListener('submit', handleLogin);
        registerForm?.addEventListener('submit', handleRegister);
        logoutBtn?.addEventListener('click', handleLogout);

        // Forgot password events
        forgotPasswordLink?.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotPasswordForm();
        });
        forgotPasswordForm?.addEventListener('submit', handleForgotPassword);
        resetPasswordForm?.addEventListener('submit', handleResetPassword);
    }

    function handleLoginTrigger(e) {
        e.preventDefault();
        if (currentCustomer) {
            return;
        }
        openAuthModal();
    }

    // ─── Modal Controls ───
    function openAuthModal() {
        if (authOverlay) authOverlay.classList.add('active');
        if (authModal) authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => loginEmail?.focus(), 300);
    }

    function closeAuthModal() {
        if (authOverlay) authOverlay.classList.remove('active');
        if (authModal) authModal.classList.remove('active');
        document.body.style.overflow = '';
        loginForm?.reset();
        registerForm?.reset();
        forgotPasswordForm?.reset();
        resetPasswordForm?.reset();
        clearErrors();
        resetEmail = null;  // Clear reset state
    }

    function isAuthModalOpen() {
        return authModal?.classList.contains('active');
    }

    function switchTab(tabName) {
        // Hide all forms
        loginForm?.classList.remove('active');
        registerForm?.classList.remove('active');
        forgotPasswordForm?.classList.remove('active');
        resetPasswordForm?.classList.remove('active');

        // Update tabs
        authTabs?.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Show selected form
        if (tabName === 'login') loginForm?.classList.add('active');
        if (tabName === 'register') registerForm?.classList.add('active');

        setTimeout(() => {
            const activeForm = document.querySelector('.auth-form.active');
            activeForm?.querySelector('input')?.focus();
        }, 100);
    }

    // ─── Login (MODIFIED - Added rememberMe) ───
    async function handleLogin(e) {
        e.preventDefault();
        clearErrors();

        const email = loginEmail?.value.trim();
        const password = loginPassword?.value;

        if (!email || !password) {
            showFieldError(loginEmail, CONFIG.MESSAGES.requiredFields);
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${CONFIG.API_URL}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
            const data = await response.json();

            if (!data.success) {
                showFieldError(loginEmail, data.message || CONFIG.MESSAGES.invalidCredentials);
                return;
            }

            // MODIFIED: Read rememberMe checkbox
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            saveSession(data.customer, rememberMe);
            currentCustomer = data.customer;
            showToast(CONFIG.MESSAGES.loginSuccess, 'success');
            closeAuthModal();
            updateUI();

            // Execute pending callback (from cart checkout)
            if (window._authCallback) {
                window._authCallback(currentCustomer);
                window._authCallback = null;
            }

        } catch (error) {
            console.error('Login error:', error);
            showFieldError(loginEmail, 'حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // ─── Register ───
    async function handleRegister(e) {
        e.preventDefault();
        clearErrors();

        const name = registerName?.value.trim();
        const email = registerEmail?.value.trim();
        const password = registerPassword?.value;

        if (!name || !email || !password) {
            showFieldError(registerName, CONFIG.MESSAGES.requiredFields);
            return;
        }
        if (name.length < 2) {
            showFieldError(registerName, CONFIG.MESSAGES.nameShort);
            return;
        }
        if (password.length < 6) {
            showFieldError(registerPassword, CONFIG.MESSAGES.passwordShort);
            return;
        }

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        setLoading(submitBtn, true);

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!data.success) {
                if (response.status === 409) {
                    showFieldError(registerEmail, CONFIG.MESSAGES.emailExists);
                } else {
                    showFieldError(registerEmail, data.message || 'حدث خطأ');
                }
                return;
            }

            saveSession(data.customer, false);
            currentCustomer = data.customer;
            showToast(CONFIG.MESSAGES.registerSuccess, 'success');
            closeAuthModal();
            updateUI();

            if (window._authCallback) {
                window._authCallback(currentCustomer);
                window._authCallback = null;
            }

        } catch (error) {
            console.error('Register error:', error);
            showFieldError(registerName, 'حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // ─── Logout ───
    function handleLogout() {
        clearSession();
        currentCustomer = null;
        updateUI();
        showToast(CONFIG.MESSAGES.logoutSuccess, 'info');
    }

    // ─── Session (MODIFIED - Added rememberMe parameter) ───
    function saveSession(customer, rememberMe = false) {
        try {
            const session = {
                customer: customer,
                rememberMe: rememberMe,
                expiresAt: Date.now() + (rememberMe ? (90 * 24 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000))
            };
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(session));
        } catch (e) {
            console.warn('Unable to save session');
        }
    }

    function loadSession() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!saved) return null;
            const session = JSON.parse(saved);
            if (session.expiresAt && session.expiresAt < Date.now()) {
                clearSession();
                return null;
            }
            return session.customer;
        } catch (e) {
            return null;
        }
    }

    function clearSession() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        } catch (e) {
            console.warn('Unable to clear session');
        }
    }

    function checkSession() {
        currentCustomer = loadSession();
    }

    // ─── Forgot Password Functions ───
    function showForgotPasswordForm() {
        // Hide all forms and tabs
        loginForm?.classList.remove('active');
        registerForm?.classList.remove('active');
        resetPasswordForm?.classList.remove('active');
        authTabs?.forEach(t => t.classList.remove('active'));

        // Show forgot password form
        forgotPasswordForm?.classList.add('active');
        setTimeout(() => forgotEmail?.focus(), 100);
    }

    // MODIFIED: Shows reset form directly instead of popup
    async function handleForgotPassword(e) {
        e.preventDefault();
        clearErrors();

        const email = forgotEmail?.value.trim();

        if (!email) {
            showFieldError(forgotEmail, 'البريد الإلكتروني مطلوب');
            return;
        }

        const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${CONFIG.API_URL}?action=forgot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                // Store email and token, then show reset form directly
                resetEmail = email;
                if (resetToken) resetToken.value = data.token || '';

                // Hide forgot form, show reset form
                forgotPasswordForm?.classList.remove('active');
                resetPasswordForm?.classList.add('active');

                showToast(CONFIG.MESSAGES.resetSent, 'success');
                setTimeout(() => newPassword?.focus(), 100);
            } else {
                showFieldError(forgotEmail, data.message || 'حدث خطأ');
            }

        } catch (error) {
            console.error('Forgot password error:', error);
            showFieldError(forgotEmail, 'حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        clearErrors();

        const token = resetToken?.value.trim();
        const password = newPassword?.value;
        const confirm = confirmPassword?.value;

        if (!token || !password || !confirm) {
            showFieldError(newPassword, 'جميع الحقول مطلوبة');
            return;
        }

        if (password.length < 6) {
            showFieldError(newPassword, CONFIG.MESSAGES.passwordShort);
            return;
        }

        if (password !== confirm) {
            showFieldError(confirmPassword, 'كلمات المرور غير متطابقة');
            return;
        }

        const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${CONFIG.API_URL}?action=reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (data.success) {
                showToast(CONFIG.MESSAGES.resetSuccess, 'success');
                closeAuthModal();
                // Show login form after delay
                setTimeout(() => {
                    switchTab('login');
                    openAuthModal();
                }, 500);
            } else {
                showFieldError(newPassword, data.message || 'حدث خطأ');
            }

        } catch (error) {
            console.error('Reset password error:', error);
            showFieldError(newPassword, 'حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // Check URL for reset token
    function checkResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('reset');

        if (token && resetToken) {
            resetToken.value = token;
            // Hide all forms and tabs
            loginForm?.classList.remove('active');
            registerForm?.classList.remove('active');
            forgotPasswordForm?.classList.remove('active');
            authTabs?.forEach(t => t.classList.remove('active'));

            // Show reset form
            resetPasswordForm?.classList.add('active');
            openAuthModal();

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // ─── UI ───
    function updateUI() {
        const isLoggedIn = !!currentCustomer;

        if (loginTrigger) {
            if (isLoggedIn) {
                loginTrigger.innerHTML = `
                    <i class="fas fa-user-check"></i>
                    <span class="customer-name">${escapeHtml(currentCustomer.name)}</span>
                `;
                loginTrigger.classList.add('logged-in');
            } else {
                loginTrigger.innerHTML = `<i class="fas fa-user"></i>`;
                loginTrigger.classList.remove('logged-in');
            }
        }

        if (logoutBtn) {
            logoutBtn.style.display = isLoggedIn ? 'flex' : 'none';
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ─── Helpers ───
    function showFieldError(field, message) {
        if (!field) return;
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;
        formGroup.classList.add('has-error');
        let errorEl = formGroup.querySelector('.form-error');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'form-error';
            formGroup.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    function clearErrors() {
        document.querySelectorAll('.form-group.has-error').forEach(g => {
            g.classList.remove('has-error');
            g.querySelector('.form-error')?.remove();
        });
    }

    function setLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn.dataset.original = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري...`;
            btn.disabled = true;
        } else {
            btn.innerHTML = btn.dataset.original || btn.innerHTML;
            btn.disabled = false;
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
            <div class="toast-content"><div class="toast-message">${message}</div></div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ─── Public API ───
    window.authAPI = {
        isLoggedIn: () => !!currentCustomer,
        getCustomer: () => currentCustomer,
        getCustomerId: () => currentCustomer?.id || null,
        openModal: openAuthModal,
        closeModal: closeAuthModal,
        logout: handleLogout,
        requireAuth: function(callback) {
            if (currentCustomer) {
                callback(currentCustomer);
            } else {
                openAuthModal();
                window._authCallback = callback;
            }
        }
    };

    // ─── Start ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();