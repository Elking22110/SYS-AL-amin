// دالة لتعديل اللون (تفتيح أو تظليل)
export const adjustColor = (color, amount) => {
    if (!color) return "#8B5CF6";
    try {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * amount);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    } catch (e) {
        return color;
    }
};

// تطبيق المظهر
export const applyTheme = (theme) => {
    const root = document.documentElement;

    if (theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
        // تطبيق متغيرات CSS للوضع الفاتح
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-secondary', '#f8fafc');
        root.style.setProperty('--text-primary', '#1f2937');
        root.style.setProperty('--text-secondary', '#6b7280');
    } else {
        root.classList.remove('light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        // تطبيق متغيرات CSS للوضع الداكن
        root.style.setProperty('--bg-primary', '#0f172a');
        root.style.setProperty('--bg-secondary', '#1e293b');
        root.style.setProperty('--text-primary', '#f1f5f9');
        root.style.setProperty('--text-secondary', '#94a3b8');
    }
};

// تطبيق اللون الأساسي
export const applyPrimaryColor = (color) => {
    if (!color) return;
    const root = document.documentElement;

    // تطبيق متغيرات CSS الجذرية
    root.style.setProperty('--primary-color', color);
    root.style.setProperty('--primary-500', color);
    root.style.setProperty('--primary-600', adjustColor(color, -20));
    root.style.setProperty('--primary-400', adjustColor(color, 20));
    root.style.setProperty('--primary-300', adjustColor(color, 40));
    root.style.setProperty('--primary-200', adjustColor(color, 60));
    root.style.setProperty('--primary-100', adjustColor(color, 80));

    // تطبيق اللون على العناصر المختلفة
    const primaryElements = document.querySelectorAll('.bg-purple-500, .text-purple-500, .border-purple-500, .bg-purple-600, .text-purple-600, .border-purple-600');
    primaryElements.forEach(element => {
        if (element.classList.contains('bg-purple-500') || element.classList.contains('bg-purple-600')) {
            element.style.setProperty('background-color', color);
        }
        if (element.classList.contains('text-purple-500') || element.classList.contains('text-purple-600')) {
            element.style.setProperty('color', color);
        }
        if (element.classList.contains('border-purple-500') || element.classList.contains('border-purple-600')) {
            element.style.setProperty('border-color', color);
        }
    });

    // تطبيق اللون على الأزرار
    const buttons = document.querySelectorAll('.btn-primary, .bg-purple-500, .bg-purple-600');
    buttons.forEach(button => {
        button.style.setProperty('background-color', color);
        button.style.setProperty('border-color', color);
    });

    // تطبيق اللون على الروابط
    const links = document.querySelectorAll('.text-purple-500, .text-purple-600');
    links.forEach(link => {
        link.style.setProperty('color', color);
    });
};

// تهيئة الثيم عند بدء التشغيل
export const initTheme = () => {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('pos-settings') || '{}');
        const theme = savedSettings.theme || 'light';
        const primaryColor = savedSettings.primaryColor || '#8B5CF6';

        applyTheme(theme);
        applyPrimaryColor(primaryColor);

        if (savedSettings.sidebarCollapsed !== undefined) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                if (savedSettings.sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                }
            }
        }

        // إضافة الإعدادات إلى document.documentElement للاستمرارية
        document.documentElement.setAttribute('data-theme', theme);
    } catch (error) {
        console.error('Error initializing theme:', error);
    }
};
