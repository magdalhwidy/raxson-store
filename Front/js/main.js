/* ============================================
   🚀 Main JS - التهيئة والتنقل والأحداث العامة
   ============================================
   يحتوي على: تهيئة الموقع، التنقل السلس،
   قائمة الجوال، البحث، إدارة الأحداث
   ============================================ */

(function() {
    'use strict';

    // ─── DOM Elements ───
    const header = document.getElementById('header');
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    const bottomNav = document.getElementById('bottomNav');
    const searchInput = document.getElementById('searchInput');
    const productsSection = document.getElementById('products');

    // ─── State ───
    let isMenuOpen = false;
    let lastScrollY = 0;
    let scrollDirection = 'up';

    // ─── Initialization ───
    function init() {
        bindEvents();
        initScrollEffects();
        initActiveNavLinks();
        initBottomNav();
        initSearchFocus();
        initLazyLoading();
        console.log('🚀 Shop Store initialized successfully!');
    }

    // ─── Event Binding ───
    function bindEvents() {
        // Mobile menu toggle
        menuToggle?.addEventListener('click', toggleMobileMenu);

        // Smooth scroll for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', handleSmoothScroll);
        });

        // Scroll effects
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 250);
        });

        // Click outside to close menu
        document.addEventListener('click', (e) => {
            if (isMenuOpen && !e.target.closest('.main-nav') && !e.target.closest('.menu-toggle')) {
                closeMobileMenu();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);

        // Prevent context menu on images (optional security)
        document.querySelectorAll('img').forEach(img => {
            img.addEventListener('contextmenu', (e) => {
                // Uncomment to disable right-click on images
                // e.preventDefault();
            });
        });
    }

    // ─── Mobile Menu ───
    function toggleMobileMenu() {
        isMenuOpen = !isMenuOpen;

        if (isMenuOpen) {
            openMobileMenu();
        } else {
            closeMobileMenu();
        }
    }

    function openMobileMenu() {
        menuToggle?.classList.add('active');
        mainNav?.classList.add('active');
        document.body.style.overflow = 'hidden';
        isMenuOpen = true;

        // Animate nav items
        const navItems = mainNav?.querySelectorAll('.nav-link');
        navItems?.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }

    function closeMobileMenu() {
        menuToggle?.classList.remove('active');
        mainNav?.classList.remove('active');
        document.body.style.overflow = '';
        isMenuOpen = false;
    }

    // ─── Scroll Effects ───
    function handleScroll() {
        const currentScrollY = window.scrollY;

        // Determine scroll direction
        scrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
        lastScrollY = currentScrollY;

        // Header effects
        handleHeaderScroll(currentScrollY);

        // Update active nav links
        updateActiveNavOnScroll();

        // Parallax for hero (subtle)
        handleHeroParallax(currentScrollY);
    }

    function handleHeaderScroll(scrollY) {
        if (!header) return;

        // Add/remove scrolled class
        if (scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll direction (mobile)
        if (window.innerWidth < 768) {
            if (scrollDirection === 'down' && scrollY > 200) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
        } else {
            header.style.transform = 'translateY(0)';
        }
    }

    function handleHeroParallax(scrollY) {
        const heroVisual = document.querySelector('.hero-visual');
        if (heroVisual && scrollY < window.innerHeight) {
            const speed = 0.3;
            heroVisual.style.transform = `translateY(${scrollY * speed}px)`;
        }
    }

    // ─── Smooth Scroll ───
    function handleSmoothScroll(e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        // Close mobile menu if open
        if (isMenuOpen) {
            closeMobileMenu();
        }

        // Calculate offset (header height + padding)
        const headerHeight = header?.offsetHeight || 80;
        const offset = headerHeight + 20;

        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        // Update active link
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelectorAll(`.nav-link[href="${href}"]`).forEach(link => link.classList.add('active'));
    }

    // ─── Active Navigation Links ───
    function initActiveNavLinks() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        const observerOptions = {
            rootMargin: '-20% 0px -80% 0px',
            threshold: 0
        };

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });

                    // Update bottom nav
                    updateBottomNavActive(id);
                }
            });
        }, observerOptions);

        sections.forEach(section => sectionObserver.observe(section));
    }

    function updateActiveNavOnScroll() {
        // Fallback for browsers without IntersectionObserver support
        // or for more precise control
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 150;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // ─── Bottom Navigation ───
    function initBottomNav() {
        const bottomNavItems = bottomNav?.querySelectorAll('.bottom-nav-item');

        bottomNavItems?.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't prevent default for actual links
                if (item.tagName === 'A') {
                    bottomNavItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });
    }

    function updateBottomNavActive(sectionId) {
        const bottomItems = bottomNav?.querySelectorAll('.bottom-nav-item');
        bottomItems?.forEach(item => {
            const href = item.getAttribute('href');
            if (href === `#${sectionId}`) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // ─── Search Focus ───
    function initSearchFocus() {
        // Auto-focus search on '/' key
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput?.focus();
            }
        });

        // Clear search on Escape
        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchInput.blur();
                // Trigger search clear
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    }

    // ─── Lazy Loading Images ───
    function initLazyLoading() {
        // Use native lazy loading with fallback
        if ('loading' in HTMLImageElement.prototype) {
            // Browser supports native lazy loading
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.loading = 'lazy';
            });
        } else {
            // Fallback: IntersectionObserver
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '50px' });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // ─── Keyboard Shortcuts ───
    function handleKeyboard(e) {
        // Escape to close modals/drawers
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            const activeDrawer = document.querySelector('.cart-drawer.active');

            if (activeModal) {
                activeModal.classList.remove('active');
                document.getElementById('modalOverlay')?.classList.remove('active');
                document.body.style.overflow = '';
            }

            if (activeDrawer) {
                activeDrawer.classList.remove('active');
                document.getElementById('cartOverlay')?.classList.remove('active');
                document.body.style.overflow = '';
            }

            if (isMenuOpen) {
                closeMobileMenu();
            }
        }
    }

    // ─── Resize Handler ───
    function handleResize() {
        // Close mobile menu on resize to desktop
        if (window.innerWidth >= 768 && isMenuOpen) {
            closeMobileMenu();
        }

        // Reset header transform
        if (header) {
            header.style.transform = '';
        }
    }

    // ─── Scroll to Top Button (optional) ───
    function initScrollToTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        scrollBtn.setAttribute('aria-label', 'العودة للأعلى');
        scrollBtn.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 20px;
            width: 48px;
            height: 48px;
            background: var(--gradient-primary);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 18px;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px);
            transition: all 0.3s ease;
            z-index: var(--z-sticky);
            box-shadow: var(--glow-purple-sm);
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollBtn.style.opacity = '1';
                scrollBtn.style.visibility = 'visible';
                scrollBtn.style.transform = 'translateY(0)';
            } else {
                scrollBtn.style.opacity = '0';
                scrollBtn.style.visibility = 'hidden';
                scrollBtn.style.transform = 'translateY(20px)';
            }
        }, { passive: true });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ─── Performance: Preload Critical Resources ───
    function preloadCriticalResources() {
        const criticalImages = [
            // Add critical images here
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    // ─── Performance: Debounce Function ───
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ─── Performance: Throttle Function ───
    function throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ─── Utility: Detect Touch Device ───
    function isTouchDevice() {
        return window.matchMedia('(pointer: coarse)').matches;
    }

    // ─── Utility: Detect Reduced Motion ───
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ─── Public API ───
    window.mainAPI = {
        scrollTo: (target, offset = 80) => {
            const element = typeof target === 'string' ? document.querySelector(target) : target;
            if (element) {
                const position = element.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: position, behavior: 'smooth' });
            }
        },
        openMenu: openMobileMenu,
        closeMenu: closeMobileMenu,
        isTouchDevice: isTouchDevice,
        prefersReducedMotion: prefersReducedMotion,
        debounce: debounce,
        throttle: throttle
    };

    // ─── Start ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Initialize scroll to top after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollToTop);
    } else {
        initScrollToTop();
    }

})();
