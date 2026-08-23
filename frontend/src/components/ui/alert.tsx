import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-5 [&>svg~*]:pl-7 shadow-xs transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-surface text-foreground border-border [&>svg]:text-foreground",
        info:
          "bg-info-soft text-info border-info-border [&>svg]:text-info",
        success:
          "bg-success-soft text-success border-success-border [&>svg]:text-success",
        warning:
          "bg-warning-soft text-warning border-warning-border [&>svg]:text-warning",
        destructive:
          "bg-destructive-soft text-destructive border-destructive-border [&>svg]:text-destructive",
        error:
          "bg-destructive-soft text-destructive border-destructive-border [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode | boolean;
  onDismiss?: () => void;
}

const defaultIcons = {
  default: <Info size={18} />,
  info: <Info size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  destructive: <AlertCircle size={18} />,
  error: <AlertCircle size={18} />,
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", icon = true, onDismiss, children, ...props }, ref) => {
    const selectedVariant = variant || "default";
    const renderIcon =
      icon === true
        ? defaultIcons[selectedVariant] || defaultIcons.default
        : icon || null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant: selectedVariant }), onDismiss && "pr-10", className)}
        {...props}
      >
        {renderIcon}
        <div>{children}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="absolute right-3 top-3.5 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold leading-none tracking-tight text-current", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-xs leading-relaxed opacity-90", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
