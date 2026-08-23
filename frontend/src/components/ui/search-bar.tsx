import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  shortcut?: string;
  onClear?: () => void;
  barSize?: "sm" | "md" | "lg";
  isButton?: boolean;
  onTriggerClick?: () => void;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      className,
      placeholder = "Search developers, projects, posts...",
      shortcut = "⌘K",
      value,
      onChange,
      onClear,
      barSize = "md",
      isButton = false,
      onTriggerClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: "h-8 py-1 pl-8 pr-8 text-xs",
      md: "h-9 py-1.5 pl-9 pr-9 text-sm",
      lg: "h-11 py-2 pl-10 pr-10 text-base",
    }[barSize];

    const iconSize = {
      sm: 14,
      md: 15,
      lg: 18,
    }[barSize];

    if (isButton) {
      return (
        <button
          type="button"
          onClick={onTriggerClick}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-input bg-surface px-3 text-xs text-muted-foreground shadow-xs transition-colors",
            "hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left",
            sizeClasses,
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={iconSize} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{placeholder}</span>
          </div>
          {shortcut && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground shrink-0 select-none">
              {shortcut}
            </kbd>
          )}
        </button>
      );
    }

    const hasValue = value !== undefined && value !== "";

    return (
      <div className={cn("relative flex items-center w-full", className)}>
        <Search
          size={iconSize}
          className="absolute left-3 pointer-events-none text-muted-foreground shrink-0"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "flex w-full rounded-md border border-input bg-surface text-foreground shadow-xs transition-colors",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            sizeClasses,
          )}
          {...props}
        />
        <div className="absolute right-3 flex items-center gap-1.5">
          {hasValue && onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none"
            >
              <X size={14} />
            </button>
          )}
          {shortcut && !hasValue && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground shrink-0 select-none">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";
