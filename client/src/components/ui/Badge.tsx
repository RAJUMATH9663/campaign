import { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type BadgeTone = "default" | "success" | "info" | "warning" | "danger";

const TONE_STYLES: Record<BadgeTone, string> = {
  default: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/** Maps a domain status string (campaign/message status) to a badge tone. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "DELIVERED":
    case "SENT":
    case "COMPLETED":
    case "ACTIVE":
      return "success";
    case "FAILED":
    case "CANCELLED":
      return "danger";
    case "PENDING":
    case "QUEUED":
    case "PAUSED":
      return "warning";
    case "RUNNING":
    case "SCHEDULED":
      return "info";
    default:
      return "default";
  }
}

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
