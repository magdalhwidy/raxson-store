/* ============================================
   🛒 Cart JS - منطق السلة التسوق
   ============================================
   يحتوي على: إضافة/حذف/تعديل المنتجات، Drawer،
   localStorage، Toast Notifications، Quantity Controls
   ============================================ */

(function() {
    'use strict';

    // ─── DOM Elements ───
    const cartBtn = document.getElementById('cartBtn');
    const cartBottomBtn = document.getElementById('cartBottomBtn');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartClose = document.getElementById('cartClose');
    const cartBody = document.getElementById('cartBody');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    const totalPrice = document.getElementById('totalPrice');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const cartBadge = document.getElementById('cartBadge');
    const cartBadgeBottom = document.getElementById('cartBadgeBottom');
    const toastContainer = document.getElementById('toastContainer');

    // ─── State ───
    let cart = [];

    // ─── Constants ───
    const STORAGE_KEY = 'shop_store_cart';
    const CURRENCY = 'ر.س';

    // ─── Initialization ───
    function init() {
        loadCart();
        bindEvents();
        renderCart();
    }

    // ─── Event Binding ───
    function bindEvents() {
        // Open cart
        cartBtn?.addEventListener('click', openCart);
        cartBottomBtn?.addEventListener('click', openCart);

        // Close cart
        cartClose?.addEventListener('click', closeCart);
        cartOverlay?.addEventListener('click', closeCart);

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isCartOpen()) {
                closeCart();
            }
        });

        // Checkout button
        checkoutBtn?.addEventListener('click', handleCheckout);

        // Add to cart buttons (delegation for dynamically loaded products)
        document.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.btn-add-cart');
            if (addBtn) {
                e.preventDefault();
                const productCard = addBtn.closest('.product-card');
                if (productCard) {
                    addToCartFromCard(productCard);
                }
            }
        });
    }

    // ─── Cart Operations ───

    function addToCart(product) {
        const existingItem = cart.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
            showToast('تم تحديث الكمية', `${product.name} (الكمية: ${existingItem.quantity})`, 'info');
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                oldPrice: product.oldPrice || null,
                image: product.image || '',
                variant: product.variant || '',
                variants: product.variants || [],  // ← Pass variants to order
                selectedVariant: null,  // ← Track selected variant in order modal
                quantity: 1
            });
            showToast('تمت الإضافة', `${product.name} أضيف إلى السلة`, 'success');
        }

        saveCart();
        renderCart();
        animateBadge();
    }

    function addToCartFromCard(productCard) {
        const id = productCard.dataset.id || generateId();
        const name = productCard.querySelector('.product-name')?.textContent || 'منتج';
        const priceText = productCard.querySelector('.product-price')?.textContent || '0';
        const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
        const oldPriceText = productCard.querySelector('.product-price-old')?.textContent;
        const oldPrice = oldPriceText ? parseFloat(oldPriceText.replace(/[^\d.]/g, '')) : null;
        const image = productCard.querySelector('.product-image')?.src || '';
        const variant = productCard.querySelector('.product-variant')?.textContent || '';
        // Get variants from data attribute or global products data
        const variantsData = productCard.dataset.variants;
        let variants = [];
        if (variantsData) {
            try { variants = JSON.parse(variantsData); } catch(e) {}
        }

        addToCart({
            id,
            name,
            price,
            oldPrice,
            image,
            variant,
            variants
        });
    }

    function removeFromCart(productId) {
        const item = cart.find(item => item.id === productId);
        if (!item) return;

        const itemElement = cartItems.querySelector(`[data-cart-id="${productId}"]`);
        if (itemElement) {
            itemElement.classList.add('removing');
            setTimeout(() => {
                cart = cart.filter(item => item.id !== productId);
                saveCart();
                renderCart();
                showToast('تم الحذف', `${item.name} حُذف من السلة`, 'warning');
            }, 400);
        } else {
            cart = cart.filter(item => item.id !== productId);
            saveCart();
            renderCart();
        }
    }

    function updateQuantity(productId, change) {
        const item = cart.find(item => item.id === productId);
        if (!item) return;

        const newQuantity = item.quantity + change;

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        item.quantity = newQuantity;
        saveCart();
        renderCart();

        // Animate the quantity value
        const qtyElement = cartItems.querySelector(`[data-cart-id="${productId}"] .qty-value`);
        if (qtyElement) {
            qtyElement.style.transform = 'scale(1.3)';
            setTimeout(() => {
                qtyElement.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // ─── Rendering ───

    function renderCart() {
        updateBadge();
        updateTotal();

        if (cart.length === 0) {
            showEmptyState();
            return;
        }

        showCartItems();
        cartItems.innerHTML = cart.map(item => createCartItemHTML(item)).join('');
        bindItemEvents();
    }

    function showEmptyState() {
        cartEmpty.style.display = 'flex';
        cartItems.style.display = 'none';
        cartFooter.style.display = 'none';
    }

    function showCartItems() {
        cartEmpty.style.display = 'none';
        cartItems.style.display = 'flex';
        cartFooter.style.display = 'block';
    }

    function createCartItemHTML(item) {
        const savings = item.oldPrice ? ((item.oldPrice - item.price) * item.quantity).toFixed(2) : null;

        return `
            <div class="cart-item" data-cart-id="${item.id}">
                <div class="cart-item-image-wrapper">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='assets/images/placeholder.jpg'">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    ${item.variant ? `<span class="cart-item-variant">${item.variant}</span>` : ''}
                    <div class="cart-item-price">
                        ${item.oldPrice ? `<span class="cart-item-price-old">${item.oldPrice} ${CURRENCY}</span>` : ''}
                        <span>${item.price} ${CURRENCY}</span>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn qty-decrease" data-action="decrease" data-id="${item.id}" aria-label="تقليل الكمية">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn qty-increase" data-action="increase" data-id="${item.id}" aria-label="زيادة الكمية">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="cart-item-remove" data-action="remove" data-id="${item.id}" aria-label="حذف المنتج">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    function bindItemEvents() {
        cartItems.querySelectorAll('.qty-btn, .cart-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'increase':
                        updateQuantity(id, 1);
                        break;
                    case 'decrease':
                        updateQuantity(id, -1);
                        break;
                    case 'remove':
                        removeFromCart(id);
                        break;
                }
            });
        });
    }

    function updateBadge() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badgeText = totalItems > 99 ? '99+' : totalItems.toString();

        if (cartBadge) cartBadge.textContent = badgeText;
        if (cartBadgeBottom) cartBadgeBottom.textContent = badgeText;

        // Show/hide badges
        const display = totalItems > 0 ? 'flex' : 'none';
        if (cartBadge) cartBadge.style.display = display;
        if (cartBadgeBottom) cartBadgeBottom.style.display = display;
    }

    function animateBadge() {
        [cartBadge, cartBadgeBottom].forEach(badge => {
            if (badge) {
                badge.classList.remove('animate');
                void badge.offsetWidth; // Force reflow
                badge.classList.add('animate');
            }
        });
    }

    function updateTotal() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalSavings = cart.reduce((sum, item) => {
            return sum + (item.oldPrice ? (item.oldPrice - item.price) * item.quantity : 0);
        }, 0);

        if (totalPrice) {
            totalPrice.innerHTML = `
                ${total.toFixed(2)} 
                <span class="currency">${CURRENCY}</span>
            `;
        }

        // Update savings if element exists
        const savingsEl = cartFooter?.querySelector('.cart-savings-value');
        if (savingsEl && totalSavings > 0) {
            savingsEl.textContent = `-${totalSavings.toFixed(2)} ${CURRENCY}`;
        }

        // Disable checkout if empty
        if (checkoutBtn) {
            checkoutBtn.disabled = cart.length === 0;
        }
    }

    // ─── Drawer Controls ───

    function openCart() {
        if (cartOverlay) cartOverlay.classList.add('active');
        if (cartDrawer) cartDrawer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        if (cartOverlay) cartOverlay.classList.remove('active');
        if (cartDrawer) cartDrawer.classList.remove('active');
        document.body.style.overflow = '';
    }

    function isCartOpen() {
        return cartDrawer?.classList.contains('active');
    }

    // ─── Checkout (MODIFIED - Check Auth First) ───

    function handleCheckout() {
        if (cart.length === 0) {
            showToast('السلة فارغة', 'أضف منتجات قبل إتمام الطلب', 'warning');
            return;
        }

        closeCart();

        // Check if customer is logged in
        if (window.authAPI && !window.authAPI.isLoggedIn()) {
            // Show auth modal
            window.authAPI.openModal();
            
            // Set callback to continue checkout after login
            window._authCallback = function(customer) {
                openOrderModal();
            };
            return;
        }

        openOrderModal();
    }

    function openOrderModal() {
        // Dispatch event for order.js to handle
        document.dispatchEvent(new CustomEvent('cart:checkout', {
            detail: { cart, total: calculateTotal() }
        }));

        // Open order modal if order.js is loaded
        const modalOverlay = document.getElementById('modalOverlay');
        const orderModal = document.getElementById('orderModal');
        if (modalOverlay && orderModal) {
            modalOverlay.classList.add('active');
            orderModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function calculateTotal() {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // ─── Toast Notifications ───

    function showToast(title, message, type = 'info') {
        if (!toastContainer) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="إغلاق">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 4 seconds
        const timeout = setTimeout(() => removeToast(toast), 4000);

        // Close button
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            clearTimeout(timeout);
            removeToast(toast);
        });
    }

    function removeToast(toast) {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 400);
    }

    // ─── Storage ───

    function saveCart() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } catch (e) {
            console.warn('Unable to save cart to localStorage');
        }
    }

    function loadCart() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                cart = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Unable to load cart from localStorage');
            cart = [];
        }
    }

    function clearCart() {
        cart = [];
        saveCart();
        renderCart();
        showToast('تم التفريغ', 'تم إفراغ السلة بنجاح', 'info');
    }

    // ─── Utilities ───

    function generateId() {
        return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ─── Public API ───
    window.cartAPI = {
        add: addToCart,
        remove: removeFromCart,
        updateQuantity: updateQuantity,
        clear: clearCart,
        getItems: () => [...cart],
        getTotal: calculateTotal,
        open: openCart,
        close: closeCart,
        isOpen: isCartOpen
    };

    // ─── Start ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
