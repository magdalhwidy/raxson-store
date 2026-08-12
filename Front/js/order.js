/* ============================================
   📦 Order JS - نموذج الطلب (Professional)
   ============================================
   يحتوي على: التحقق من البيانات، حفظ الطلب مؤقتاً،
   التوجيه لصفحة الدفع فقط (لا إرسال مباشر)
   ============================================ */

(function() {
    'use strict';

    // ─── Configuration ───
    const CONFIG = {
        // Order Settings
        MAX_NOTES_LENGTH: 500,
        PHONE_PATTERN: /^\+?[0-9\s\-\(\)]{7,20}$/,
        TELEGRAM_PATTERN: /^@[a-zA-Z0-9_]{5,32}$/,

        // Messages
        MESSAGES: {
            success: '✅ تم حفظ البيانات، جاري التوجيه لصفحة الدفع...',
            error: '❌ حدث خطأ',
            validation: '⚠️ يرجى التحقق من البيانات المدخلة',
            emptyCart: '🛒 السلة فارغة',
            invalidPhone: '📱 ادخل رقم صحيح مع رمز الدولة مثل 966×××××××××',
            invalidTelegram: '📱 حساب التلجرام يجب أن يبدأ بـ @',
            required: 'هذا الحقل مطلوب'
        }
    };

    // ─── DOM Elements ───
    const modalOverlay = document.getElementById('modalOverlay');
    const orderModal = document.getElementById('orderModal');
    const modalClose = document.getElementById('modalClose');
    const orderForm = document.getElementById('orderForm');
    const customerPhone = document.getElementById('customerPhone');
    const customerTelegram = document.getElementById('customerTelegram');
    const summaryItems = document.getElementById('summaryItems');
    const summaryTotal = document.getElementById('summaryTotal');
    const toastContainer = document.getElementById('toastContainer');

    // ─── State ───
    let currentOrder = null;

    // ─── Initialization ───
    function init() {
        bindEvents();
        loadSavedFormData();
        prefillCustomerData();
    }

    // ─── Event Binding ───
    function bindEvents() {
        if (modalClose) {
            modalClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
            modalClose.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
                return false;
            };
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) closeModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalOpen()) closeModal();
        });

        orderForm?.addEventListener('submit', handleSubmit);
        customerPhone?.addEventListener('input', validatePhone);
        customerTelegram?.addEventListener('input', validateTelegram);

        [customerPhone, customerTelegram].forEach(input => {
            input?.addEventListener('input', saveFormData);
        });

        document.addEventListener('cart:checkout', (e) => {
            openOrderModal(e.detail);
        });
    }

    function prefillCustomerData() {
        if (window.authAPI && window.authAPI.isLoggedIn()) {
            const customer = window.authAPI.getCustomer();
            if (customer) {}
        }
    }

    function openOrderModal(cartData) {
        if (!cartData || !cartData.cart || cartData.cart.length === 0) {
            showToast('السلة فارغة', 'أضف منتجات قبل إتمام الطلب', 'warning');
            return;
        }
        currentOrder = cartData;
        renderOrderSummary();
        prefillCustomerData();
        if (modalOverlay) modalOverlay.classList.add('active');
        if (orderModal) orderModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => customerPhone?.focus(), 300);
    }

    function closeModal() {
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (orderModal) orderModal.classList.remove('active');
        document.body.style.overflow = '';
        currentOrder = null;
    }

    function isModalOpen() {
        return orderModal?.classList.contains('active');
    }

    function renderOrderSummary() {
        if (!currentOrder || !summaryItems || !summaryTotal) return;
        const { cart, total } = currentOrder;

        summaryItems.innerHTML = cart.map((item, itemIndex) => {
            let variantsHTML = '';
            const variants = item.variants || [];
            if (variants.length > 0) {
                const allOptions = [
                    { name: 'اشتراك شهر', price: item.price, isBase: true },
                    ...variants.map(v => ({ name: v.name, price: v.price, isBase: false }))
                ];
                const selectedIdx = item.selectedVariant !== null ? item.selectedVariant + 1 : 0;
                variantsHTML = `
                    <p style="color: var(--text-secondary); font-size: 13px; margin: 12px 0 8px 0; font-weight: 500; text-align: center;">يمكنك اختيار الاشتراك المناسب:</p>
                    <div class="variant-buttons" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 12px;">
                        ${allOptions.map((opt, idx) => `
                            <button type="button" class="variant-btn ${idx === selectedIdx ? 'variant-selected' : ''}" data-item-index="${itemIndex}" data-variant-index="${idx - 1}"
                                style="padding: 8px 18px; border-radius: 20px; border: 1px solid ${idx === selectedIdx ? '#e91e63' : 'rgba(123,73,255,0.25)'}; background: ${idx === selectedIdx ? '#e91e63' : 'transparent'}; color: ${idx === selectedIdx ? '#fff' : 'var(--text-secondary)'}; font-family: 'Cairo', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;"
                                onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">${opt.name} - ${opt.price.toFixed(0)} ر.س</button>
                        `).join('')}
                    </div>`;
            }
            const displayPrice = item.selectedVariant !== null && variants[item.selectedVariant] ? variants[item.selectedVariant].price : item.price;
            return `
                <div class="summary-item" data-item-id="${item.id}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="summary-item-name">${item.name} × ${item.quantity}</span>
                        <span class="summary-item-price" data-base-price="${item.price}">${(displayPrice * item.quantity).toFixed(2)} ر.س</span>
                    </div>${variantsHTML}</div>`;
        }).join('');

        summaryItems.querySelectorAll('.variant-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                selectVariant(parseInt(this.dataset.itemIndex), parseInt(this.dataset.variantIndex));
            });
        });

        const newTotal = cart.reduce((sum, item) => {
            const variants = item.variants || [];
            const price = item.selectedVariant !== null && variants[item.selectedVariant] ? variants[item.selectedVariant].price : item.price;
            return sum + (price * item.quantity);
        }, 0);

        summaryTotal.textContent = `${newTotal.toFixed(2)} ر.س`;
        currentOrder.total = newTotal;
    }

    function selectVariant(itemIndex, variantIndex) {
        if (!currentOrder || !currentOrder.cart[itemIndex]) return;
        currentOrder.cart[itemIndex].selectedVariant = variantIndex;
        renderOrderSummary();
    }

    function validatePhone() {
        const value = customerPhone?.value.trim();
        const isValid = CONFIG.PHONE_PATTERN.test(value);
        toggleFieldError(customerPhone, !isValid, isValid ? '' : CONFIG.MESSAGES.invalidPhone);
        return isValid;
    }

    function validateTelegram() {
        const value = customerTelegram?.value.trim();
        const cleanValue = value.startsWith('@') ? value : '@' + value;
        const isValid = CONFIG.TELEGRAM_PATTERN.test(cleanValue) || value.length >= 3;
        toggleFieldError(customerTelegram, !isValid, isValid ? '' : CONFIG.MESSAGES.invalidTelegram);
        return isValid;
    }

    function validateForm() {
        return [validatePhone(), validateTelegram()].every(v => v === true);
    }

    function toggleFieldError(field, hasError, message) {
        if (!field) return;
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;
        formGroup.classList.remove('has-error');
        const existingError = formGroup.querySelector('.form-error');
        if (existingError) existingError.remove();
        if (hasError) {
            formGroup.classList.add('has-error');
            const errorEl = document.createElement('span');
            errorEl.className = 'form-error';
            errorEl.textContent = message;
            formGroup.appendChild(errorEl);
        }
    }

    // ─── PROFESSIONAL: Save to localStorage and redirect to payment ONLY ───
    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateForm()) {
            showToast('تحقق من البيانات', 'يرجى تصحيح الأخطاء في النموذج', 'warning');
            return;
        }

        if (!currentOrder || currentOrder.cart.length === 0) {
            showToast('السلة فارغة', 'أضف منتجات قبل إتمام الطلب', 'warning');
            return;
        }

        const submitBtn = orderForm.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>جاري التوجيه...</span>`;
        }

        try {
            const orderData = buildOrderData();

            // ─── STEP 1: Save to localStorage (temporary, NOT sent to API yet) ───
            localStorage.setItem('pending_order', JSON.stringify(orderData));

            // ─── STEP 2: Show success message ───
            showToast('تم!', 'جاري التوجيه لصفحة الدفع...', 'success');

            // ─── STEP 3: Redirect to payment page ───
            setTimeout(() => {
                window.location.href = 'payment.html';
            }, 600);

        } catch (error) {
            console.error('Order error:', error);
            showToast('خطأ', error.message || 'حدث خطأ، حاول مرة أخرى', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    // ─── Build Order Data (for localStorage only) ───
    function buildOrderData() {
        const { cart, total } = currentOrder;
        const telegram = customerTelegram.value.trim();
        const cleanTelegram = telegram.startsWith('@') ? telegram : '@' + telegram;
        const customerId = window.authAPI ? window.authAPI.getCustomerId() : null;

        return {
            customer_id: customerId,
            customer: {
                phone: customerPhone.value.trim(),
                telegram: cleanTelegram
            },
            items: cart.map(item => {
                const variants = item.variants || [];
                const selectedPrice = item.selectedVariant !== null && variants[item.selectedVariant] ? variants[item.selectedVariant].price : item.price;
                const selectedName = item.selectedVariant !== null && variants[item.selectedVariant] ? variants[item.selectedVariant].name : item.name;
                return {
                    id: item.id,
                    quantity: item.quantity,
                    name: selectedName,
                    price: selectedPrice,
                    original_price: item.price,
                    variant_name: item.selectedVariant !== null && variants[item.selectedVariant] ? variants[item.selectedVariant].name : null
                };
            }),
            total: total,
            payment_status: 'pending',
            created_at: new Date().toISOString()
        };
    }

    // ─── Form Data Persistence ───
    function saveFormData() {
        try {
            const data = { phone: customerPhone?.value || '', telegram: customerTelegram?.value || '' };
            localStorage.setItem('shop_store_form_data', JSON.stringify(data));
        } catch (e) { console.warn('Unable to save form data'); }
    }

    function loadSavedFormData() {
        try {
            const saved = localStorage.getItem('shop_store_form_data');
            if (saved) {
                const data = JSON.parse(saved);
                if (customerPhone) customerPhone.value = data.phone || '';
                if (customerTelegram) customerTelegram.value = data.telegram || '';
            }
        } catch (e) { console.warn('Unable to load form data'); }
    }

    function clearSavedFormData() {
        try { localStorage.removeItem('shop_store_form_data'); } catch (e) {}
    }

    // ─── Toast Notifications ───
    function showToast(title, message, type = 'info') {
        if (!toastContainer) return;
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
            <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>
            <button class="toast-close" aria-label="إغلاق"><i class="fas fa-times"></i></button>`;
        toastContainer.appendChild(toast);
        const timeout = setTimeout(() => removeToast(toast), 5000);
        toast.querySelector('.toast-close')?.addEventListener('click', () => { clearTimeout(timeout); removeToast(toast); });
    }

    function removeToast(toast) {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 400);
    }

    // ─── Public API ───
    window.orderAPI = {
        open: openOrderModal,
        close: closeModal
    };

    // ─── Start ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();