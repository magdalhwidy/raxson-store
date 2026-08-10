/* ============================================
   📋 Sidebar JS - مشترك لجميع صفحات لوحة التحكم
   ============================================ */

(function() {
    'use strict';

    // ─── DOM Elements ───
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('logoutBtn');

    // ─── State ───
    let isSidebarOpen = false;

    // ─── Mobile Menu Toggle ───
    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('open');
            sidebar.style.transform = 'translateX(0)';
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('show');
            sidebarOverlay.style.display = 'block';
        }
        isSidebarOpen = true;
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove('open');
            sidebar.style.transform = '';
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
            sidebarOverlay.style.display = '';
        }
        isSidebarOpen = false;
        document.body.style.overflow = '';
    }

    function toggleSidebar() {
        if (isSidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    // ─── Bind Events (with cleanup to prevent duplicates) ───
    function bindEvents() {
        // Mobile toggle button
        if (mobileToggle) {
            mobileToggle.removeEventListener('click', toggleSidebar);
            mobileToggle.addEventListener('click', toggleSidebar);
        }

        // Overlay click to close
        if (sidebarOverlay) {
            sidebarOverlay.removeEventListener('click', closeSidebar);
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        // Escape key to close
        document.removeEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleEscape);

        // Nav items click to close on mobile
        document.querySelectorAll('.nav-item').forEach(function(item) {
            item.removeEventListener('click', handleNavClick);
            item.addEventListener('click', handleNavClick);
        });
    }

    function handleEscape(e) {
        if (e.key === 'Escape') closeSidebar();
    }

    function handleNavClick() {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    // ─── Highlight Current Page ───
    function highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        document.querySelectorAll('.nav-item').forEach(function(item) {
            const href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // ─── Hide nav items based on permissions ───
    function updateNavVisibility() {
        const user = (typeof AuthAPI !== 'undefined') ? AuthAPI.getCurrentUser() : null;
        if (!user) return;

        // If admin, show everything
        if (user.role === 'admin') return;

        // For employees, hide restricted items
        const perms = user.permissions || {};

        // Hide dashboard
        if (!perms.dashboard && !perms.statistics) {
            const dashboardNav = document.querySelector('a[href="dashboard.html"]');
            if (dashboardNav) dashboardNav.style.display = 'none';
        }

        // Hide products
        if (!perms.products) {
            const productsNav = document.querySelector('a[href="products.html"]');
            if (productsNav) productsNav.style.display = 'none';
        }

        // Hide settings
        if (!perms.settings) {
            const settingsNav = document.querySelector('a[href="settings.html"]');
            if (settingsNav) settingsNav.style.display = 'none';
        }

        // Hide employees
        const employeesNav = document.getElementById('employeesNav');
        if (employeesNav) employeesNav.style.display = 'none';
    }

    // ─── Logout ───
    if (logoutBtn && typeof AuthAPI !== 'undefined') {
        logoutBtn.removeEventListener('click', handleLogout);
        logoutBtn.addEventListener('click', handleLogout);
    }

    function handleLogout() {
        AuthAPI.logout();
    }

    // ─── Handle window resize ───
    function handleResize() {
        if (window.innerWidth > 768 && isSidebarOpen) {
            closeSidebar();
        }
    }

    window.removeEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    // ─── Initialize ───
    function init() {
        highlightCurrentPage();
        bindEvents();

        // Delay to ensure AuthAPI is loaded
        setTimeout(updateNavVisibility, 100);
    }

    // Run init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-init on dynamic content changes
    window.addEventListener('pageshow', init);

})();