// نظام تحسين التصميم والألوان والأنيميشن
class DesignManager {
  constructor() {
    this.themes = {
      dark: {
        primary: '#8B5CF6',
        secondary: '#6366F1',
        accent: '#10B981',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        border: '#334155',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      },
      light: {
        primary: '#3B82F6',
        secondary: '#1D4ED8',
        accent: '#059669',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1E293B',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB'
      },
      purple: {
        primary: '#8B5CF6',
        secondary: '#A855F7',
        accent: '#C084FC',
        background: '#1A0B2E',
        surface: '#2D1B69',
        text: '#F3E8FF',
        textSecondary: '#C4B5FD',
        border: '#4C1D95',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      },
      blue: {
        primary: '#3B82F6',
        secondary: '#1D4ED8',
        accent: '#60A5FA',
        background: '#0F172A',
        surface: '#1E3A8A',
        text: '#F0F9FF',
        textSecondary: '#93C5FD',
        border: '#1E40AF',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      },
      green: {
        primary: '#10B981',
        secondary: '#059669',
        accent: '#34D399',
        background: '#064E3B',
        surface: '#065F46',
        text: '#ECFDF5',
        textSecondary: '#A7F3D0',
        border: '#047857',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6'
      }
    };

    this.animations = {
      fadeIn: {
        from: { opacity: 0, transform: 'translateY(20px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
        duration: '0.6s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      slideIn: {
        from: { opacity: 0, transform: 'translateX(-30px)' },
        to: { opacity: 1, transform: 'translateX(0)' },
        duration: '0.5s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      scaleIn: {
        from: { opacity: 0, transform: 'scale(0.9)' },
        to: { opacity: 1, transform: 'scale(1)' },
        duration: '0.4s',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      bounce: {
        from: { transform: 'translateY(0)' },
        to: { transform: 'translateY(-10px)' },
        duration: '0.3s',
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      pulse: {
        from: { transform: 'scale(1)' },
        to: { transform: 'scale(1.05)' },
        duration: '0.2s',
        easing: 'ease-in-out'
      },
      glow: {
        from: { boxShadow: '0 0 5px rgba(139, 92, 246, 0.5)' },
        to: { boxShadow: '0 0 20px rgba(139, 92, 246, 0.8)' },
        duration: '0.5s',
        easing: 'ease-in-out'
      }
    };

    this.currentTheme = 'dark';
    this.init();
  }

  // تهيئة النظام
  init() {
    this.loadTheme();
    // إيقاف جميع الخدمات لتجنب المشاكل
    // this.setupThemeSwitcher(); // معطل
    // this.setupAnimations(); // معطل
    // this.setupColorPalette(); // معطل
    // this.setupIntersectionObserver(); // معطل
  }

  // تحميل الثيم
  loadTheme() {
    const savedTheme = localStorage.getItem('design_theme') || 'dark';
    this.setTheme(savedTheme);
  }

  // تطبيق الثيم
  setTheme(themeName) {
    if (!this.themes[themeName]) {
      console.warn(`الثيم ${themeName} غير موجود`);
      return;
    }

    this.currentTheme = themeName;
    const theme = this.themes[themeName];

    // تطبيق متغيرات CSS
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // إضافة class للثيم
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${themeName}`);

    // حفظ التفضيل
    localStorage.setItem('design_theme', themeName);

    // إشعار التغيير
    this.notifyThemeChange(themeName);
  }

  // إشعار تغيير الثيم
  notifyThemeChange(themeName) {
    const event = new CustomEvent('themeChanged', {
      detail: { theme: themeName, colors: this.themes[themeName] }
    });
    document.dispatchEvent(event);
  }

  // إعداد مبدل الثيم
  setupThemeSwitcher() {
    // إضافة أزرار تبديل الثيم
    this.createThemeSwitcher();
  }

  // إنشاء مبدل الثيم
  createThemeSwitcher() {
    const switcher = document.createElement('div');
    switcher.className = 'theme-switcher';
    switcher.innerHTML = `
      <div class="theme-switcher-content">
        <h3>اختر الثيم</h3>
        <div class="theme-options">
          ${Object.keys(this.themes).map(theme => `
            <button 
              class="theme-option ${theme === this.currentTheme ? 'active' : ''}" 
              data-theme="${theme}"
              style="background: ${this.themes[theme].primary}"
            >
              <div class="theme-preview" style="background: ${this.themes[theme].background}"></div>
              <span>${this.getThemeName(theme)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // إضافة المستمعين
    switcher.addEventListener('click', (e) => {
      const button = e.target.closest('.theme-option');
      if (button) {
        const theme = button.dataset.theme;
        this.setTheme(theme);
        
        // تحديث الأزرار النشطة
        switcher.querySelectorAll('.theme-option').forEach(btn => {
          btn.classList.remove('active');
        });
        button.classList.add('active');
      }
    });

    return switcher;
  }

  // الحصول على اسم الثيم
  getThemeName(theme) {
    const names = {
      dark: 'داكن',
      light: 'فاتح',
      purple: 'بنفسجي',
      blue: 'أزرق',
      green: 'أخضر'
    };
    return names[theme] || theme;
  }

  // إعداد الأنيميشن
  setupAnimations() {
    // إضافة CSS للأنيميشن
    this.injectAnimationCSS();
    
    // إعداد Intersection Observer للأنيميشن
    this.setupIntersectionObserver();
  }

  // حقن CSS للأنيميشن
  injectAnimationCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .animate-fade-in {
        animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .animate-slide-in {
        animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .animate-scale-in {
        animation: scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .animate-bounce {
        animation: bounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      .animate-pulse {
        animation: pulse 0.2s ease-in-out;
      }
      
      .animate-glow {
        animation: glow 0.5s ease-in-out;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }
      
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      
      @keyframes bounce {
        from { transform: translateY(0); }
        to { transform: translateY(-10px); }
      }
      
      @keyframes pulse {
        from { transform: scale(1); }
        to { transform: scale(1.05); }
      }
      
      @keyframes glow {
        from { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
        to { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8); }
      }
      
      .theme-switcher {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(20px);
      }
      
      .theme-switcher h3 {
        color: var(--color-text);
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 600;
      }
      
      .theme-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      
      .theme-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        border: 2px solid transparent;
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text);
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 12px;
      }
      
      .theme-option:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
      }
      
      .theme-option.active {
        border-color: var(--color-primary);
        box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
      }
      
      .theme-preview {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        margin-bottom: 4px;
        border: 1px solid var(--color-border);
      }
    `;
    
    document.head.appendChild(style);
  }

  // إعداد Intersection Observer
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      // تأخير بدء المراقبة لتجنب التحديثات المتكررة
      setTimeout(() => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target;
              const animation = element.dataset.animation || 'fade-in';
              // التحقق من أن العنصر لم يتم تحريكه من قبل
              if (!element.classList.contains('animation-applied')) {
                element.classList.add(`animate-${animation}`);
                element.classList.add('animation-applied');
                observer.unobserve(element);
              }
            }
          });
        }, {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        });

        // مراقب العناصر الجديدة - فقط للعناصر الجديدة
        const mutationObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains('animation-applied')) {
                const animatedElements = node.querySelectorAll ? node.querySelectorAll('[data-animation]:not(.animation-applied)') : [];
                animatedElements.forEach(element => observer.observe(element));
              }
            });
          });
        });

        // مراقبة فقط العناصر الجديدة المضافة
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        });
      }, 1000); // تأخير ثانية واحدة
    }
  }

  // إعداد لوحة الألوان
  setupColorPalette() {
    // إنشاء لوحة ألوان ديناميكية
    this.generateColorPalette();
  }

  // توليد لوحة ألوان
  generateColorPalette() {
    const palette = {};
    
    Object.entries(this.themes[this.currentTheme]).forEach(([key, color]) => {
      palette[key] = this.generateColorVariations(color);
    });

    return palette;
  }

  // توليد تباينات اللون
  generateColorVariations(baseColor) {
    const variations = {
      base: baseColor,
      light: this.lightenColor(baseColor, 20),
      lighter: this.lightenColor(baseColor, 40),
      dark: this.darkenColor(baseColor, 20),
      darker: this.darkenColor(baseColor, 40),
      alpha10: this.addAlpha(baseColor, 0.1),
      alpha20: this.addAlpha(baseColor, 0.2),
      alpha30: this.addAlpha(baseColor, 0.3),
      alpha50: this.addAlpha(baseColor, 0.5),
      alpha80: this.addAlpha(baseColor, 0.8)
    };

    return variations;
  }

  // تفتيح اللون
  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // تغميق اللون
  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  // إضافة الشفافية
  addAlpha(color, alpha) {
    const rgb = this.hexToRgb(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  // تحويل hex إلى rgb
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // إنشاء تدرج لوني
  createGradient(colors, direction = 'to right') {
    const gradient = colors.map((color, index) => {
      const percentage = (index / (colors.length - 1)) * 100;
      return `${color} ${percentage}%`;
    }).join(', ');

    return `linear-gradient(${direction}, ${gradient})`;
  }

  // تحسين الخطوط
  optimizeFonts() {
    // تحميل الخطوط المحسنة
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // تطبيق الخطوط المحسنة
    const style = document.createElement('style');
    style.textContent = `
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .font-display {
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
      }
      
      .font-mono {
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      }
    `;
    document.head.appendChild(style);
  }

  // تحسين الأيقونات
  optimizeIcons() {
    // إضافة أيقونات محسنة
    const iconStyle = document.createElement('style');
    iconStyle.textContent = `
      .icon-enhanced {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        transition: all 0.3s ease;
      }
      
      .icon-enhanced:hover {
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        transform: scale(1.1);
      }
      
      .icon-glow {
        filter: drop-shadow(0 0 10px var(--color-primary));
      }
      
      .icon-pulse {
        animation: iconPulse 2s ease-in-out infinite;
      }
      
      @keyframes iconPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `;
    document.head.appendChild(iconStyle);
  }

  // إنشاء تأثيرات بصرية متقدمة
  createAdvancedEffects() {
    const effectsStyle = document.createElement('style');
    effectsStyle.textContent = `
      .glass-effect {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      
      .neon-effect {
        box-shadow: 
          0 0 5px var(--color-primary),
          0 0 10px var(--color-primary),
          0 0 15px var(--color-primary),
          0 0 20px var(--color-primary);
      }
      
      .holographic-effect {
        background: linear-gradient(45deg, 
          var(--color-primary), 
          var(--color-secondary), 
          var(--color-accent), 
          var(--color-primary));
        background-size: 400% 400%;
        animation: holographic 3s ease infinite;
      }
      
      @keyframes holographic {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .particle-effect {
        position: relative;
        overflow: hidden;
      }
      
      .particle-effect::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(255, 255, 255, 0.2), 
          transparent);
        animation: particle 2s linear infinite;
      }
      
      @keyframes particle {
        0% { left: -100%; }
        100% { left: 100%; }
      }
    `;
    document.head.appendChild(effectsStyle);
  }

  // الحصول على إحصائيات التصميم
  getDesignStats() {
    return {
      currentTheme: this.currentTheme,
      availableThemes: Object.keys(this.themes),
      animations: Object.keys(this.animations),
      colorPalette: this.generateColorPalette()
    };
  }
}

// إنشاء instance واحد للتصميم
export const designManager = new DesignManager();

// دوال مساعدة
export const design = {
  setTheme: (theme) => designManager.setTheme(theme),
  getTheme: () => designManager.currentTheme,
  getThemes: () => Object.keys(designManager.themes),
  createGradient: (colors, direction) => designManager.createGradient(colors, direction),
  lightenColor: (color, percent) => designManager.lightenColor(color, percent),
  darkenColor: (color, percent) => designManager.darkenColor(color, percent),
  addAlpha: (color, alpha) => designManager.addAlpha(color, alpha),
  stats: () => designManager.getDesignStats()
};
