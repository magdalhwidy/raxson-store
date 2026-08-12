/* ============================================
   🤖 Chatbot Widget - Raxson Store
   ============================================ */

(function() {
    'use strict';

    // Create widget HTML
    const widgetHTML = `
        <div class="chatbot-widget" id="chatbotWidget">
            <div class="chatbot-popup" id="chatbotPopup">
                <div class="chatbot-header">
                    <div class="chatbot-avatar">🤖</div>
                    <div class="chatbot-info">
                        <h4>خدمة العملاء</h4>
                        <div class="chatbot-status">
                            <span class="chatbot-status-dot"></span>
                            <p>متصل الآن</p>
                        </div>
                    </div>
                </div>
                <div class="chatbot-body">
                    <p>نحن في خدمتكم على مدار الساعة تواصل معنا:</p>
                </div>
                <div class="chatbot-actions">
                    <a href="https://wa.me/966XXXXXXXXX" target="_blank" class="chatbot-action whatsapp">
                        <i class="fab fa-whatsapp"></i>
                        <span>واتساب</span>
                    </a>
                    <a href="https://t.me/your_username" target="_blank" class="chatbot-action telegram">
                        <i class="fab fa-telegram"></i>
                        <span>تلجرام</span>
                    </a>
                </div>
            </div>
            <button class="chatbot-btn" id="chatbotBtn" aria-label="خدمة العملاء">
                <i class="fas fa-robot"></i>
            </button>
        </div>
    `;

    // Insert into body
    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // Elements
    const btn = document.getElementById('chatbotBtn');
    const popup = document.getElementById('chatbotPopup');
    let isOpen = false;

    // Toggle popup
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        isOpen = !isOpen;
        popup.classList.toggle('active', isOpen);
        btn.classList.toggle('active', isOpen);

        // Change icon
        const icon = btn.querySelector('i');
        icon.className = isOpen ? 'fas fa-times' : 'fas fa-robot';
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
        if (isOpen && !e.target.closest('.chatbot-widget')) {
            isOpen = false;
            popup.classList.remove('active');
            btn.classList.remove('active');
            btn.querySelector('i').className = 'fas fa-robot';
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) {
            isOpen = false;
            popup.classList.remove('active');
            btn.classList.remove('active');
            btn.querySelector('i').className = 'fas fa-robot';
        }
    });

})();