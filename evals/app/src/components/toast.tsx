import { createContext, useCallback, useContext, useState } from "react";

const AUTO_DISMISS_MS = 3000;

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastIdCounter = 0;

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastIdCounter;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const colorMap: Record<Toast["type"], string> = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${colorMap[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-in`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
