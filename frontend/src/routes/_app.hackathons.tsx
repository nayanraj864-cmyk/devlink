import { createFileRoute, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { hackathonsService } from "@/services";
import { Card, EmptyState, TagChip, Skeleton } from "@/components/shared/primitives";
import { Trophy, Users2, Clock, Plus, Search, Bookmark } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { CreateHackathonDialog } from "@/components/hackathons/CreateHackathonDialog";
import { useSavedSearches } from "@/stores/useSavedSearches";
import { SaveSearchDialog } from "@/components/shared/SaveSearchDialog";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";

export const Route = createFileRoute("/_app/hackathons")({
  head: () => ({
    meta: [
      { title: "Hackathons — DevLink" },
      { name: "description", content: "Discover hackathons, form teams and ship in a weekend." },
    ],
  }),
  validateSearch: z.object({
    create: z.boolean().optional(),
    q: z.string().optional(),
  }),
  component: HackathonsPage,
});

function HackathonsPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState(search.q || "");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const saveSearch = useSavedSearches((s) => s.saveSearch);

  useEffect(() => {
    if (search.create) {
      setCreateOpen(true);
      // Remove query param to keep the URL clean
      navigate({
        search: (prev: any) => {
          const next = { ...prev };
          delete next.create;
          return next;
        },
        replace: true,
      });
    }
  }, [search.create, navigate]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["hackathons"],
    queryFn: hackathonsService.list,
  });

  useEffect(() => {
    if (search.q !== undefined) {
      setQ(search.q);
    }
  }, [search.q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      navigate({
        search: (prev: any) => ({ ...prev, q: q || undefined }),
        replace: true,
      });
    }, 300);
    return () => clearTimeout(handler);
  }, [q, navigate]);

  const filteredData = useMemo(() => {
    const query = q.toLowerCase();
    return data.filter(
      (h) =>
        h.name.toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query) ||
        (h.theme && h.theme.toLowerCase().includes(query)),
    );
  }, [data, q]);

  if (pathname !== "/hackathons" && pathname !== "/hackathons/") {
    return <Outlet />;
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <TypoHeading as="h1">Hackathons</TypoHeading>
          <TypoCaption as="p">Join a jam, build a team, ship something new.</TypoCaption>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus size={14} /> New hackathon
        </button>
        <CreateHackathonDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search hackathons..."
            className="w-full rounded-md border border-border bg-surface py-[7px] pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setSaveDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-[7px] text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bookmark size={13} />
          Save Search
        </button>
      </div>

      <SaveSearchDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={(name) => {
          saveSearch({
            name,
            type: "Hackathons",
            query: q,
          } as any);
        }}
      />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 flex flex-col justify-between h-[150px]">
              <div>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-md animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                    <Skeleton className="h-4 w-2/3 animate-pulse" />
                    <Skeleton className="h-3 w-5/6 animate-pulse" />
                  </div>
                </div>
                <div className="mt-3 flex gap-1">
                  <Skeleton className="h-5 w-14 rounded-full animate-pulse" />
                  <Skeleton className="h-5 w-16 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 animate-pulse" />
                <Skeleton className="h-3.5 w-28 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No hackathons yet"
          desc="Bring builders together by creating the first challenge."
          action={<button onClick={() => setCreateOpen(true)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Create hackathon</button>}
          className="rounded-xl border border-dashed border-primary/20 bg-primary/5"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredData.map((h) => (
            <Link
              key={h.id}
              to="/hackathons/$hackathonId"
              params={{ hackathonId: h.id }}
              className="block"
            >
              <Card interactive className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted text-xl">
                    🏆
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{h.name}</p>
                    <TypoCaption as="p">{h.description}</TypoCaption>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {h.theme && <TagChip>{h.theme}</TagChip>}
                  <TagChip
                    className={cn(
                      h.status === "registration_open"
                        ? "border-success/30 bg-success/10 text-success"
                        : h.status === "in_progress"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : h.status === "judging"
                            ? "border-warning/30 bg-warning/10 text-warning"
                            : h.status === "completed"
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {h.status.replace(/_/g, " ")}
                  </TagChip>
                  {h.prize && (
                    <TagChip className="border-warning/30 bg-warning/10 text-warning">
                      {h.prize}
                    </TagChip>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {formatDate(h.starts_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users2 size={12} /> {h.min_team_size}–{h.max_team_size} members
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
