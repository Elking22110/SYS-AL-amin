import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  
  // إعدادات الخادم
  server: {
    port: 5173,
    host: '0.0.0.0', // السماح بالوصول من جميع عناوين IP
    open: true,
    cors: true,
    hmr: {
      overlay: true
    },
    // إعدادات البروكسي للAPI
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    // إعدادات الأمان
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    }
  },

  // إعدادات البناء
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'esnext',
    // إعدادات خاصة بـ Electron
    base: './',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // تقسيم الكود
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'framer-motion'],
          charts: ['recharts'],
          utils: ['lodash', 'date-fns', 'axios']
        },
        // تحسين الأسماء
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // إعدادات خاصة بـ Electron
    emptyOutDir: true,
    // تحسينات CSS
    cssCodeSplit: true,
    cssMinify: true
  },

  // إعدادات المعاينة
  preview: {
    port: 4173,
    host: true,
    open: true
  },

  // تحسينات التبعيات
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'framer-motion',
      'recharts',
      'lodash',
      'date-fns',
      'axios',
      'jwt-decode',
      'crypto-js'
    ],
    exclude: ['@vite/client', '@vite/env']
  },

  // إعدادات CSS
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "./src/styles/variables.scss";`
      }
    }
  },

  // إعدادات JSON
  json: {
    namedExports: true,
    stringify: false
  },

  // إعدادات البيئة
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // إعدادات المسارات
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@context': resolve(__dirname, 'src/context'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types')
    }
  },

  // إعدادات الاختبار
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    }
  },

  // إعدادات الأداء
  esbuild: {
    target: 'esnext',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  },

})
