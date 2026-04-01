export function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        const icons = { success: '✓', error: '✕', warning: '⚠' };
        toast.innerHTML = '<span class="icon">' + (icons[type] || '•') + '</span><span class="text">' + message + '</span>';
        container.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideIn .3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 4000);
    }