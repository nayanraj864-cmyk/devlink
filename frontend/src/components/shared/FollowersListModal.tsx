import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getFollowers, getFollowing } from "@/lib/api";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "@/components/shared/primitives";

export interface FollowersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  type: "followers" | "following";
}

export function FollowersListModal({
  isOpen,
  onClose,
  userId,
  username,
  type,
}: FollowersListModalProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["followers-list", type, userId],
    queryFn: () => (type === "followers" ? getFollowers(userId) : getFollowing(userId)),
    enabled: isOpen && !!userId,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h2 className="text-lg font-bold text-foreground capitalize">
            {type === "followers" ? "Followers" : "Following"} of @{username}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="animate-spin text-primary" size={24} />
              <p className="text-xs">Loading members...</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No {type} found.
            </div>
          ) : (
            users.map((item) => {
              const u = type === "followers" ? item.follower : item.following;
              if (!u) return null;

              return (
                <div key={item.id} className="flex items-center justify-between gap-3 p-1">
                  <Link
                    to="/profile/$username"
                    params={{ username: u.username }}
                    onClick={onClose}
                    className="flex items-center gap-3 group min-w-0 flex-1"
                  >
                    <Avatar
                      src={u.profile_image}
                      name={`${u.first_name} ${u.last_name}`}
                      className="h-10 w-10 ring-1 ring-border group-hover:ring-primary/50 transition-all shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      {u.headline && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {u.headline}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
