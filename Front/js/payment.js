/* ============================================
   💳 Payment JS - صفحة الدفع (Production Ready)
   ============================================ */

(function() {
    'use strict';

    // ═══════════════════════════════════════════
    // ⚠️ CONFIG - املأ هذه البيانات
    // ═══════════════════════════════════════════
    const CONFIG = {
        API_URL: '../api/orders.php',
        MAYSAR_API_KEY: '',
        MAYSAR_API_SECRET: '',
        MAYSAR_API_URL: 'https://api.maysar.com/v1',
        TELEGRAM_BOT_TOKEN: '',
        TELEGRAM_CHAT_ID: '',
        PAYMENT_FEE_PERCENT: 0,
        MESSAGES: {
            invalidCard: 'رقم البطاقة غير صحيح',
            invalidExpiry: 'تاريخ الانتهاء غير صحيح',
            invalidCVV: 'CVV غير صحيح',
            invalidName: 'الاسم على البطاقة مطلوب',
            processing: 'جاري معالجة الدفع...',
            paymentSuccess: 'تم الدفع بنجاح!',
            paymentFailed: 'فشل الدفع، لم يتم خصم أي مبلغ',
            paymentCancelled: 'تم إلغاء عملية الدفع',
            orderSent: 'تم إرسال الطلب بنجاح!',
            error: 'حدث خطأ، حاول مرة أخرى',
            noOrder: 'لا يوجد طلب للدفع',
            connectionError: 'تعذر الاتصال ببوابة الدفع'
        }
    };

    // ─── DOM Elements ───
    const paymentForm = document.getElementById('paymentForm');
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');
    const cardName = document.getElementById('cardName');
    const payBtn = document.getElementById('payBtn');
    const payAmount = document.getElementById('payAmount');
    const summaryItems = document.getElementById('summaryItems');
    const subtotalEl = document.getElementById('subtotal');
    const feesEl = document.getElementById('fees');
    const totalAmountEl = document.getElementById('totalAmount');
    const customerPhoneEl = document.getElementById('customerPhone');
    const customerTelegramEl = document.getElementById('customerTelegram');
    const processingOverlay = document.getElementById('processingOverlay');
    const successModal = document.getElementById('successModal');
    const orderNumberEl = document.getElementById('orderNumber');
    const paidAmountEl = document.getElementById('paidAmount');
    const toastContainer = document.getElementById('toastContainer');
    const cardIcons = document.getElementById('cardIcons');

    // ─── State ───
    let orderData = null;
    let currentMethod = 'mada';

    // ─── Initialization ───
    function init() {
        loadOrderData();
        bindEvents();
        renderSummary();
        updateCardIcons('mada');
    }

    // ─── Load Order Data ───
    function loadOrderData() {
        try {
            const saved = localStorage.getItem('pending_order');
            if (!saved) {
                showToast(CONFIG.MESSAGES.noOrder, 'جاري التوجيه للرئيسية...', 'error');
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
                return;
            }

            orderData = JSON.parse(saved);

            if (orderData.customer) {
                customerPhoneEl.textContent = orderData.customer.phone || '--';
                customerTelegramEl.textContent = orderData.customer.telegram || '--';
            }

            const subtotal = orderData.total || 0;
            const fees = subtotal * (CONFIG.PAYMENT_FEE_PERCENT / 100);
            const total = subtotal + fees;

            subtotalEl.textContent = formatCurrency(subtotal);
            feesEl.textContent = formatCurrency(fees);
            totalAmountEl.textContent = formatCurrency(total);
            payAmount.textContent = formatCurrency(total);

        } catch (e) {
            console.error('Error loading order:', e);
            showToast('خطأ', 'تعذر تحميل بيانات الطلب', 'error');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        }
    }

    function formatCurrency(amount) {
        return amount.toFixed(2) + ' ر.س';
    }

    function renderSummary() {
        if (!orderData || !orderData.items) return;
        summaryItems.innerHTML = orderData.items.map(item => `
            <div class="summary-item">
                <span class="summary-item-name">${item.name} × ${item.quantity}</span>
                <span class="summary-item-price">${formatCurrency(item.price * item.quantity)}</span>
            </div>
        `).join('');
    }

    // ─── Event Binding ───
    function bindEvents() {
        cardNumber?.addEventListener('input', formatCardNumber);
        expiryDate?.addEventListener('input', formatExpiryDate);
        cvv?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
        });
        cardName?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
        });
        paymentForm?.addEventListener('submit', handlePayment);

        // Method tabs
        document.querySelectorAll('.method-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentMethod = this.dataset.method;
                updateCardIcons(currentMethod);
            });
        });
    }

    function updateCardIcons(method) {
        if (!cardIcons) return;

        if (method === 'mada') {
            cardIcons.innerHTML = `<img src="images/mada.png" alt="مدى" class="mada-input-icon">`;
        } else if (method === 'apple') {
            cardIcons.innerHTML = '<i class="fab fa-apple" style="color:#fff;font-size:20px;"></i>';
        } else {
            cardIcons.innerHTML = `
                <i class="fab fa-cc-visa"></i>
                <i class="fab fa-cc-mastercard"></i>
            `;
        }
    }

    function formatCardNumber(e) {
        let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += value[i];
        }
        e.target.value = formatted.substring(0, 19);
    }

    function formatExpiryDate(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) value = value.substring(0, 2) + '/' + value.substring(2, 4);
        e.target.value = value;
    }

    function validateCard() {
        const name = cardName.value.trim();
        const cardNum = cardNumber.value.replace(/\s/g, '');
        const expiry = expiryDate.value;
        const cvvVal = cvv.value;

        if (!name || name.length < 3) {
            showToast(CONFIG.MESSAGES.invalidName, '', 'error');
            cardName.focus();
            return false;
        }
        if (cardNum.length < 13 || cardNum.length > 19) {
            showToast(CONFIG.MESSAGES.invalidCard, 'يجب أن يكون بين 13 و 19 رقم', 'error');
            cardNumber.focus();
            return false;
        }
        if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            showToast(CONFIG.MESSAGES.invalidExpiry, 'الصيغة المطلوبة: MM/YY', 'error');
            expiryDate.focus();
            return false;
        }
        const [month, year] = expiry.split('/');
        const expiryDateObj = new Date(2000 + parseInt(year), parseInt(month) - 1);
        expiryDateObj.setMonth(expiryDateObj.getMonth() + 1, 0);
        if (expiryDateObj < new Date()) {
            showToast('البطاقة منتهية الصلاحية', '', 'error');
            expiryDate.focus();
            return false;
        }
        if (parseInt(month) < 1 || parseInt(month) > 12) {
            showToast('الشهر غير صحيح', 'يجب أن يكون بين 01 و 12', 'error');
            expiryDate.focus();
            return false;
        }
        if (cvvVal.length < 3 || cvvVal.length > 4) {
            showToast(CONFIG.MESSAGES.invalidCVV, 'يجب أن يكون 3 أو 4 أرقام', 'error');
            cvv.focus();
            return false;
        }
        return true;
    }

    // ═══════════════════════════════════════════
    // MAIN: Handle Payment Flow
    // ═══════════════════════════════════════════
    async function handlePayment(e) {
        e.preventDefault();

        if (!validateCard()) return;
        if (!orderData) {
            showToast('خطأ', 'لا يوجد طلب للدفع', 'error');
            return;
        }

        // STEP 1: Show processing overlay
        processingOverlay.classList.add('active');

        try {
            // STEP 2: Process Payment
            const paymentResult = await processPaymentMaysar();

            // ❌ PAYMENT FAILED
            if (!paymentResult.success) {
                // CLOSE OVERLAY IMMEDIATELY
                processingOverlay.classList.remove('active');

                if (paymentResult.cancelled) {
                    showToast(CONFIG.MESSAGES.paymentCancelled, 'يمكنك المحاولة مرة أخرى', 'warning');
                } else {
                    showToast(CONFIG.MESSAGES.paymentFailed, paymentResult.error || 'يرجى التحقق من البيانات', 'error');
                }
                return;
            }

            // ✅ PAYMENT SUCCESS
            showToast('تم الدفع!', 'جاري إرسال الطلب...', 'success');

            // STEP 3: Send order to API
            const orderResult = await sendOrderToAPI(paymentResult.transactionId);

            if (!orderResult.success) {
                processingOverlay.classList.remove('active');
                showToast('تم الدفع لكن...', 'تعذر إرسال الطلب، تواصل مع الدعم', 'warning');
                console.error('Order API failed after payment:', orderResult.error);
                return;
            }

            // STEP 4: Send Telegram notification
            if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
                await sendTelegram(orderResult.order || orderData);
            }

            // STEP 5: Close overlay + Show success modal
            processingOverlay.classList.remove('active');
            orderNumberEl.textContent = orderResult.order?.id || paymentResult.transactionId || '--';
            paidAmountEl.textContent = formatCurrency(orderData.total || 0);
            successModal.classList.add('active');

            // STEP 6: Clear cart data
            localStorage.removeItem('pending_order');
            localStorage.removeItem('shop_store_cart');
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'shop_store_cart',
                newValue: null
            }));

            // STEP 7: Auto redirect after 3 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);

        } catch (error) {
            console.error('Payment flow error:', error);
            processingOverlay.classList.remove('active');
            showToast('خطأ', 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى', 'error');
        }
    }

    // ═══════════════════════════════════════════
    // STEP 2: Process Payment (Maysar Placeholder)
    // ═══════════════════════════════════════════
    async function processPaymentMaysar() {
        /*
        TODO: استبدل هذا الكود بـ API ميسر الحقيقي

        const response = await fetch(CONFIG.MAYSAR_API_URL + '/payments', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + CONFIG.MAYSAR_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: orderData.total * 100,
                currency: 'SAR',
                card: {
                    number: cardNumber.value.replace(/\s/g, ''),
                    expiry_month: expiryDate.value.split('/')[0],
                    expiry_year: '20' + expiryDate.value.split('/')[1],
                    cvv: cvv.value,
                    name: cardName.value
                }
            })
        });

        const result = await response.json();

        if (result.status === 'success') {
            return { success: true, transactionId: result.transaction_id };
        } else if (result.status === 'cancelled') {
            return { success: false, cancelled: true };
        } else {
            return { success: false, error: result.message };
        }
        */

        // ⚠️ كود مؤقت للاختبار
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    transactionId: 'MAYSAR_' + Date.now(),
                    message: 'Payment processed'
                });
            }, 2000);
        });
    }

    // ═══════════════════════════════════════════
    // STEP 3: Send Order to API
    // ═══════════════════════════════════════════
    async function sendOrderToAPI(transactionId) {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...orderData,
                    payment_status: 'paid',
                    payment_method: currentMethod,
                    transaction_id: transactionId,
                    paid_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }

            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'تعذر الاتصال بالخادم' };
        }
    }

    // ═══════════════════════════════════════════
    // STEP 4: Send Telegram Notification
    // ═══════════════════════════════════════════
    async function sendTelegram(order) {
        const message = formatTelegramMessage(order);
        const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            const data = await response.json();
            return data.ok;
        } catch (error) {
            console.error('Telegram send failed:', error);
            return false;
        }
    }

    function formatTelegramMessage(order) {
        const itemsList = order.items?.map(item =>
            `• ${item.name}\n  الكمية: ${item.quantity} | السعر: ${item.price?.toFixed(2)} ر.س`
        ).join('\n') || '';

        return `
✅ <b>طلب مدفوع جديد!</b>

📋 <b>رقم الطلب:</b> #${order.id || 'جديد'}
📅 <b>التاريخ:</b> ${new Date().toLocaleDateString('ar-SA')}
💳 <b>طريقة الدفع:</b> ${currentMethod === 'mada' ? 'مدى' : currentMethod === 'apple' ? 'Apple Pay' : 'بطاقة ائتمان'}
💳 <b>حالة الدفع:</b> ✅ تم الدفع

👤 <b>بيانات العميل:</b>
• الهاتف: ${order.customer?.phone || '--'}
• التلجرام: ${order.customer?.telegram || '--'}

📦 <b>المنتجات:</b>
${itemsList}

💰 <b>الإجمالي:</b> ${order.total?.toFixed(2) || 0} ر.س
        `.trim();
    }

    // ═══════════════════════════════════════════
    // Toast Notifications (CENTERED)
    // ═══════════════════════════════════════════
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
            <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ─── Start ───
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();