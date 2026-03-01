/* ============================================
   Mission Control - Shared App Logic
   Sidebar nav, mobile menu, page init, utils
   ============================================ */

(function () {
    'use strict';

    // ── Sidebar Navigation ──
    const sidebar = document.querySelector('.mc-sidebar');
    const overlay = document.querySelector('.mc-sidebar-overlay');
    const toggle = document.querySelector('.mc-mobile-toggle');

    if (toggle && sidebar && overlay) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });

        // Close sidebar on link click (mobile)
        sidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });
        });
    }

    // ── In-page Tabs ──
    document.querySelectorAll('.mc-tabs').forEach(tabGroup => {
        const tabs = tabGroup.querySelectorAll('.mc-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const parent = tabGroup.closest('.mc-card') || tabGroup.parentElement;
                parent.querySelectorAll('.mc-tab-content').forEach(c => c.classList.remove('active'));
                const targetEl = parent.querySelector(`#${target}`);
                if (targetEl) targetEl.classList.add('active');
            });
        });
    });

    // ── Modal helpers ──
    window.mcOpenModal = function (id) {
        const modal = document.getElementById('modal-' + id);
        if (modal) modal.classList.add('active');
    };

    window.mcCloseModal = function (id) {
        const modal = document.getElementById('modal-' + id);
        if (modal) modal.classList.remove('active');
    };

    // Close modal on overlay click
    document.querySelectorAll('.mc-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    // ── Toast Notifications ──
    window.mcToast = function (message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `mc-toast mc-toast-${type}`;
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            padding: 12px 20px; border-radius: 8px; font-size: 0.8rem;
            font-weight: 500; animation: slideIn 0.3s ease;
            max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        `;

        if (type === 'success') {
            toast.style.background = 'rgba(34, 197, 94, 0.15)';
            toast.style.border = '1px solid rgba(34, 197, 94, 0.3)';
            toast.style.color = '#22c55e';
        } else if (type === 'error') {
            toast.style.background = 'rgba(239, 68, 68, 0.15)';
            toast.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            toast.style.color = '#ef4444';
        } else {
            toast.style.background = 'rgba(201, 162, 39, 0.15)';
            toast.style.border = '1px solid rgba(201, 162, 39, 0.3)';
            toast.style.color = '#c9a227';
        }

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // ── Utility: Format Date ──
    window.mcFormatDate = function (dateStr) {
        if (!dateStr) return 'TBD';
        const d = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };

    window.mcFormatShortDate = function (dateStr) {
        if (!dateStr) return { day: '--', month: 'TBD' };
        const d = new Date(dateStr + 'T00:00:00');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return { day: d.getDate(), month: months[d.getMonth()] };
    };

    // ── Utility: Time Ago ──
    window.mcTimeAgo = function (dateStr) {
        const now = new Date();
        const d = new Date(dateStr);
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return mcFormatDate(dateStr);
    };

    // ── Script option selection ──
    window.selectOption = function (element) {
        const siblings = element.parentElement.querySelectorAll('.script-option');
        siblings.forEach(s => s.classList.remove('selected'));
        element.classList.add('selected');
    };

    // ── Inject global animation keyframes ──
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

})();

// ── Theme Management ──
(function initTheme() {
    const saved = localStorage.getItem('mc-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton(saved);
})();

function updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.innerHTML = theme === 'dark'
            ? '<span class="toggle-icon">&#9728;&#65039;</span> Light Mode'
            : '<span class="toggle-icon">&#127769;</span> Dark Mode';
    }
}

window.mcToggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mc-theme', next);
    updateThemeButton(next);
};
