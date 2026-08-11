/* ============================================
   🛍️ Products JS - بيانات وعرض المنتجات
   ============================================
   يحتوي على: استدعاء API، عرض البطاقات،
   الفلترة، البحث، التحميل التدريجي
   ============================================ */

(function() {
    'use strict';

    // ─── API Configuration ───
    const API_URL = 'https://raxson.freepage.cc/api/products.php';

    // ─── DOM Elements ───
    const productsGrid = document.getElementById('productsGrid');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const searchInput = document.getElementById('searchInput');
    const categoryCards = document.querySelectorAll('.category-card');
    const filterTabs = document.querySelectorAll('.filter-tab');

    // ─── State ───
    let allProducts = [];
    let filteredProducts = [];
    let displayedCount = 0;
    let currentCategory = 'all';
    let currentFilter = 'all'; // 'all' | 'bestseller'
    let currentSearch = '';
    let isLoading = false;
    const ITEMS_PER_PAGE = 8;

    // ─── Category Labels ───
    const CATEGORY_LABELS = {
        'games': 'ألعاب الفيديو',
        'subscriptions': 'اشتراكات رقمية',
        'plus-apps': 'تطبيقات البلس',
        'gift-cards': 'بطاقات الهدايا'
    };

    // ─── SVG Placeholder (inline, no external file needed) ───
    const PLACEHOLDER_SVG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%231a1a3e%22 width=%22200%22 height=%22200%22/%3E%3Ctext fill=%22%23606080%22 x=%22100%22 y=%22110%22 text-anchor=%22middle%22 font-size=%2260%22%3E📦%3C/text%3E%3C/svg%3E';

    // ─── Initialization ───
    async function init() {
        bindEvents();
        await loadProductsFromAPI();
    }

    // ─── Load Products from API ───
    async function loadProductsFromAPI() {
        if (isLoading) return;
        isLoading = true;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000;
        let attempts = 0;

        async function tryLoad() {
            attempts++;
            try {
                showLoadingState();
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error('Failed to load products: ' + response.status);
                }
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || 'Unknown error');
                }
                allProducts = data.products || [];
                resetAndFilter();
                return true;
            } catch (error) {
                console.error('API Error (attempt ' + attempts + '/' + MAX_RETRIES + '):', error);
                if (attempts < MAX_RETRIES) {
                    await new Promise(r => setTimeout(r, RETRY_DELAY));
                    return tryLoad();
                }
                return false;
            }
        }

        const success = await tryLoad();
        if (!success) {
            showErrorState('تعذر تحميل المنتجات');
        }
        isLoading = false;
        hideLoadingState();
    }

    // ─── Loading State ───
    function showLoadingState() {
        if (!productsGrid) return;
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl);">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: var(--color-primary); margin-bottom: var(--space-lg); display: block;"></i>
                <p style="color: var(--text-secondary); font-size: var(--text-lg);">جاري تحميل المنتجات...</p>
            </div>
        `;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    function hideLoadingState() {
        // Loading state removed by renderProducts
    }

    function showErrorState(message) {
        if (!productsGrid) return;
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl);">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--color-error); margin-bottom: var(--space-lg); display: block;"></i>
                <h3 style="color: var(--text-secondary); margin-bottom: var(--space-sm);">${message}</h3>
                <p style="color: var(--text-muted); font-size: var(--text-sm); margin-bottom: var(--space-lg);">
              
                </p>
                <button class="btn btn-primary" onclick="window.productsAPI.reload()" style="margin-top: var(--space-lg);">
                    <i class="fas fa-sync-alt"></i>
                    <span>إعادة المحاولة</span>
                </button>
            </div>
        `;
    }

    // ─── Event Binding ───
    function bindEvents() {
        // Load more button
        loadMoreBtn?.addEventListener('click', loadMore);

        // Search
        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearch = e.target.value.trim().toLowerCase();
                resetAndFilter();
            }, 300);
        });

        // Category cards (from categories section)
        categoryCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const category = card.dataset.category;

                // Update active state on category cards
                categoryCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // Reset filter tabs to show the matching category tab as active
                currentFilter = 'all';
                currentCategory = category;
                updateFilterTabsUI();

                // Scroll to products
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });

                resetAndFilter();
            });
        });

        // Filter tabs (All / Bestseller / Categories)
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = tab.dataset.filter;
                const category = tab.dataset.category;

                // Reset category cards
                categoryCards.forEach(c => c.classList.remove('active'));

                if (filter === 'all') {
                    // "All" tab clicked
                    currentFilter = 'all';
                    currentCategory = 'all';
                } else if (filter === 'bestseller') {
                    // "Bestseller" tab clicked
                    currentFilter = 'bestseller';
                    currentCategory = 'all';
                } else if (category) {
                    // Category tab clicked
                    currentFilter = 'all';
                    currentCategory = category;
                }

                updateFilterTabsUI();

                // Scroll to products
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });

                resetAndFilter();
            });
        });

        // Nav links smooth scroll
        document.querySelectorAll('.nav-link[href="#products"]').forEach(link => {
            link.addEventListener('click', () => {
                currentCategory = 'all';
                currentFilter = 'all';
                categoryCards.forEach(c => c.classList.remove('active'));
                updateFilterTabsUI();
                resetAndFilter();
            });
        });
    }

    // ─── Update Filter Tabs UI ───
    function updateFilterTabsUI() {
        filterTabs.forEach(tab => {
            const tabFilter = tab.dataset.filter;
            const tabCategory = tab.dataset.category;

            let isActive = false;

            if (currentFilter === 'all' && currentCategory === 'all') {
                // "All" is active
                isActive = tabFilter === 'all';
            } else if (currentFilter === 'bestseller') {
                // "Bestseller" is active
                isActive = tabFilter === 'bestseller';
            } else if (currentCategory !== 'all' && tabCategory === currentCategory) {
                // A specific category is active
                isActive = true;
            }

            if (isActive) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // ─── Filtering ───
    function resetAndFilter() {
        displayedCount = 0;

        filteredProducts = allProducts.filter(product => {
            // Category filter
            const categoryMatch = currentCategory === 'all' || product.category === currentCategory;

            // Filter tab: bestseller
            const filterMatch = currentFilter === 'all' || (currentFilter === 'bestseller' && product.bestseller === true);

            // Search filter
            const searchMatch = !currentSearch ||
                product.name.toLowerCase().includes(currentSearch) ||
                (product.description || '').toLowerCase().includes(currentSearch) ||
                (CATEGORY_LABELS[product.category] || '').toLowerCase().includes(currentSearch);

            // Only show active products with stock
            const isAvailable = product.active !== false && product.stock > 0;

            return categoryMatch && filterMatch && searchMatch && isAvailable;
        });

        // Sort bestseller products first when 'bestseller' filter is active
        if (currentFilter === 'bestseller') {
            filteredProducts.sort((a, b) => {
                // Sort by sales_count descending (if exists), then by stock descending
                const salesA = a.sales_count || 0;
                const salesB = b.sales_count || 0;
                return salesB - salesA;
            });
        }

        // Clear grid
        if (productsGrid) {
            productsGrid.innerHTML = '';
        }

        renderProducts();

        // Update stats display in hero section if exists
        updateHeroStats();
    }

    function updateHeroStats() {
        // Update the stats cards in the hero section if they exist
        const totalEl = document.getElementById('totalProductsCount');
        const availableEl = document.getElementById('availableProductsCount');
        if (totalEl) totalEl.textContent = allProducts.length;
        if (availableEl) availableEl.textContent = allProducts.filter(p => p.active !== false && p.stock > 0).length;
    }

    // ─── Rendering ───
    function renderProducts() {
        if (!productsGrid) return;

        const endIndex = Math.min(displayedCount + ITEMS_PER_PAGE, filteredProducts.length);
        const productsToShow = filteredProducts.slice(displayedCount, endIndex);

        productsToShow.forEach((product, index) => {
            const card = createProductCard(product);
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            productsGrid.appendChild(card);

            // Stagger animation
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });

        displayedCount = endIndex;

        // Update load more button
        updateLoadMoreButton();

        // Show empty state if no products
        if (filteredProducts.length === 0) {
            showEmptyState();
        }
    }

    function createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = product.id;
        card.dataset.category = product.category;

        // Determine badge priority:
        // 1. Bestseller badge (if product is marked as bestseller)
        // 2. Discount badge (if oldPrice exists and is higher than price)
        // 3. Low stock badge
        let badgeHTML = '';
        if (product.bestseller === true) {
            badgeHTML = `<span class="product-badge badge-hot"><i class="fas fa-fire"></i> الأكثر مبيعاً</span>`;
        } else if (product.oldPrice && product.oldPrice > product.price) {
            const discount = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
            badgeHTML = `<span class="product-badge badge-discount">-${discount}%</span>`;
        } else if (product.stock <= (product.minStock || 5)) {
            badgeHTML = `<span class="product-badge badge-hot">الأكثر طلباً</span>`;
        }

        const oldPriceHTML = product.oldPrice ? `
            <span class="product-price-old">${product.oldPrice.toFixed(2)} ر.س</span>
        ` : '';

        const savingsHTML = product.oldPrice ? `
            <span class="product-savings">وفر ${(product.oldPrice - product.price).toFixed(2)} ر.س</span>
        ` : '';

        // Use inline SVG placeholder if no image — prevents infinite loop!
        const imageUrl = product.image || PLACEHOLDER_SVG;

        // Store variants in dataset for cart.js
        card.dataset.variants = JSON.stringify(product.variants || []);

        card.innerHTML = `
            <div class="product-image-wrapper">
                <img src="${imageUrl}" alt="${product.name}" class="product-image" loading="lazy" onerror="this.onerror=null; this.src='${PLACEHOLDER_SVG}';">
                ${badgeHTML}
            </div>
            <div class="product-info">
                <span class="product-category">${CATEGORY_LABELS[product.category] || product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-price-wrapper">
                    ${oldPriceHTML}
                    <span class="product-price">${product.price.toFixed(2)} <span class="product-price-currency">ر.س</span></span>
                </div>
                ${savingsHTML}
                <button class="btn btn-add-cart" data-product-id="${product.id}">
                    <i class="fas fa-shopping-cart"></i>
                    <span>أضف للسلة</span>
                </button>
            </div>
        `;

        return card;
    }

    function showEmptyState() {
        if (!productsGrid) return;

        let emptyMessage = 'لا توجد منتجات متاحة';
        let emptySubMessage = 'قد تكون المنتجات غير نشطة أو نفذت من المخزون. جرب تصفح التصنيفات الأخرى.';
        let icon = 'fa-search';

        if (currentFilter === 'bestseller') {
            emptyMessage = 'لا توجد منتجات الأكثر مبيعاً حالياً';
            emptySubMessage = 'سيتم عرض المنتجات الأكثر مبيعاً هنا قريباً';
            icon = 'fa-fire';
        } else if (currentCategory !== 'all') {
            emptyMessage = 'لا توجد منتجات متاحة في هذا القسم';
            emptySubMessage = 'قد تكون المنتجات في هذا القسم غير نشطة أو نفذت. جرب قسم آخر.';
            icon = 'fa-folder-open';
        } else if (currentSearch) {
            emptyMessage = 'لا توجد نتائج للبحث';
            emptySubMessage = 'جرب البحث بكلمات مختلفة';
            icon = 'fa-search';
        }

        productsGrid.innerHTML = `
            <div class="products-empty" style="grid-column: 1 / -1; text-align: center; padding: var(--space-3xl) var(--space-lg);">
                <div style="width: 120px; height: 120px; margin: 0 auto var(--space-lg); background: rgba(123, 73, 255, 0.05); border: var(--border-subtle); border-radius: var(--radius-circle); display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${icon}" style="font-size: var(--text-4xl); color: var(--text-disabled);"></i>
                </div>
                <h3 style="font-size: var(--text-xl); color: var(--text-secondary); margin-bottom: var(--space-sm);">${emptyMessage}</h3>
                <p style="color: var(--text-muted); font-size: var(--text-base);">${emptySubMessage}</p>
                <button class="btn btn-primary" onclick="window.productsAPI.reload()" style="margin-top: var(--space-lg);">
                    <i class="fas fa-sync-alt"></i>
                    <span>إعادة تحميل المنتجات</span>
                </button>
            </div>
        `;
    }

    function updateLoadMoreButton() {
        if (!loadMoreBtn) return;

        if (displayedCount >= filteredProducts.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-flex';
            const remaining = filteredProducts.length - displayedCount;
            loadMoreBtn.innerHTML = `
                <span>عرض المزيد (${remaining})</span>
                <i class="fas fa-chevron-down"></i>
            `;
        }
    }

    function loadMore() {
        renderProducts();
    }

    // ─── Public API ───
    window.productsAPI = {
        getAll: () => [...allProducts],
        getByCategory: (category) => allProducts.filter(p => p.category === category),
        getById: (id) => allProducts.find(p => p.id === id),
        search: (query) => {
            const q = query.toLowerCase();
            return allProducts.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        },
        filterByCategory: (category) => {
            currentCategory = category;
            resetAndFilter();
        },
        setFilter: (filter) => {
            currentFilter = filter;
            updateFilterTabsUI();
            resetAndFilter();
        },
        reload: loadProductsFromAPI
    };

    // ─── Start ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
