/**
 * نظام إدارة الأصوات - MS GROUP
 * يتعامل مع تشغيل الأصوات بأداء عالٍ باستخدام Audio API
 */

class SoundManager {
  constructor() {
    this.sounds = {};
    this.isEnabled = true;
    this.volume = 0.7;
    this.initializeSounds();
  }

  // تهيئة الأصوات باستخدام Web Audio API
  initializeSounds() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.createSounds();
    } catch (error) {
      console.warn('Web Audio API غير مدعوم، سيتم استخدام أصوات بديلة');
      this.createFallbackSounds();
    }
  }

  // تشغيل نغمة مخصصة بمغلف صوتي دقيق (ADSR Envelope)
  playTone({ frequency, duration, type = 'sine', attack = 0.01, decay = 0.1, gainMult = 0.3, delay = 0 }) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime + delay;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.type = type;

      const maxVolume = this.volume * gainMult;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(maxVolume, now + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration + 0.1);
    } catch (e) {
      console.warn('فشل تشغيل النغمة:', e);
    }
  }

  // تشغيل نغمة متغيرة التردد (Frequency Sweep)
  playSweep({ startFreq, endFreq, duration, type = 'sine', gainMult = 0.3, delay = 0 }) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime + delay;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFreq, now);
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      const maxVolume = this.volume * gainMult;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(maxVolume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration + 0.1);
    } catch (e) {
      console.warn('فشل تشغيل تردد متحرك:', e);
    }
  }

  // إنشاء الأصوات باستخدام Web Audio API المطور والفاخر
  createSounds() {
    // 1. صوت النقر الناعم الكلاسيكي (Soft Cozy Click)
    this.sounds.click = () => {
      this.playTone({ frequency: 900, duration: 0.04, type: 'sine', attack: 0.002, decay: 0.038, gainMult: 0.45 });
    };

    // 2. صوت النجاح الكريستالي الصاعد (Crystal Ascending Chime)
    this.sounds.success = () => {
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major Chord
      freqs.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 0.6, 
          type: 'sine', 
          attack: 0.05, 
          decay: 0.5, 
          gainMult: 0.35, 
          delay: idx * 0.06 
        });
      });
    };

    // 3. صوت الخطأ / التنبيه الناعم (Soft Double Warning)
    this.sounds.error = () => {
      this.playTone({ frequency: 220, duration: 0.25, type: 'triangle', attack: 0.02, decay: 0.23, gainMult: 0.5 });
      this.playTone({ frequency: 180, duration: 0.25, type: 'sine', attack: 0.02, decay: 0.23, gainMult: 0.5, delay: 0.05 });
    };

    // 4. صوت إضافة منتج (Bubble Pop / Plop)
    this.sounds.addProduct = () => {
      this.playTone({ frequency: 600, duration: 0.08, type: 'sine', attack: 0.005, decay: 0.075, gainMult: 0.45 });
      this.playTone({ frequency: 900, duration: 0.08, type: 'sine', attack: 0.005, decay: 0.075, gainMult: 0.35, delay: 0.04 });
    };

    // 5. صوت حذف منتج (Descending Pop)
    this.sounds.removeProduct = () => {
      this.playTone({ frequency: 800, duration: 0.1, type: 'sine', attack: 0.005, decay: 0.095, gainMult: 0.35 });
      this.playTone({ frequency: 500, duration: 0.1, type: 'sine', attack: 0.005, decay: 0.095, gainMult: 0.4, delay: 0.04 });
    };

    // 6. صوت بدء الوردية (Warm Rising Synth)
    this.sounds.startShift = () => {
      const freqs = [329.63, 392.00, 523.25, 659.25]; // E-G-C-E chord
      freqs.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 0.8, 
          type: 'sine', 
          attack: 0.1, 
          decay: 0.7, 
          gainMult: 0.3, 
          delay: idx * 0.08 
        });
      });
    };

    // 7. ... صوت إنهاء الوردية (Warm Descending Synth)
    this.sounds.endShift = () => {
      const freqs = [659.25, 523.25, 392.00, 329.63];
      freqs.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 0.8, 
          type: 'sine', 
          attack: 0.1, 
          decay: 0.7, 
          gainMult: 0.3, 
          delay: idx * 0.08 
        });
      });
    };

    // 8. صوت طباعة الفاتورة (Fast Mechanical Whir)
    this.sounds.print = () => {
      this.playTone({ frequency: 1000, duration: 0.05, type: 'triangle', attack: 0.005, decay: 0.045, gainMult: 0.25 });
      this.playTone({ frequency: 800, duration: 0.05, type: 'triangle', attack: 0.005, decay: 0.045, gainMult: 0.25, delay: 0.05 });
      this.playTone({ frequency: 1200, duration: 0.05, type: 'triangle', attack: 0.005, decay: 0.045, gainMult: 0.2, delay: 0.1 });
    };

    // 9. صوت فتح وإغلاق النوافذ (Cozy Sweeps)
    this.sounds.openWindow = () => {
      this.playSweep({ startFreq: 400, endFreq: 700, duration: 0.15, type: 'sine', gainMult: 0.3 });
    };
    this.sounds.closeWindow = () => {
      this.playSweep({ startFreq: 700, endFreq: 400, duration: 0.15, type: 'sine', gainMult: 0.3 });
    };

    // 10. صوت الحفظ (Sparkling Chime)
    this.sounds.save = () => {
      this.playTone({ frequency: 880, duration: 0.15, type: 'sine', attack: 0.01, decay: 0.14, gainMult: 0.4 });
      this.playTone({ frequency: 1318.51, duration: 0.2, type: 'sine', attack: 0.01, decay: 0.19, gainMult: 0.3, delay: 0.05 });
    };

    // 11. صوت التحديث (Pleasant Double Beep)
    this.sounds.update = () => {
      this.playTone({ frequency: 880, duration: 0.08, type: 'sine', attack: 0.005, decay: 0.075, gainMult: 0.4 });
      this.playTone({ frequency: 880, duration: 0.08, type: 'sine', attack: 0.005, decay: 0.075, gainMult: 0.4, delay: 0.08 });
    };

    // 12. صوت الحذف والتخلص (Soft Downward Pop)
    this.sounds.delete = () => {
      this.playTone({ frequency: 400, duration: 0.18, type: 'triangle', attack: 0.01, decay: 0.17, gainMult: 0.4 });
      this.playTone({ frequency: 200, duration: 0.18, type: 'sine', attack: 0.01, decay: 0.17, gainMult: 0.45, delay: 0.05 });
    };

    // 13. صوت الإشعارات والتنبيهات (Ambient Bell)
    this.sounds.notification = () => {
      this.playTone({ frequency: 783.99, duration: 0.4, type: 'sine', attack: 0.02, decay: 0.38, gainMult: 0.4 });
      this.playTone({ frequency: 987.77, duration: 0.4, type: 'sine', attack: 0.02, decay: 0.38, gainMult: 0.35, delay: 0.04 });
    };

    // 14. صوت التحذير (Soft Warning Bell)
    this.sounds.warning = () => {
      this.playTone({ frequency: 330, duration: 0.3, type: 'sine', attack: 0.05, decay: 0.25, gainMult: 0.45 });
      this.playTone({ frequency: 330, duration: 0.3, type: 'triangle', attack: 0.05, decay: 0.25, gainMult: 0.25, delay: 0.08 });
    };

    // 15. صوت كاش النقدي - صندوق النقود والعملات المعدنية (Realistic Ka-Ching & Coin Rattle)
    this.sounds.cash = () => {
      // أ) رنين جرس الصندوق الميكانيكي الحاد (Ka-Ching Bell)
      const bellFreqs = [880, 1174.66, 1396.91, 1760]; // رنين ساطع
      bellFreqs.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 0.8, 
          type: 'sine', 
          attack: 0.005, 
          decay: 0.75, 
          gainMult: 0.55, // صوت أعلى ومسموع بوضوح
          delay: idx * 0.02 
        });
      });

      // ب) الطقة الميكانيكية لفتح الدرج (Mechanical Click)
      this.playTone({ frequency: 150, duration: 0.15, type: 'triangle', attack: 0.01, decay: 0.14, gainMult: 0.6 });
      this.playTone({ frequency: 180, duration: 0.15, type: 'square', attack: 0.01, decay: 0.14, gainMult: 0.2, delay: 0.02 });

      // ج) خشخشة وتصادم العملات المعدنية داخل الدرج (Coin Rattle)
      const coinDelays = [0.05, 0.08, 0.12, 0.15, 0.18];
      const coinFreqs = [2800, 3200, 2500, 3000, 3500];
      coinDelays.forEach((d, idx) => {
        this.playTone({ 
          frequency: coinFreqs[idx], 
          duration: 0.03, 
          type: 'sine', 
          attack: 0.001, 
          decay: 0.029, 
          gainMult: 0.45, 
          delay: d 
        });
      });
    };

    // 16. صوت الدفع الإلكتروني بالبطاقة (Digital Payment Swipe)
    this.sounds.card = () => {
      this.playSweep({ startFreq: 600, endFreq: 1200, duration: 0.2, type: 'sine', gainMult: 0.45 });
    };

    // 17. صوت الخصم (Cozy Slide Down)
    this.sounds.discount = () => {
      this.playSweep({ startFreq: 900, endFreq: 700, duration: 0.25, type: 'sine', gainMult: 0.45 });
    };

    // 18. صوت العربون (Bell Accent)
    this.sounds.downPayment = () => {
      this.playTone({ frequency: 587.33, duration: 0.2, type: 'sine', attack: 0.01, decay: 0.19, gainMult: 0.45 });
      this.playTone({ frequency: 880, duration: 0.3, type: 'sine', attack: 0.01, decay: 0.29, gainMult: 0.4, delay: 0.06 });
    };

    // 19. صوت المرتجع (Warning Sweep Down)
    this.sounds.return = () => {
      this.playSweep({ startFreq: 500, endFreq: 300, duration: 0.3, type: 'triangle', gainMult: 0.45 });
    };
    this.sounds.refund = () => {
      this.playSweep({ startFreq: 400, endFreq: 250, duration: 0.3, type: 'triangle', gainMult: 0.45 });
    };

    // 20. صوت تسجيل الدخول (Premium Startup Chime)
    this.sounds.login = () => {
      const chord = [261.63, 329.63, 392.00, 523.25, 659.25];
      chord.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 1.2, 
          type: 'sine', 
          attack: 0.15, 
          decay: 1.0, 
          gainMult: 0.2, 
          delay: idx * 0.08 
        });
      });
    };

    // 21. ... صوت تسجيل الخروج (Premium Shutdown Chime)
    this.sounds.logout = () => {
      const chord = [659.25, 523.25, 392.00, 329.63, 261.63];
      chord.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 1.2, 
          type: 'sine', 
          attack: 0.15, 
          decay: 1.0, 
          gainMult: 0.2, 
          delay: idx * 0.08 
        });
      });
    };

    this.sounds.loading = () => {
      this.playTone({ frequency: 600, duration: 0.05, type: 'sine', attack: 0.005, decay: 0.045, gainMult: 0.2 });
    };

    this.sounds.complete = () => {
      const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chord.forEach((f, idx) => {
        this.playTone({ 
          frequency: f, 
          duration: 1.0, 
          type: 'sine', 
          attack: 0.08, 
          decay: 0.9, 
          gainMult: 0.25, 
          delay: idx * 0.05 
        });
      });
    };
  }

  // إنشاء أصوات بديلة باستخدام HTML5 Audio
  createFallbackSounds() {
    // إنشاء أصوات بسيطة باستخدام البيانات المدمجة
    this.sounds.click = () => this.playFallbackSound(800, 0.1);
    this.sounds.success = () => this.playFallbackSound(600, 0.3);
    this.sounds.error = () => this.playFallbackSound(200, 0.5);
    this.sounds.addProduct = () => this.playFallbackSound(600, 0.15);
    this.sounds.removeProduct = () => this.playFallbackSound(400, 0.2);
    this.sounds.startShift = () => this.playFallbackSound(500, 0.4);
    this.sounds.endShift = () => this.playFallbackSound(400, 0.5);
    this.sounds.print = () => this.playFallbackSound(1000, 0.1);
    this.sounds.openWindow = () => this.playFallbackSound(700, 0.2);
    this.sounds.closeWindow = () => this.playFallbackSound(500, 0.2);
    this.sounds.save = () => this.playFallbackSound(600, 0.25);
    this.sounds.update = () => this.playFallbackSound(800, 0.15);
    this.sounds.delete = () => this.playFallbackSound(300, 0.3);
    this.sounds.notification = () => this.playFallbackSound(800, 0.2);
    this.sounds.warning = () => this.playFallbackSound(400, 0.4);
    this.sounds.cash = () => this.playFallbackSound(600, 0.3);
    this.sounds.card = () => this.playFallbackSound(1000, 0.2);
    this.sounds.discount = () => this.playFallbackSound(600, 0.25);
    this.sounds.downPayment = () => this.playFallbackSound(500, 0.3);
    this.sounds.refund = () => this.playFallbackSound(200, 0.4);
    this.sounds.login = () => this.playFallbackSound(500, 0.4);
    this.sounds.logout = () => this.playFallbackSound(400, 0.4);
    this.sounds.loading = () => this.playFallbackSound(800, 0.1);
    this.sounds.complete = () => this.playFallbackSound(600, 0.5);
  }

  // تشغيل صوت بديل
  playFallbackSound(frequency, duration) {
    if (!this.isEnabled) return;

    try {
      // إنشاء صوت باستخدام Web Audio API مبسط
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('لا يمكن تشغيل الصوت:', error);
    }
  }

  // تحميل إعدادات الأصوات من Settings
  getSettings() {
    try {
      const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
      return {
        soundsEnabled: savedSettings.soundsEnabled !== undefined ? savedSettings.soundsEnabled : true,
        soundVolume: savedSettings.soundVolume !== undefined ? savedSettings.soundVolume : 0.7,
        clickSounds: savedSettings.clickSounds !== undefined ? savedSettings.clickSounds : true,
        notificationSounds: savedSettings.notificationSounds !== undefined ? savedSettings.notificationSounds : true,
        systemSounds: savedSettings.systemSounds !== undefined ? savedSettings.systemSounds : true
      };
    } catch (error) {
      console.warn('خطأ في تحميل إعدادات الأصوات:', error);
      return {
        soundsEnabled: true,
        soundVolume: 0.7,
        clickSounds: true,
        notificationSounds: true,
        systemSounds: true
      };
    }
  }

  // تحديد نوع الصوت
  getSoundType(soundName) {
    const clickSounds = ['click', 'downPayment', 'cash', 'card'];
    const notificationSounds = ['success', 'error', 'warning', 'notification'];
    const systemSounds = ['startShift', 'endShift', 'login', 'logout', 'addProduct', 'removeProduct', 'complete', 'print', 'openWindow', 'closeWindow', 'delete', 'update', 'discount', 'refund', 'save', 'loading'];

    if (clickSounds.includes(soundName)) return 'click';
    if (notificationSounds.includes(soundName)) return 'notification';
    if (systemSounds.includes(soundName)) return 'system';
    return 'system'; // افتراضي
  }

  // تشغيل صوت
  play(soundName) {
    const settings = this.getSettings();

    // التحقق من تفعيل الأصوات العام
    if (!settings.soundsEnabled) return;

    // التحقق من نوع الصوت
    const soundType = this.getSoundType(soundName);
    if (soundType === 'click' && !settings.clickSounds) return;
    if (soundType === 'notification' && !settings.notificationSounds) return;
    if (soundType === 'system' && !settings.systemSounds) return;

    if (!this.sounds[soundName]) return;

    try {
      // تحديث مستوى الصوت
      this.volume = settings.soundVolume;

      // إعادة تشغيل السياق إذا كان معلقاً
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.sounds[soundName]();
    } catch (error) {
      console.warn(`خطأ في تشغيل الصوت ${soundName}:`, error);
    }
  }

  // تفعيل/إلغاء تفعيل الأصوات
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('soundEnabled', enabled.toString());
  }

  // تعيين مستوى الصوت
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.volume.toString());
  }

  // تحميل الإعدادات من التخزين المحلي
  loadSettings() {
    const enabled = localStorage.getItem('soundEnabled');
    const volume = localStorage.getItem('soundVolume');

    if (enabled !== null) {
      this.isEnabled = enabled === 'true';
    }

    if (volume !== null) {
      this.volume = parseFloat(volume);
    }
  }

  // حفظ الإعدادات
  saveSettings() {
    localStorage.setItem('soundEnabled', this.isEnabled.toString());
    localStorage.setItem('soundVolume', this.volume.toString());
  }

  // الحصول على حالة الأصوات
  isSoundEnabled() {
    return this.isEnabled;
  }

  // الحصول على مستوى الصوت
  getVolume() {
    return this.volume;
  }
}

// إنشاء مثيل واحد من مدير الأصوات
const soundManager = new SoundManager();

// تحميل الإعدادات عند التهيئة
soundManager.loadSettings();

export default soundManager;
