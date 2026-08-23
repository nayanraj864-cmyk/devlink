import { Link } from "@tanstack/react-router";
import { Users2, Star, GitFork, Calendar, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, TagChip, Avatar } from "@/components/shared/primitives";
import { TypoCaption } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";
import type { Project } from "@/mocks/seed";

export interface ProjectOverviewCardProps {
  project: Project & {
    deadlineText?: string;
    maxMembers?: number;
    completionPercentage?: number;
  };
  compact?: boolean;
}

export function ProjectOverviewCard({ project, compact = false }: ProjectOverviewCardProps) {
  const progressVal = project.completionPercentage ?? project.progress ?? 0;
  const maxTeamSize = project.maxMembers || 5;
  const currentMembers = project.members || 1;
  const deadline = project.deadlineText || "Flexible";

  const statusColorMap = {
    recruiting: "bg-primary/10 text-primary border-primary/20",
    "in-progress": "bg-warning/10 text-warning border-warning/30",
    completed: "bg-success/10 text-success border-success/30",
    archived: "bg-muted text-muted-foreground border-border",
  };

  const statusDisplay = (project.status || "in-progress")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const progressColor =
    progressVal >= 80 ? "bg-emerald-500" : progressVal >= 40 ? "bg-primary" : "bg-amber-500";

  return (
    <Card
      interactive
      className={cn(
        "p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 border-border/70 group hover:border-primary/40",
        compact && "p-3.5",
      )}
    >
      <div>
        {/* Top Header: Icon, Title, Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xl border border-primary/20 font-bold group-hover:scale-105 transition-transform">
              {project.icon || "🚀"}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1 flex items-center gap-1"
              >
                {project.name}
                <ArrowUpRight
                  size={14}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0"
                />
              </Link>
              <TypoCaption as="p" className="line-clamp-2 text-xs text-muted-foreground mt-0.5">
                {project.description}
              </TypoCaption>
            </div>
          </div>

          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0",
              statusColorMap[project.status as keyof typeof statusColorMap] ||
                statusColorMap["in-progress"],
            )}
          >
            {statusDisplay}
          </span>
        </div>

        {/* Tech Stack Chips */}
        {project.stack && project.stack.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1">
            {project.stack.slice(0, 3).map((tech) => (
              <TagChip key={tech} className="text-[11px] px-2 py-0.5">
                {tech}
              </TagChip>
            ))}
            {project.stack.length > 3 && (
              <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted self-center">
                +{project.stack.length - 3}
              </span>
            )}
            {project.difficulty && (
              <TagChip
                className={cn(
                  "text-[11px] px-2 py-0.5",
                  project.difficulty === "Beginner"
                    ? "border-success/30 bg-success/10 text-success"
                    : project.difficulty === "Intermediate"
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {project.difficulty}
              </TagChip>
            )}
          </div>
        )}
      </div>

      {/* Actionable Project Information Section */}
      <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
        {/* Progress Bar & Percentage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Sparkles size={12} className="text-primary" /> Progress
            </span>
            <span className="font-bold text-foreground">{progressVal}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-300", progressColor)}
              style={{ width: `${Math.min(100, Math.max(0, progressVal))}%` }}
            />
          </div>
        </div>

        {/* Meta Stats: Team Size, Deadline, Stars */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1 font-medium text-foreground"
              title="Team size"
            >
              <Users2 size={13} className="text-primary" /> {currentMembers}/{maxTeamSize} builders
            </span>
            <span className="hidden sm:inline-flex items-center gap-1" title="Deadline / Due Date">
              <Calendar size={13} className="text-muted-foreground" /> {deadline}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {project.stars !== undefined && (
              <span className="inline-flex items-center gap-1">
                <Star size={12} className="text-amber-500 fill-amber-500/20" /> {project.stars}
              </span>
            )}
            {project.forks !== undefined && (
              <span className="inline-flex items-center gap-1">
                <GitFork size={12} /> {project.forks}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
