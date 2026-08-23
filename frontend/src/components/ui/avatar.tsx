"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, getInitials } from "@/lib/utils";

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  name?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const dotSizeMap = {
  xs: "h-1.5 w-1.5 ring-1",
  sm: "h-2 w-2 ring-1.5",
  md: "h-2.5 w-2.5 ring-2",
  lg: "h-3 w-3 ring-2",
  xl: "h-4 w-4 ring-2",
};

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, src, name, alt, size = "md", online, children, ...props }, ref) => {
  const fallbackText = getInitials(name || alt || "U");

  return (
    <div className="relative inline-flex shrink-0">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full border border-border bg-muted/60 select-none",
          sizeMap[size],
          className,
        )}
        {...props}
      >
        {src ? (
          <AvatarPrimitive.Image
            src={src}
            alt={alt || name || "Avatar"}
            className="aspect-square h-full w-full object-cover"
          />
        ) : null}
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 font-semibold uppercase tracking-wider text-primary"
        >
          {fallbackText}
        </AvatarPrimitive.Fallback>
        {children}
      </AvatarPrimitive.Root>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-card",
            dotSizeMap[size],
            online ? "bg-success" : "bg-muted-foreground/50",
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
});
Avatar.displayName = "Avatar";

const AvatarImage = AvatarPrimitive.Image;
const AvatarFallback = AvatarPrimitive.Fallback;

export { Avatar, AvatarImage, AvatarFallback };
