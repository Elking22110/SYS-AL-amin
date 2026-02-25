// نظام إدارة صور المنتجات
export class ImageManager {
  // تحويل الصورة إلى base64
  static async convertToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ضغط الصورة
  static async compressImage(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // حساب الأبعاد الجديدة
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // رسم الصورة المضغوطة
        ctx.drawImage(img, 0, 0, width, height);
        
        // تحويل إلى base64
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // حفظ صورة المنتج
  static async saveProductImage(productId, imageFile) {
    try {
      // ضغط الصورة
      const compressedImage = await this.compressImage(imageFile);
      
      // حفظ في localStorage
      const productImages = JSON.parse(localStorage.getItem('productImages') || '{}');
      productImages[productId] = compressedImage;
      localStorage.setItem('productImages', JSON.stringify(productImages));
      
      return compressedImage;
    } catch (error) {
      console.error('خطأ في حفظ صورة المنتج:', error);
      throw error;
    }
  }

  // جلب صورة المنتج
  static getProductImage(productId) {
    try {
      const productImages = JSON.parse(localStorage.getItem('productImages') || '{}');
      return productImages[productId] || null;
    } catch (error) {
      console.error('خطأ في جلب صورة المنتج:', error);
      return null;
    }
  }

  // حذف صورة المنتج
  static deleteProductImage(productId) {
    try {
      const productImages = JSON.parse(localStorage.getItem('productImages') || '{}');
      delete productImages[productId];
      localStorage.setItem('productImages', JSON.stringify(productImages));
      return true;
    } catch (error) {
      console.error('خطأ في حذف صورة المنتج:', error);
      return false;
    }
  }

  // الحصول على صورة افتراضية حسب الفئة
  static getDefaultImage(category) {
    const defaultImages = {
      'أحذية': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xMiAyMEgzNlYzMkgxMlYyMFoiIGZpbGw9IiNmZmZmZmYiLz4KPHBhdGggZD0iTTE0IDI0SDM0VjI2SDE0VjI0WiIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTYgMjhIMzJWMzBIMTZWMjhaIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xOCAzMkgzMFYzNEgxOFYzMloiIGZpbGw9IiMzNzQxNTEiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwX2xpbmVhcl8xXzEiIHgxPSIwIiB5MT0iMCIgeDI9IjQ4IiB5Mj0iNDgiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iIzM3NDE1MSIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxOTI1MzEiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K',
      'بناطيل': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xNiAxNkgzMlYzMkgxNlYxNloiIGZpbGw9IiNmZmZmZmYiLz4KPHBhdGggZD0iTTE4IDIwSDMwVjIySDE4VjIwWiIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTggMjRIMzBWMjZIMThWMjRaIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xOCAyOEgzMFYzMEgxOFYyOFoiIGZpbGw9IiMzNzQxNTEiLz4KPHBhdGggZD0iTTE4IDMySDMwVjM0SDE4VjMyWiIgZmlsbD0iIzM3NDE1MSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDBfbGluZWFyXzFfMSIgeDE9IjAiIHkxPSIwIiB4Mj0iNDgiIHkyPSI0OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMzc0MTUxIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzE5MjUzMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=',
      'قمصان': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xNiAxNkgzMlYzMkgxNlYxNloiIGZpbGw9IiNmZmZmZmYiLz4KPHBhdGggZD0iTTIwIDE2SDI4VjIwSDIwVjE2WiIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTggMjRIMzBWMjZIMThWMjRaIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xOCAyOEgzMFYzMEgxOFYyOFoiIGZpbGw9IiMzNzQxNTEiLz4KPHBhdGggZD0iTTE4IDMySDMwVjM0SDE4VjMyWiIgZmlsbD0iIzM3NDE1MSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDBfbGluZWFyXzFfMSIgeDE9IjAiIHkxPSIwIiB4Mj0iNDgiIHkyPSI0OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMzc0MTUxIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzE5MjUzMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=',
      'جواكت': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxwYXRoIGQ9Ik0xNiAxNkgzMlYzMkgxNlYxNloiIGZpbGw9IiNmZmZmZmYiLz4KPHBhdGggZD0iTTIwIDE2SDI4VjIwSDIwVjE2WiIgZmlsbD0iIzM3NDE1MSIvPgo8cGF0aCBkPSJNMTggMjRIMzBWMjZIMThWMjRaIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xOCAyOEgzMFYzMEgxOFYyOFoiIGZpbGw9IiMzNzQxNTEiLz4KPHBhdGggZD0iTTE4IDMySDMwVjM0SDE4VjMyWiIgZmlsbD0iIzM3NDE1MSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDBfbGluZWFyXzFfMSIgeDE9IjAiIHkxPSIwIiB4Mj0iNDgiIHkyPSI0OCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMzc0MTUxIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzE5MjUzMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=',
      'إكسسوارات': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTIiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzEpIi8+CjxjaXJjbGUgY3g9IjI0IiBjeT0iMjQiIHI9IjgiIGZpbGw9IiNmZmZmZmYiLz4KPHBhdGggZD0iTTIwIDIwSDI4VjI4SDIwVjIwWiIgZmlsbD0iIzM3NDE1MSIvPgo8Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIzIiBmaWxsPSIjZmZmZmZmIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50MF9saW5lYXJfMV8xIiB4MT0iMCIgeTE9IjAiIHgyPSI0OCIgeTI9IjQ4IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMzNzQxNTEiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTkyNTMxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg=='
    };

    return defaultImages[category] || defaultImages['إكسسوارات'];
  }

  // تنظيف الصور غير المستخدمة
  static cleanupUnusedImages() {
    try {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      const productImages = JSON.parse(localStorage.getItem('productImages') || '{}');
      
      const productIds = products.map(product => product.id.toString());
      const imageKeys = Object.keys(productImages);
      
      // حذف الصور للمنتجات المحذوفة
      imageKeys.forEach(key => {
        if (!productIds.includes(key)) {
          delete productImages[key];
        }
      });
      
      localStorage.setItem('productImages', JSON.stringify(productImages));
      return true;
    } catch (error) {
      console.error('خطأ في تنظيف الصور غير المستخدمة:', error);
      return false;
    }
  }

  // الحصول على حجم الصور المحفوظة
  static getImagesSize() {
    try {
      const productImages = JSON.parse(localStorage.getItem('productImages') || '{}');
      let totalSize = 0;
      
      Object.values(productImages).forEach(imageData => {
        if (imageData && imageData.startsWith('data:image')) {
          // تقدير حجم البيانات
          totalSize += imageData.length * 0.75; // base64 encoding overhead
        }
      });
      
      return {
        totalSize: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        imageCount: Object.keys(productImages).length
      };
    } catch (error) {
      console.error('خطأ في حساب حجم الصور:', error);
      return { totalSize: 0, totalSizeKB: 0, totalSizeMB: 0, imageCount: 0 };
    }
  }
}
