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

  // إنشاء الأصوات باستخدام Web Audio API
  createSounds() {
    // صوت النقر
    this.sounds.click = this.createTone(800, 0.1, 'sine');

    // صوت النجاح
    this.sounds.success = this.createChord([523, 659, 784], 0.3, 'sine');

    // صوت الخطأ
    this.sounds.error = this.createTone(200, 0.5, 'sawtooth');

    // صوت إضافة منتج
    this.sounds.addProduct = this.createTone(600, 0.15, 'square');

    // صوت حذف منتج
    this.sounds.removeProduct = this.createTone(400, 0.2, 'triangle');

    // صوت بدء الوردية
    this.sounds.startShift = this.createChord([440, 554, 659], 0.4, 'sine');

    // صوت إنهاء الوردية
    this.sounds.endShift = this.createChord([659, 523, 392], 0.5, 'sine');

    // صوت طباعة
    this.sounds.print = this.createTone(1000, 0.1, 'square');

    // صوت فتح نافذة
    this.sounds.openWindow = this.createTone(700, 0.2, 'sine');

    // صوت إغلاق نافذة
    this.sounds.closeWindow = this.createTone(500, 0.2, 'sine');

    // صوت حفظ
    this.sounds.save = this.createChord([523, 659], 0.25, 'sine');

    // صوت تحديث
    this.sounds.update = this.createTone(800, 0.15, 'triangle');

    // صوت حذف
    this.sounds.delete = this.createTone(300, 0.3, 'sawtooth');

    // صوت تنبيه
    this.sounds.notification = this.createChord([880, 1108], 0.2, 'sine');

    // صوت تحذير
    this.sounds.warning = this.createTone(400, 0.4, 'sawtooth');

    // صوت نقدي
    this.sounds.cash = this.createChord([523, 659, 784, 1047], 0.3, 'sine');

    // صوت بطاقة
    this.sounds.card = this.createTone(1000, 0.2, 'square');

    // صوت خصم
    this.sounds.discount = this.createTone(600, 0.25, 'triangle');

    // صوت عربون
    this.sounds.downPayment = this.createChord([440, 554], 0.3, 'sine');

    // صوت المرتجع
    this.sounds.return = this.createTone(400, 0.3, 'sawtooth');

    // صوت مرتجع
    this.sounds.refund = this.createTone(200, 0.4, 'sawtooth');

    // صوت تسجيل دخول
    this.sounds.login = this.createChord([523, 659, 784], 0.4, 'sine');

    // صوت تسجيل خروج
    this.sounds.logout = this.createChord([784, 659, 523], 0.4, 'sine');

    // صوت تحميل
    this.sounds.loading = this.createTone(800, 0.1, 'sine');

    // صوت اكتمال
    this.sounds.complete = this.createChord([523, 659, 784, 1047], 0.5, 'sine');
  }

  // إنشاء نغمة واحدة
  createTone(frequency, duration, type = 'sine') {
    return () => {
      if (!this.isEnabled || !this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    };
  }

  // إنشاء وتر (أكثر من نغمة)
  createChord(frequencies, duration, type = 'sine') {
    return () => {
      if (!this.isEnabled || !this.audioContext) return;

      frequencies.forEach((frequency, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;

        const delay = index * 0.05; // تأخير طفيف بين النغمات

        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + delay + duration);

        oscillator.start(this.audioContext.currentTime + delay);
        oscillator.stop(this.audioContext.currentTime + delay + duration);
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
