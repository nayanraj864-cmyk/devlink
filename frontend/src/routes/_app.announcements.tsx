import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { featureAnnouncementsService } from "@/services";
import type { AnnouncementCategory, FeatureAnnouncement } from "@/api";
import { Card, TagChip, Avatar, Skeleton, EmptyState } from "@/components/shared/primitives";
import {
  Sparkles,
  Search,
  CheckCheck,
  Plus,
  Compass,
  FileCode2,
  Milestone,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from "lucide-react";
import { TypoHeading, TypoCaption, TypoSection, TypoCard } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/shared/Markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/announcements")({
  head: () => ({
    meta: [
      { title: "Feature Announcements & Roadmap — DevLink" },
      {
        name: "description",
        content:
          "Discover newly released features, product updates, changelogs, and roadmap announcements.",
      },
    ],
  }),
  component: AnnouncementsPage,
});

const CATEGORIES: { label: string; value: AnnouncementCategory | "all"; icon: typeof Sparkles }[] =
  [
    { label: "All Updates", value: "all", icon: Layers },
    { label: "New Features", value: "feature", icon: Sparkles },
    { label: "Release Notes", value: "release_notes", icon: Compass },
    { label: "Changelog", value: "changelog", icon: FileCode2 },
    { label: "Roadmap", value: "roadmap", icon: Milestone },
  ];

function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New announcement form state
  const [newTitle, setNewTitle] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<AnnouncementCategory>("feature");
  const [newVersion, setNewVersion] = useState("v2.5.0");
  const [newBadge, setNewBadge] = useState("New Feature");
  const [isFeatured, setIsFeatured] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["featureAnnouncements", selectedCategory, searchQuery],
    queryFn: () =>
      featureAnnouncementsService.list({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        q: searchQuery || undefined,
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => featureAnnouncementsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureAnnouncements"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => featureAnnouncementsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureAnnouncements"] });
      toast.success("All announcements marked as read!");
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      featureAnnouncementsService.create({
        title: newTitle,
        summary: newSummary,
        content: newContent,
        category: newCategory,
        version: newVersion,
        badge_label: newBadge,
        is_featured: isFeatured,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureAnnouncements"] });
      toast.success("Announcement published successfully!");
      setShowCreateModal(false);
      setNewTitle("");
      setNewSummary("");
      setNewContent("");
    },
  });

  const announcements = data?.items || [];
  const filteredList =
    activeTab === "unread" ? announcements.filter((a) => !a.is_read) : announcements;
  const unreadCount = data?.unread_count || 0;

  const handleToggleExpand = (item: FeatureAnnouncement) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      if (!item.is_read) {
        markReadMutation.mutate(item.id);
      }
    }
  };

  return (
    <div className="mx-auto flex max-w-[1280px] w-full flex-col gap-6 pb-12 pt-4 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-r from-primary/10 via-card to-secondary/10 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Sparkles size={14} /> Platform Announcement Center
            </div>
            <TypoHeading as="h1" className="text-2xl sm:text-3xl font-bold tracking-tight">
              What's New in DevLink
            </TypoHeading>
            <TypoCaption as="p" className="text-sm text-muted-foreground max-w-xl">
              Stay ahead with product releases, developer tools, changelog updates, and upcoming
              roadmap milestones.
            </TypoCaption>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs cursor-pointer"
              >
                <CheckCheck size={14} className="text-primary" />
                Mark all as read ({unreadCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
            >
              <Plus size={14} />
              New Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4 border-border/60">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <Icon size={13} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input & Unread Tab */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements..."
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                  activeTab === "all"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1",
                  activeTab === "unread"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Announcements List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-1/4 rounded animate-pulse" />
                <Skeleton className="h-4 w-16 rounded animate-pulse" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded animate-pulse" />
              <Skeleton className="h-4 w-full rounded animate-pulse" />
            </Card>
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          title="No announcements found"
          desc="Try selecting a different category or adjusting your search keyword."
        />
      ) : (
        <div className="space-y-4">
          {filteredList.map((ann) => {
            const isExpanded = expandedId === ann.id;
            return (
              <Card
                key={ann.id}
                interactive
                className={cn(
                  "p-5 sm:p-6 transition-all duration-200",
                  !ann.is_read && "border-primary/40 bg-primary/[0.02] dark:bg-primary/[0.04]",
                  ann.is_featured && "ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {ann.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-bold uppercase">
                          <Sparkles size={11} /> Featured
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                          ann.category === "feature" &&
                            "bg-primary/10 text-primary border border-primary/20",
                          ann.category === "release_notes" &&
                            "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                          ann.category === "changelog" &&
                            "bg-violet-500/10 text-violet-500 border border-violet-500/20",
                          ann.category === "roadmap" &&
                            "bg-sky-500/10 text-sky-500 border border-sky-500/20",
                        )}
                      >
                        {ann.category.replace("_", " ")}
                      </span>
                      {ann.version && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground border border-border">
                          {ann.version}
                        </span>
                      )}
                      {ann.badge_label && (
                        <span className="rounded-full bg-secondary/15 text-secondary text-[11px] font-semibold px-2 py-0.5">
                          {ann.badge_label}
                        </span>
                      )}
                    </div>

                    <h2
                      onClick={() => handleToggleExpand(ann)}
                      className="text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      {ann.title}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {ann.summary}
                    </p>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border/70 space-y-3">
                        <Markdown
                          content={ann.content}
                          className="text-xs sm:text-sm text-foreground prose-sm"
                        />
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(ann.published_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {ann.created_by && (
                          <span className="inline-flex items-center gap-1">
                            By{" "}
                            <span className="font-semibold text-foreground">
                              {ann.created_by.first_name} {ann.created_by.last_name}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!ann.is_read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate(ann.id);
                            }}
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(ann)}
                          className="inline-flex items-center gap-1 font-semibold text-xs text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          {isExpanded ? "Collapse" : "Read Full Story"}
                          <ChevronRight
                            size={13}
                            className={cn("transition-transform", isExpanded && "rotate-90")}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {!ann.is_read && (
                    <div
                      className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1"
                      title="Unread"
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Admin Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-xl p-6 bg-card border-border shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <TypoHeading as="h2" className="text-lg font-bold">
                Publish Feature Announcement
              </TypoHeading>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-semibold block mb-1">Title</label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. AI Powered Collaborator Matching v2"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AnnouncementCategory)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                  >
                    <option value="feature">New Feature</option>
                    <option value="release_notes">Release Notes</option>
                    <option value="changelog">Changelog</option>
                    <option value="roadmap">Roadmap</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Version / Tag</label>
                  <input
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="v2.5.0"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Summary</label>
                <textarea
                  required
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Short high-level description for card preview..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Content (Markdown supported)</label>
                <textarea
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Detailed breakdown of the new feature..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="feat-checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="feat-checkbox" className="font-medium cursor-pointer">
                  Pin as Featured Announcement
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg border border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 cursor-pointer"
                >
                  {createMutation.isPending ? "Publishing..." : "Publish Announcement"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
