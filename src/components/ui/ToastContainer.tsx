'use client';

import { useToastStore } from '@/store/toast-store';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const alertClassMap = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-top toast-end z-50">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const alertClass = alertClassMap[toast.type];

        return (
          <div key={toast.id} className={`alert ${alertClass} shadow-lg`}>
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn btn-sm btn-ghost btn-circle"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
