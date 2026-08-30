import React from 'react';
import type {
  Project, ProjectReview, ProjectAnalytics, ShowcaseCollection,
  GitHubStats, ProjectInsight,
} from '../types';
import {
  PROJECT_STATUS_COLORS, DEMO_STATUS_COLORS, CATEGORY_ICONS, CATEGORY_COLORS,
  LICENSE_SHORT, formatNumber, formatRelativeTime,
} from '../types';
import { Card } from '@/components/shared/primitives';
import { TypoCaption, TypoHeading } from '@/components/shared/Typography';

// ============================================================================
// ProjectCard
// ============================================================================

export function ProjectCard({ project }: { project: Project }) {
  const statusColor = PROJECT_STATUS_COLORS[project.status];
  const demoColor = DEMO_STATUS_COLORS[project.demoStatus];
  const categoryIcon = CATEGORY_ICONS[project.category];
  const categoryColor = CATEGORY_COLORS[project.category];

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
      {project.featured && (
        <div className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">
          ⭐ Featured
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${categoryColor}20` }}>
          {categoryIcon}
        </div>
        <div className="flex-1 min-w-0">
          <TypoHeading level={5} className="font-semibold text-foreground truncate">{project.name}</TypoHeading>
          <TypoCaption className="text-muted-foreground capitalize">{project.category}</TypoCaption>
        </div>
        <div className="flex gap-1">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: statusColor }}>
            {project.status}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: demoColor }}>
            {project.demoStatus === 'live' ? '🟢 Live' : project.demoStatus}
          </span>
        </div>
      </div>

      <TypoCaption className="text-muted-foreground block mb-3 line-clamp-2">{project.description}</TypoCaption>

      <div className="flex flex-wrap gap-1 mb-3">
        {project.techStack.slice(0, 4).map(tech => (
          <span key={tech} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tech}</span>
        ))}
        {project.techStack.length > 4 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">+{project.techStack.length - 4}</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">⭐ {formatNumber(project.stars)}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Stars</TypoCaption>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">🍴 {formatNumber(project.forks)}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Forks</TypoCaption>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">📝 {project.totalCommits}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Commits</TypoCaption>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">👥 {project.contributors}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Contributors</TypoCaption>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <TypoCaption className="text-muted-foreground text-[10px]">{LICENSE_SHORT[project.license]} License</TypoCaption>
        <TypoCaption className="text-muted-foreground text-[10px]">Updated {formatRelativeTime(project.updatedAt)}</TypoCaption>
      </div>
    </Card>
  );
}

// ============================================================================
// ReviewCard
// ============================================================================

export function ReviewCard({ review }: { review: ProjectReview }) {
  const stars = '⭐'.repeat(review.rating);
  const sentimentColors = { positive: '#4caf50', neutral: '#ff9800', negative: '#f44336' };

  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {review.reviewer.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{review.reviewer}</p>
          <TypoCaption className="text-muted-foreground">{review.projectName}</TypoCaption>
        </div>
        <span className="text-xs">{stars}</span>
      </div>
      <p className="text-sm text-muted-foreground italic mb-2">"{review.comment}"</p>
      <div className="flex gap-3">
        <TypoCaption className="text-muted-foreground">Quality: <span className="text-foreground font-medium">{review.codeQuality}</span></TypoCaption>
        <TypoCaption className="text-muted-foreground">Docs: <span className="text-foreground font-medium">{review.documentation}</span></TypoCaption>
        <TypoCaption className="text-muted-foreground">Innovation: <span className="text-foreground font-medium">{review.innovation}</span></TypoCaption>
      </div>
    </Card>
  );
}

// ============================================================================
// AnalyticsCard
// ============================================================================

export function AnalyticsCard({ analytics }: { analytics: ProjectAnalytics }) {
  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <TypoHeading level={5} className="font-semibold text-foreground mb-3">{analytics.projectName}</TypoHeading>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{formatNumber(analytics.views30d)}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Views</TypoCaption>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{formatNumber(analytics.demoClicks30d)}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Demo Clicks</TypoCaption>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">+{analytics.starsGrowth30d}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">New Stars</TypoCaption>
        </div>
      </div>
      <div className="space-y-1">
        {analytics.trafficSources.slice(0, 3).map(src => (
          <div key={src.source} className="flex justify-between">
            <TypoCaption className="text-muted-foreground">{src.source}</TypoCaption>
            <TypoCaption className="text-foreground font-medium">{formatNumber(src.visits)}</TypoCaption>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// CollectionCard
// ============================================================================

export function CollectionCard({ collection }: { collection: ShowcaseCollection }) {
  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200">
      <TypoHeading level={5} className="font-semibold text-foreground mb-1">{collection.name}</TypoHeading>
      <TypoCaption className="text-muted-foreground block mb-2">{collection.description}</TypoCaption>
      <div className="flex items-center justify-between">
        <TypoCaption className="text-foreground font-medium">{collection.projectIds.length} projects</TypoCaption>
        <TypoCaption className="text-muted-foreground">by {collection.curatedBy}</TypoCaption>
      </div>
    </Card>
  );
}

// ============================================================================
// GitHubStatsCard
// ============================================================================

export function GitHubStatsCard({ stats }: { stats: GitHubStats }) {
  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-3">GitHub Overview</TypoHeading>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{stats.totalRepos}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Repos</TypoCaption>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-500">{formatNumber(stats.totalStars)}</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Stars</TypoCaption>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{stats.contributionStreak}d</p>
          <TypoCaption className="text-muted-foreground text-[10px]">Streak</TypoCaption>
        </div>
      </div>
      <div className="space-y-1">
        {stats.languages.slice(0, 4).map(lang => (
          <div key={lang.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }} />
            <TypoCaption className="text-foreground text-xs flex-1">{lang.name}</TypoCaption>
            <TypoCaption className="text-muted-foreground text-xs">{(lang.bytes / 1000).toFixed(0)}KB</TypoCaption>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// InsightCard
// ============================================================================

export function InsightCard({ insight }: { insight: ProjectInsight }) {
  const typeConfig: Record<string, { color: string; icon: string }> = {
    success: { color: '#4caf50', icon: '✅' },
    warning: { color: '#ff9800', icon: '⚠️' },
    tip: { color: '#00e5ff', icon: '💡' },
    info: { color: '#9c27b0', icon: 'ℹ️' },
  };
  const config = typeConfig[insight.type];

  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200" style={{ borderLeft: `3px solid ${config.color}` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{config.icon}</span>
        <TypoHeading level={5} className="font-semibold text-foreground flex-1 text-sm">{insight.title}</TypoHeading>
        {insight.actionable && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Actionable</span>
        )}
      </div>
      <TypoCaption className="text-muted-foreground block mb-1">{insight.description}</TypoCaption>
      {insight.metric && (
        <TypoCaption className="text-muted-foreground">{insight.metric}: <span className="text-foreground font-medium">{insight.value}</span></TypoCaption>
      )}
    </Card>
  );
}
