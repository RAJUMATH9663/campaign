import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "../lib/utils";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2.5 shadow-lg text-sm bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2",
              t.type === "success" && "border-emerald-200 dark:border-emerald-900",
              t.type === "error" && "border-red-200 dark:border-red-900",
              t.type === "info" && "border-slate-200 dark:border-slate-800"
            )}
          >
            {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />}
            {t.type === "error" && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
            {t.type === "info" && <Info className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />}
            <span className="flex-1 text-slate-700 dark:text-slate-200">{t.message}</span>
            <button
              onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
