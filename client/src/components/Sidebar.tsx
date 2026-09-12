import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  PlusCircle,
  FileText,
  Sparkles,
  BarChart3,
  Settings,
  MessageSquareText,
} from "lucide-react";
import { cn } from "../lib/utils";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/campaigns/new", label: "Create Campaign", icon: PlusCircle },
  { to: "/templates", label: "Message Templates", icon: FileText },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/reports", label: "Delivery Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-200 dark:border-slate-800">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <MessageSquareText className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="font-semibold text-slate-900 dark:text-slate-100">CampaignHub</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
