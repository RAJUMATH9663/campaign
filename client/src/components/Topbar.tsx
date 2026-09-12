import { Moon, Sun, LogOut } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useAuth } from "../hooks/useAuth";
import { Button } from "./ui/Button";

export function Topbar({ title }: { title: string }) {
  const { dark, toggle } = useDarkMode();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 md:px-6">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle dark mode">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 flex items-center justify-center text-xs font-semibold">
              {(user.name || user.email)[0]?.toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-300">
              {user.name || user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
