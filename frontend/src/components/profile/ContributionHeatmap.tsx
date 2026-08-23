import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { activityHeatmapApi, type ActivityHeatmap } from "@/api/modules/activityHeatmap";
import { isBackendConfigured } from "@/api";
import { Card, EmptyState, Skeleton } from "@/components/shared/primitives";
import { cn } from "@/lib/utils";
import { buildMonthLabels, buildWeeks, formatDayLabel } from "@/lib/heatmapGrid";
import { Flame, TrendingUp } from "lucide-react";

interface ContributionHeatmapProps {
  username: string;
  /** Window size in days. 365 fills a full 53-column grid. */
  days?: number;
  className?: string;
}

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// Level 0 is deliberately a muted surface rather than transparent — an empty
// day should still read as a cell in the grid, not as a hole in it.
const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

function StreakStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-[15px] font-semibold text-foreground">{value}</p>
      {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function HeatmapGrid({ data }: { data: ActivityHeatmap }) {
  const weeks = useMemo(() => buildWeeks(data.days), [data.days]);
  const monthLabels = useMemo(() => buildMonthLabels(weeks), [weeks]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-2">
        <div className="flex flex-col gap-[3px] pt-[18px]">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="h-[11px] text-[9px] leading-[11px] text-muted-foreground"
              aria-hidden="true"
            >
              {label}
            </span>
          ))}
        </div>

        <div>
          <div className="relative mb-1 h-[14px]">
            {monthLabels.map(({ index, label }) => (
              <span
                key={`${label}-${index}`}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: `${index * 14}px` }}
                aria-hidden="true"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]" role="grid" aria-label="Contribution activity">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]" role="row">
                {week.map((day, dayIndex) =>
                  day ? (
                    <div
                      key={day.day}
                      role="gridcell"
                      title={formatDayLabel(day)}
                      aria-label={formatDayLabel(day)}
                      data-level={day.level}
                      className={cn("h-[11px] w-[11px] rounded-[2px]", LEVEL_CLASSES[day.level])}
                    />
                  ) : (
                    <div
                      key={`pad-${weekIndex}-${dayIndex}`}
                      className="h-[11px] w-[11px]"
                      aria-hidden="true"
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContributionHeatmap({ username, days = 365, className }: ContributionHeatmapProps) {
  const backendConfigured = isBackendConfigured();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity-heatmap", username, days],
    queryFn: () => activityHeatmapApi.getForUser(username, { days }),
    enabled: backendConfigured,
    // The grid only changes once a day; refetching on every focus is waste.
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <Card className={cn("p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground">Contribution activity</p>
        {data ? (
          <p className="text-[11px] text-muted-foreground">
            {data.streak.total_activities} in the last {data.streak.total_days} days
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-[90px] w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          icon={TrendingUp}
          title="Contribution activity is unavailable"
          desc="Try again in a moment."
          className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-8"
        />
      ) : null}

      {!isLoading && !isError && !data ? (
        <EmptyState
          icon={TrendingUp}
          title="Start your contribution story"
          desc="Your project work and community activity will light up this chart."
          className="rounded-xl border border-dashed border-primary/20 bg-primary/5 py-8"
        />
      ) : null}

      {data && !isError ? (
        <>
          <HeatmapGrid data={data} />

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3 sm:grid-cols-4">
            <StreakStat
              label="Current streak"
              value={`${data.streak.current_streak} ${data.streak.current_streak === 1 ? "day" : "days"}`}
            />
            <StreakStat
              label="Longest streak"
              value={`${data.streak.longest_streak} ${data.streak.longest_streak === 1 ? "day" : "days"}`}
              hint={data.streak.longest_streak_start ?? undefined}
            />
            <StreakStat label="Active days" value={String(data.streak.active_days)} />
            <StreakStat label="Daily average" value={data.streak.daily_average.toFixed(2)} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {data.streak.current_streak > 0 ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  <span>On a roll</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>No active streak</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={cn("h-[11px] w-[11px] rounded-[2px]", LEVEL_CLASSES[level])}
                  aria-hidden="true"
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}

export default ContributionHeatmap;
