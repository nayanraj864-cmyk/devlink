import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * A thin bar shown while the browser reports no connectivity.
 *
 * Without it, a dropped connection surfaces as mutations failing for no
 * visible reason, which reads as the app being broken rather than the network
 * being down.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-warning px-4 py-2 text-xs sm:text-sm font-semibold text-warning-foreground shadow-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You're offline. Changes won't be saved until you reconnect.</span>
    </div>
  );
}
