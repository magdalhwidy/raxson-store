/* ============================================
   🎬 Animations JS - حركات التمرير والتفاعل
   ============================================
   يحتوي على: Scroll Reveal, Parallax, Counter Animation,
   Typewriter, Magnetic Buttons, Smooth Scroll
   ============================================ */

(function() {
    'use strict';

    // ─── Scroll Reveal ───
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');

                // Optional: Stop observing after reveal
                // revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // ─── Parallax Effect ───
    const parallaxElements = document.querySelectorAll('.parallax-layer');

    function handleParallax() {
        const scrollY = window.scrollY;

        parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.speed) || 0.5;
            const yPos = -(scrollY * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleParallax();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // ─── Counter Animation ───
    function animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);

            element.textContent = current.toLocaleString('ar-SA');

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // Observe counter elements
    const counterElements = document.querySelectorAll('[data-counter]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.counter);
                const duration = parseInt(entry.target.dataset.duration) || 2000;
                animateCounter(entry.target, target, duration);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counterElements.forEach(el => counterObserver.observe(el));

    // ─── Typewriter Effect ───
    class Typewriter {
        constructor(element, options = {}) {
            this.element = element;
            this.text = element.textContent;
            this.speed = options.speed || 100;
            this.delay = options.delay || 0;
            this.cursor = options.cursor !== false;
            this.index = 0;

            element.textContent = '';
            element.style.visibility = 'visible';

            if (this.cursor) {
                this.cursorSpan = document.createElement('span');
                this.cursorSpan.className = 'typewriter-cursor';
                this.cursorSpan.textContent = '|';
                element.appendChild(this.cursorSpan);
            }

            setTimeout(() => this.type(), this.delay);
        }

        type() {
            if (this.index < this.text.length) {
                if (this.cursor) {
                    this.element.insertBefore(
                        document.createTextNode(this.text.charAt(this.index)),
                        this.cursorSpan
                    );
                } else {
                    this.element.textContent += this.text.charAt(this.index);
                }

                this.index++;
                setTimeout(() => this.type(), this.speed);
            } else {
                if (this.cursor) {
                    this.cursorSpan.style.animation = 'blink 1s infinite';
                }
            }
        }
    }

    // Initialize typewriters
    document.querySelectorAll('.typewriter').forEach(el => {
        new Typewriter(el, {
            speed: parseInt(el.dataset.speed) || 100,
            delay: parseInt(el.dataset.delay) || 0,
            cursor: el.dataset.cursor !== 'false'
        });
    });

    // ─── Magnetic Buttons ───
    const magneticElements = document.querySelectorAll('.magnetic');

    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
        });
    });

    // ─── Smooth Scroll for Anchor Links ───
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ─── Header Scroll Effect ───
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        // Add/remove scrolled class
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll direction
        if (currentScroll > lastScroll && currentScroll > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    }, { passive: true });

    // ─── 3D Tilt Effect for Cards ───
    const tiltCards = document.querySelectorAll('.card-3d-tilt');

    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });

    // ─── Stagger Animation for Lists ───
    function staggerAnimate(container, childSelector, delay = 100) {
        const children = container.querySelectorAll(childSelector);
        children.forEach((child, index) => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';

            setTimeout(() => {
                child.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, index * delay);
        });
    }

    // Observe stagger containers
    const staggerContainers = document.querySelectorAll('[data-stagger]');

    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.stagger) || 100;
                const selector = entry.target.dataset.staggerChild || ':scope > *';
                staggerAnimate(entry.target, selector, delay);
                staggerObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    staggerContainers.forEach(el => staggerObserver.observe(el));

    // ─── Glow Follow Mouse ───
    const glowElements = document.querySelectorAll('.glow-follow');

    glowElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            el.style.setProperty('--glow-x', `${x}%`);
            el.style.setProperty('--glow-y', `${y}%`);
        });
    });

    // ─── Text Scramble Effect ───
    class TextScramble {
        constructor(el) {
            this.el = el;
            this.chars = '!<>-_\/[]{}—=+*^?#________';
            this.update = this.update.bind(this);
        }

        setText(newText) {
            const oldText = this.el.innerText;
            const length = Math.max(oldText.length, newText.length);
            const promise = new Promise((resolve) => this.resolve = resolve);

            this.queue = [];
            for (let i = 0; i < length; i++) {
                const from = oldText[i] || '';
                const to = newText[i] || '';
                const start = Math.floor(Math.random() * 40);
                const end = start + Math.floor(Math.random() * 40);
                this.queue.push({ from, to, start, end });
            }

            cancelAnimationFrame(this.frameRequest);
            this.frame = 0;
            this.update();
            return promise;
        }

        update() {
            let output = '';
            let complete = 0;

            for (let i = 0, n = this.queue.length; i < n; i++) {
                let { from, to, start, end, char } = this.queue[i];

                if (this.frame >= end) {
                    complete++;
                    output += to;
                } else if (this.frame >= start) {
                    if (!char || Math.random() < 0.28) {
                        char = this.randomChar();
                        this.queue[i].char = char;
                    }
                    output += `<span class="scramble-char">${char}</span>`;
                } else {
                    output += from;
                }
            }

            this.el.innerHTML = output;

            if (complete === this.queue.length) {
                this.resolve();
            } else {
                this.frameRequest = requestAnimationFrame(this.update);
                this.frame++;
            }
        }

        randomChar() {
            return this.chars[Math.floor(Math.random() * this.chars.length)];
        }
    }

    // Initialize scramble on hover
    document.querySelectorAll('[data-scramble]').forEach(el => {
        const fx = new TextScramble(el);
        const originalText = el.innerText;

        el.addEventListener('mouseenter', () => {
            fx.setText(el.dataset.scramble || originalText);
        });
    });

    // ─── Confetti Effect ───
    function createConfetti(options = {}) {
        const {
            count = 50,
            colors = ['#7B49FF', '#FF2C79', '#00FFD0', '#FFB800'],
            duration = 3000
        } = options;

        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
        `;
        document.body.appendChild(container);

        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 10 + 5;
            const left = Math.random() * 100;
            const delay = Math.random() * duration;

            confetti.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                left: ${left}%;
                top: -20px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                animation: confetti-fall ${duration}ms ease-in forwards;
                animation-delay: ${delay}ms;
                transform: rotate(${Math.random() * 360}deg);
            `;

            container.appendChild(confetti);
        }

        setTimeout(() => container.remove(), duration + 1000);
    }

    // Export confetti
    window.createConfetti = createConfetti;

    // ─── Ripple Effect ───
    function createRipple(e, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple-effect 0.6s ease-out;
            pointer-events: none;
        `;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    // Add ripple to buttons
    document.querySelectorAll('.btn, .btn-add-cart, .btn-checkout').forEach(btn => {
        btn.addEventListener('click', (e) => createRipple(e, btn));
    });

    // ─── Cursor Follower ───
    const cursor = document.querySelector('.custom-cursor');

    if (cursor && window.matchMedia('(pointer: fine)').matches) {
        let cursorX = 0, cursorY = 0;
        let currentX = 0, currentY = 0;

        document.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
        });

        function animateCursor() {
            currentX += (cursorX - currentX) * 0.1;
            currentY += (cursorY - currentY) * 0.1;

            cursor.style.transform = `translate(${currentX}px, ${currentY}px)`;
            requestAnimationFrame(animateCursor);
        }

        animateCursor();
    }

    // ─── Loading Animation ───
    window.showLoading = function(element) {
        element.classList.add('loading');
        element.disabled = true;
    };

    window.hideLoading = function(element) {
        element.classList.remove('loading');
        element.disabled = false;
    };

    // ─── Scroll Progress Bar ───
    const progressBar = document.querySelector('.scroll-progress');

    if (progressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / docHeight) * 100;
            progressBar.style.width = `${progress}%`;
        }, { passive: true });
    }

    // ─── Reveal on Load ───
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');

        // Trigger hero animations
        const heroWords = document.querySelectorAll('.hero-title-word');
        heroWords.forEach((word, index) => {
            setTimeout(() => {
                word.style.opacity = '1';
                word.style.transform = 'translateY(0)';
            }, 200 * (index + 1));
        });
    });

})();

// ─── CSS for Typewriter Cursor ───
const typewriterCSS = `
    .typewriter-cursor {
        display: inline;
        color: var(--color-accent);
        font-weight: 100;
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }

    @keyframes confetti-fall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }

    @keyframes ripple-effect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .scramble-char {
        color: var(--color-primary);
    }

    .loaded .hero-title-word {
        transition: opacity 0.8s ease, transform 0.8s ease;
    }
`;

const style = document.createElement('style');
style.textContent = typewriterCSS;
document.head.appendChild(style);
