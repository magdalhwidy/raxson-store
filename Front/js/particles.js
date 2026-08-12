/* ============================================
   ✨ Particles JS - خلفية الجسيمات المتحركة
   ============================================
   جسيمات ملونة تتحرك وتتفاعل مع الماوس
   ============================================ */

(function() {
    'use strict';

    // ─── Configuration ───
    const CONFIG = {
        particleCount: 80,
        particleColor: ['#7B49FF', '#FF2C79', '#00FFD0'],
        particleSize: {
            min: 2,
            max: 5
        },
        particleSpeed: {
            min: 0.2,
            max: 0.8
        },
        connectionDistance: 150,
        connectionOpacity: 0.15,
        mouseDistance: 200,
        mouseForce: 0.02
    };

    // ─── Canvas Setup ───
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId = null;
    let mouse = { x: null, y: null };
    let isActive = true;

    // ─── Resize Handler ───
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // ─── Particle Class ───
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min) + CONFIG.particleSize.min;
            this.speedX = (Math.random() - 0.5) * (Math.random() * (CONFIG.particleSpeed.max - CONFIG.particleSpeed.min) + CONFIG.particleSpeed.min);
            this.speedY = (Math.random() - 0.5) * (Math.random() * (CONFIG.particleSpeed.max - CONFIG.particleSpeed.min) + CONFIG.particleSpeed.min);
            this.color = CONFIG.particleColor[Math.floor(Math.random() * CONFIG.particleColor.length)];
            this.opacity = Math.random() * 0.5 + 0.3;
            this.glowSize = this.size * 2;
        }

        update() {
            // Move particle
            this.x += this.speedX;
            this.y += this.speedY;

            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.mouseDistance) {
                    const force = (CONFIG.mouseDistance - distance) / CONFIG.mouseDistance;
                    this.speedX += dx * force * CONFIG.mouseForce;
                    this.speedY += dy * force * CONFIG.mouseForce;
                }
            }

            // Speed limit
            const maxSpeed = 2;
            this.speedX = Math.max(-maxSpeed, Math.min(maxSpeed, this.speedX));
            this.speedY = Math.max(-maxSpeed, Math.min(maxSpeed, this.speedY));

            // Bounce off edges
            if (this.x < 0 || this.x > canvas.width) {
                this.speedX *= -1;
                this.x = Math.max(0, Math.min(canvas.width, this.x));
            }
            if (this.y < 0 || this.y > canvas.height) {
                this.speedY *= -1;
                this.y = Math.max(0, Math.min(canvas.height, this.y));
            }
        }

        draw() {
            // Glow effect
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.glowSize, 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace(')', `, ${this.opacity * 0.1})`).replace('rgb', 'rgba');
            ctx.fill();

            // Main particle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace(')', `, ${this.opacity})`).replace('rgb', 'rgba');
            ctx.fill();
        }
    }

    // ─── Initialize Particles ───
    function init() {
        particles = [];
        const count = window.innerWidth < 768 ? 40 : CONFIG.particleCount;

        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    // ─── Draw Connections ───
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.connectionDistance) {
                    const opacity = (1 - distance / CONFIG.connectionDistance) * CONFIG.connectionOpacity;

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(123, 73, 255, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
    }

    // ─── Animation Loop ───
    function animate() {
        if (!isActive) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        drawConnections();

        animationId = requestAnimationFrame(animate);
    }

    // ─── Mouse Events ───
    function handleMouseMove(e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }

    function handleMouseLeave() {
        mouse.x = null;
        mouse.y = null;
    }

    // ─── Visibility Handler ───
    function handleVisibility() {
        if (document.hidden) {
            isActive = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        } else {
            isActive = true;
            animate();
        }
    }

    // ─── Touch Events (Mobile) ───
    function handleTouchMove(e) {
        if (e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    }

    function handleTouchEnd() {
        mouse.x = null;
        mouse.y = null;
    }

    // ─── Event Listeners ───
    window.addEventListener('resize', () => {
        resize();
        init();
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('visibilitychange', handleVisibility);

    // ─── Initialize ───
    resize();
    init();
    animate();

    // ─── Export for external control ───
    window.particlesSystem = {
        pause: () => { isActive = false; },
        resume: () => { 
            isActive = true; 
            animate(); 
        },
        destroy: () => {
            isActive = false;
            if (animationId) cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('visibilitychange', handleVisibility);
        }
    };
})();
