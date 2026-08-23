import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/hooks/useSidebar";
import type { ReactNode } from "react";

export interface SidebarItemProps {
  label: string;
  to: string;
  search?: Record<string, unknown>;
  icon: ReactNode;
  badge?: number;
  action?: ReactNode;
  /** When true, renders icon-only regardless of sidebar context state */
  forceCollapsed?: boolean;
}

export function SidebarItem({ label, to, search, icon, badge, action, forceCollapsed }: SidebarItemProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const { isCollapsed, closeMobile } = useSidebar();

  const [path, query] = to.split("?");
  const searchObj = query ? Object.fromEntries(new URLSearchParams(query).entries()) : undefined;
  const effectiveSearch = search || searchObj;

  const collapsed = forceCollapsed ?? isCollapsed;
  const isExactPath = pathname === path;
  const isSubPath = pathname.startsWith(path + "/");
  const isMatchSearch = !query || searchStr.includes(query);
  const active = (isExactPath && isMatchSearch) || (isSubPath && !query);

  if (collapsed) {
    return (
      <li>
        <Link
          to={path}
          search={effectiveSearch as any}
          onClick={closeMobile}
          title={label}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-10 w-full items-center justify-center rounded-md outline-none",
            "transition-colors duration-150",
            "focus-visible:ring-2 focus-visible:ring-primary",
            active
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
          )}
        >
          {/* Active rail indicator, inset within the item so it survives clipped/animated ancestors */}
          {active && (
            <span
              className="absolute left-1 top-1/2 z-10 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
          <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")}>
            {icon}
          </span>
          {/* Badge dot for collapsed state */}
          {badge !== undefined && badge > 0 && (
            <span
              className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive"
              aria-hidden="true"
            />
          )}
        </Link>
      </li>
    );
  }

  return (
    <li title={undefined}>
      <Link
        to={path}
        search={effectiveSearch as any}
        preload="intent"
        onClick={closeMobile}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md py-1.5 pl-4 pr-3 text-[13px] font-medium outline-none",
          "transition-colors duration-150",
          "focus-visible:ring-2 focus-visible:ring-primary",
          active
            ? "bg-primary-soft font-semibold text-primary"
            : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground focus:bg-sidebar-accent",
        )}
      >
        {/* Active rail indicator, inset within the item so it survives clipped/animated ancestors */}
        {active && (
          <span
            className="absolute left-1 top-1/2 z-10 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
            aria-hidden="true"
          />
        )}
        <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")}>
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined && badge > 0 && !action && (
          <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        {action && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {action}
          </div>
        )}
      </Link>
    </li>
  );
}
