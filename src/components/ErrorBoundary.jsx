import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ [ErrorBoundary Caught Error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-right" dir="rtl">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">حدث خطأ أثنـاء عرض الصفحة</h2>
            <p className="text-slate-400 text-sm mb-6">
              تعذر تحميل بعض عناصر واجهة المستخدم. يمكنك إعادة المحاولة دون قلق على بياناتك.
            </p>
            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-700/60 p-3 rounded-xl mb-6 text-xs font-mono text-red-300 text-left overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 space-x-reverse mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
