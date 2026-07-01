// نظام الطابعة الحرارية المحسن
import { formatDateTime, getCurrentDate } from './dateUtils.js';
import safeMath from './safeMath.js';

class ThermalPrinterManager {
  constructor() {
    this.port = null;
    this.writer = null;
    this.isConnected = false;
    this.printerSettings = {
      // مطابق لإعدادات XP-T80Q في برنامج XPrinter
      baudRate: 19200,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    };
  }

  // تهيئة الطابعة
  async init() {
    try {
      // التحقق من دعم Web Serial API
      if (!navigator.serial) {
        throw new Error('Web Serial API غير مدعوم في هذا المتصفح');
      }

      // طلب إذن الوصول للطابعة
      this.port = await navigator.serial.requestPort();

      if (!this.port) {
        throw new Error('لم يتم اختيار منفذ الطابعة');
      }

      // محاولة فتح الاتصال بعدة سرعات (توافقية XP-T80Q)
      const baudCandidates = [this.printerSettings.baudRate, 9600, 38400, 115200];
      let opened = false;
      for (const rate of baudCandidates) {
        try {
          await this.port.open({
            baudRate: rate,
            dataBits: this.printerSettings.dataBits,
            stopBits: this.printerSettings.stopBits,
            parity: this.printerSettings.parity,
            flowControl: this.printerSettings.flowControl
          });
          this.printerSettings.baudRate = rate; // حفظ السرعة العاملة
          opened = true;
          break;
        } catch (e) {
          // جرّب السرعة التالية
          try { if (this.port && this.port.readable) { await this.port.close(); } } catch (_) { }
        }
      }
      if (!opened) throw new Error('تعذر فتح منفذ الطابعة بأي سرعة معروفة');

      // الحصول على writer
      this.writer = this.port.writable.getWriter();
      this.isConnected = true;

      console.log('تم الاتصال بالطابعة الحرارية بنجاح');
      return true;
    } catch (error) {
      console.error('خطأ في الاتصال بالطابعة الحرارية:', error);
      this.isConnected = false;

      // إذا كان الخطأ بسبب عدم اختيار المنفذ، لا نرمي الخطأ
      if (error.name === 'NotFoundError' && error.message.includes('No port selected')) {
        console.warn('لم يتم اختيار منفذ الطابعة - سيتم تخطي الطباعة');
        return false;
      }

      throw error;
    }
  }

  // إغلاق الاتصال
  async close() {
    try {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.isConnected = false;
      console.log('تم إغلاق الاتصال بالطابعة');
    } catch (error) {
      console.error('خطأ في إغلاق الاتصال بالطابعة:', error);
    }
  }

  // إرسال أوامر للطابعة
  async sendCommand(command) {
    try {
      if (!this.isConnected || !this.writer) {
        throw new Error('الطابعة غير متصلة');
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(command);
      await this.writer.write(data);

      // انتظار صغير لضمان إرسال البيانات
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error('خطأ في إرسال الأمر للطابعة:', error);
      throw error;
    }
  }

  // إرسال بايتات ثنائية للطابعة (لأوامر ESC/POS)
  async sendBytes(byteArray) {
    try {
      if (!this.isConnected || !this.writer) {
        throw new Error('الطابعة غير متصلة');
      }

      const data = new Uint8Array(byteArray);
      await this.writer.write(data);
      await new Promise(resolve => setTimeout(resolve, 60));
    } catch (error) {
      console.error('خطأ في إرسال البايتات للطابعة:', error);
      throw error;
    }
  }

  // قطع الورق
  async cutPaper() {
    try {
      if (!this.isConnected || !this.writer) {
        throw new Error('الطابعة غير متصلة');
      }

      // مسافات إضافية قبل القطع
      await this.sendCommand('\n\n\n');
      // أوامر القطع الموصى بها لطابعات XPrinter XP-T80Q
      // ترتيب أوامر القطع حسب شائع XPrinter XP-T80Q
      const cutSequences = [
        [0x1B, 0x64, 0x03],          // تغذية 3 أسطر
        [0x1D, 0x56, 0x41, 0x00],    // GS V A 0 – Full cut
        [0x1D, 0x56, 0x41, 0x01],    // GS V A 1 – Partial cut
        [0x1D, 0x56, 0x42, 0x00],    // GS V B 0 – Full cut (بعض الفيرموير)
        [0x1D, 0x56, 0x00],          // GS V 0 – Full cut legacy
        [0x1B, 0x69]                 // ESC i – بديل قديم
      ];

      for (const seq of cutSequences) {
        await this.sendBytes(seq);
      }

      console.log('تم قطع الورق بنجاح');
    } catch (error) {
      console.error('خطأ في قطع الورق:', error);
      throw error;
    }
  }

  // طباعة نص
  async printText(text) {
    try {
      // إعداد الطابعة
      await this.sendCommand('\x1B\x40'); // ESC @ - إعادة تعيين
      await this.sendCommand('\x1B\x61\x01'); // ESC a 1 - محاذاة وسط
      await this.sendCommand('\x1B\x45\x01'); // ESC E 1 - نص عريض

      // إرسال النص
      await this.sendCommand(text);
      await this.sendCommand('\n');

    } catch (error) {
      console.error('خطأ في طباعة النص:', error);
      throw error;
    }
  }

  // طباعة خط
  async printLine(char = '-', length = 48) {
    try {
      const line = char.repeat(length);
      await this.sendCommand(line + '\n');
    } catch (error) {
      console.error('خطأ في طباعة الخط:', error);
      throw error;
    }
  }

  // طباعة إيصال
  async printReceipt(receiptData) {
    try {
      // التحقق من دعم Web Serial API
      if (!navigator.serial) {
        console.warn('Web Serial API غير مدعوم - سيتم تخطي الطباعة');
        return false;
      }

      // التحقق من وجود طابعة متصلة
      const ports = await navigator.serial.getPorts();
      if (ports.length === 0 && !this.isConnected) {
        console.warn('لا توجد طابعة متصلة - سيتم تخطي الطباعة');
        return false;
      }

      if (!this.isConnected) {
        const initResult = await this.init();
        if (!initResult) {
          return false; // تم تخطي الطباعة
        }
      }

      // بدء الإيصال
      await this.sendCommand('\x1B\x40'); // إعادة تعيين
      await this.sendCommand('\x1B\x61\x01'); // محاذاة وسط

      // عنوان المتجر
      if (receiptData.storeName) {
        await this.sendCommand('\x1B\x45\x01'); // نص عريض
        await this.sendCommand(receiptData.storeName + '\n');
        await this.sendCommand('\x1B\x45\x00'); // إلغاء النص العريض
      }

      // وصف المتجر
      if (receiptData.storeDescription) {
        await this.sendCommand(receiptData.storeDescription + '\n');
      }

      // خط فاصل
      await this.printLine('=', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // التاريخ والوقت
      await this.sendCommand('\x1B\x61\x00'); // محاذاة يسار
      await this.sendCommand(`التاريخ: ${receiptData.date}\n`);

      // رقم الفاتورة
      if (receiptData.invoiceId) {
        await this.sendCommand(`رقم الفاتورة: ${receiptData.invoiceId}\n`);
      }

      // عنوان المتجر
      if (receiptData.storeAddress) {
        await this.sendCommand(`العنوان: ${receiptData.storeAddress}\n`);
      }

      // هاتف المتجر
      if (receiptData.storePhone) {
        await this.sendCommand(`الهاتف: ${receiptData.storePhone}\n`);
      }

      await this.sendCommand('\n'); // سطر فارغ
      await this.printLine('-', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // بيانات العميل
      await this.sendCommand('بيانات العميل:\n');
      if (receiptData.customerName) {
        await this.sendCommand(`  الاسم: ${receiptData.customerName}\n`);
      } else {
        await this.sendCommand('  عميل عام\n');
      }
      if (receiptData.customerPhone) {
        await this.sendCommand(`  الهاتف: ${receiptData.customerPhone}\n`);
      }

      // تاريخ الاستلام (إذا كان هناك عربون)
      if (receiptData.deliveryDate) {
        await this.sendCommand(`  تاريخ الاستلام: ${receiptData.deliveryDate}\n`);
      }

      await this.sendCommand('\n'); // سطر فارغ
      await this.printLine('-', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // المنتجات
      await this.sendCommand('المنتجات:\n');
      await this.sendCommand('الوصف                    الكمية   السعر       الإجمالي\n');
      await this.sendCommand('------------------------------------------\n');
      for (let i = 0; i < receiptData.items.length; i++) {
        const item = receiptData.items[i];
        const name = item.name.length > 24 ? item.name.substring(0, 24) + '...' : item.name;
        const quantity = item.quantity;
        const price = item.price;
        const total = safeMath.multiply(price, quantity);

        const line = `  ${name.padEnd(24, ' ')} ${quantity.toString().padStart(3, ' ')} × ${price.toFixed(2).padStart(8, ' ')} = ${total.toFixed(2).padStart(10, ' ')} جنيه`;
        await this.sendCommand(line + '\n');
      }

      await this.sendCommand('\n'); // سطر فارغ
      await this.printLine('-', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // ملخص الفاتورة
      await this.sendCommand('ملخص الفاتورة:\n');
      await this.sendCommand(`  المجموع الفرعي: ${receiptData.subtotal.toFixed(2)} جنيه\n`);

      // الخصم
      if (receiptData.discount > 0) {
        await this.sendCommand(`  الخصم: -${receiptData.discount.toFixed(2)} جنيه\n`);
      }

      // الضريبة
      if (receiptData.tax > 0) {
        await this.sendCommand(`  الضريبة: ${receiptData.tax.toFixed(2)} جنيه\n`);
      }

      await this.sendCommand('\n'); // سطر فارغ
      await this.printLine('=', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // الإجمالي
      await this.sendCommand(`  الإجمالي: ${receiptData.total.toFixed(2)} جنيه\n`);

      // العربون
      if (receiptData.downPayment > 0) {
        await this.sendCommand(`  العربون: ${receiptData.downPayment.toFixed(2)} جنيه\n`);
        await this.sendCommand(`  المبلغ المتبقي: ${receiptData.remaining.toFixed(2)} جنيه\n`);
      }

      await this.sendCommand('\n'); // سطر فارغ
      await this.printLine('-', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // طريقة الدفع
      await this.sendCommand(`طريقة الدفع: ${receiptData.paymentMethod}\n`);

      await this.sendCommand('\n'); // سطر فارغ
      await this.printLine('=', 48);
      await this.sendCommand('\n'); // سطر فارغ

      // رسالة شكر
      await this.sendCommand('\x1B\x61\x01'); // محاذاة وسط
      await this.sendCommand('شكراً لثقتكم - جودة وخدمة مميزة\n');
      await this.sendCommand('متجر الأمين\n');

      // قطع الورق
      await this.cutPaper();

      console.log('تم طباعة الإيصال بنجاح');
      return true;

    } catch (error) {
      console.error('خطأ في طباعة الإيصال:', error);

      // إذا كان الخطأ بسبب عدم اختيار المنفذ، لا نرمي الخطأ
      if (error.name === 'NotFoundError' && error.message.includes('No port selected')) {
        console.warn('لم يتم اختيار منفذ الطابعة - سيتم تخطي الطباعة');
        return false;
      }

      // إعادة تعيين حالة الاتصال
      this.isConnected = false;
      this.port = null;
      this.writer = null;

      throw error;
    }
  }

  // طباعة تقرير
  async printReport(reportData) {
    try {
      if (!this.isConnected) {
        await this.init();
      }

      // بدء التقرير
      await this.sendCommand('\x1B\x40'); // إعادة تعيين
      await this.sendCommand('\x1B\x61\x01'); // محاذاة وسط

      // عنوان التقرير
      await this.sendCommand('\x1B\x45\x01'); // نص عريض
      await this.sendCommand(reportData.title + '\n');
      await this.sendCommand('\x1B\x45\x00'); // إلغاء النص العريض

      // التاريخ
      await this.sendCommand(`التاريخ: ${reportData.date}\n`);
      await this.printLine('=', 32);

      // محتوى التقرير
      for (const line of reportData.content) {
        await this.sendCommand(line + '\n');
      }

      // خط فاصل
      await this.printLine('-', 32);

      // توقيع
      await this.sendCommand('\x1B\x61\x01'); // محاذاة وسط
      await this.sendCommand('تم إنشاء التقرير تلقائياً\n');
      await this.sendCommand('متجر الأمين\n');

      // قطع الورق
      await this.cutPaper();

      console.log('تم طباعة التقرير بنجاح');
      return true;

    } catch (error) {
      console.error('خطأ في طباعة التقرير:', error);
      throw error;
    }
  }

  // اختبار الطابعة
  async testPrint() {
    try {
      if (!this.isConnected) {
        await this.init();
      }

      await this.sendCommand('\x1B\x40'); // إعادة تعيين
      await this.sendCommand('\x1B\x61\x01'); // محاذاة وسط
      await this.sendCommand('\x1B\x45\x01'); // نص عريض
      await this.sendCommand('اختبار الطابعة\n');
      await this.sendCommand('\x1B\x45\x00'); // إلغاء النص العريض
      await this.sendCommand('متجر الأمين\n');
      await this.printLine('=', 32);
      await this.sendCommand('الوقت: ' + formatDateTime(getCurrentDate()) + '\n');
      await this.sendCommand('الحالة: متصلة بنجاح\n');
      await this.printLine('-', 32);
      await this.sendCommand('تم اختبار الطابعة بنجاح\n');
      await this.sendCommand('\n\n\n');
      await this.sendCommand('\x1D\x56\x00'); // قطع الورق

      console.log('تم اختبار الطابعة بنجاح');
      return true;

    } catch (error) {
      console.error('خطأ في اختبار الطابعة:', error);
      throw error;
    }
  }

  // التحقق من حالة الاتصال
  isPrinterConnected() {
    return this.isConnected && this.port && this.writer;
  }

  // الحصول على إعدادات الطابعة
  getPrinterSettings() {
    return { ...this.printerSettings };
  }

  // تحديث إعدادات الطابعة
  updatePrinterSettings(settings) {
    this.printerSettings = { ...this.printerSettings, ...settings };
  }

  // إعادة الاتصال
  async reconnect() {
    try {
      await this.close();
      await this.init();
      return true;
    } catch (error) {
      console.error('خطأ في إعادة الاتصال:', error);
      throw error;
    }
  }

  // طباعة بدون إذن (محاولة)
  async printWithoutPermission(receiptData) {
    try {
      // محاولة استخدام Web Serial API بدون إذن
      const ports = await navigator.serial.getPorts();

      if (ports.length > 0) {
        this.port = ports[0];
        await this.port.open({
          baudRate: this.printerSettings.baudRate,
          dataBits: this.printerSettings.dataBits,
          stopBits: this.printerSettings.stopBits,
          parity: this.printerSettings.parity,
          flowControl: this.printerSettings.flowControl
        });

        this.writer = this.port.writable.getWriter();
        this.isConnected = true;

        // طباعة الإيصال
        await this.printReceipt(receiptData);

        return true;
      } else {
        throw new Error('لا توجد طابعة متصلة');
      }
    } catch (error) {
      console.error('خطأ في الطباعة بدون إذن:', error);
      throw error;
    }
  }
}

// إنشاء مثيل واحد من مدير الطابعة الحرارية
const thermalPrinterManager = new ThermalPrinterManager();

export default thermalPrinterManager;


