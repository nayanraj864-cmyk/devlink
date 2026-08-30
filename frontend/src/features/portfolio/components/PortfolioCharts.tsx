import React from 'react';
import type { ProjectAnalytics, GitHubStats } from '../types';
import { Card } from '@/components/shared/primitives';
import { TypoHeading } from '@/components/shared/Typography';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ============================================================================
// ViewsTrend — area chart of daily views
// ============================================================================

export function ViewsTrend({ analytics, title }: { analytics: ProjectAnalytics; title: string }) {
  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={analytics.dailyViews}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
          <Area type="monotone" dataKey="unique" stroke="#4caf50" fill="#4caf50" fillOpacity={0.1} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// TrafficPie — donut chart of traffic sources
// ============================================================================

export function TrafficPie({ sources, title }: { sources: { source: string; visits: number }[]; title: string }) {
  const colors = ['#00e5ff', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#ffd700'];
  const total = sources.reduce((s, src) => s + src.visits, 0);

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <div className="flex items-center justify-center gap-6">
        <ResponsiveContainer width="45%" height={180}>
          <PieChart>
            <Pie data={sources} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="visits" nameKey="source">
              {sources.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {sources.map((src, i) => (
            <div key={src.source} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              <TypoCaption className="text-foreground text-xs">{src.source}</TypoCaption>
              <TypoCaption className="text-muted-foreground text-xs ml-auto">{((src.visits / total) * 100).toFixed(0)}%</TypoCaption>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// LanguageBar — horizontal bar chart of languages
// ============================================================================

export function LanguageBar({ stats, title }: { stats: GitHubStats; title: string }) {
  const total = stats.languages.reduce((s, l) => s + l.bytes, 0);

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <div className="space-y-2">
        {stats.languages.map(lang => (
          <div key={lang.name}>
            <div className="flex justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lang.color }} />
                <TypoCaption className="text-foreground text-xs">{lang.name}</TypoCaption>
              </div>
              <TypoCaption className="text-muted-foreground text-xs">{((lang.bytes / total) * 100).toFixed(1)}%</TypoCaption>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(lang.bytes / total) * 100}%`, backgroundColor: lang.color }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// ContributionBar — bar chart of yearly contributions
// ============================================================================

export function ContributionBar({ stats, title }: { stats: GitHubStats; title: string }) {
  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={stats.yearlyContributions}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// RatingRadar — radar chart of project ratings
// ============================================================================

export function RatingRadar({ reviews, title }: { reviews: { codeQuality: number; documentation: number; innovation: number }[]; title: string }) {
  const avgCode = reviews.reduce((s, r) => s + r.codeQuality, 0) / reviews.length;
  const avgDocs = reviews.reduce((s, r) => s + r.documentation, 0) / reviews.length;
  const avgInno = reviews.reduce((s, r) => s + r.innovation, 0) / reviews.length;

  const radarData = [
    { metric: 'Code Quality', value: Math.round(avgCode), fullMark: 100 },
    { metric: 'Documentation', value: Math.round(avgDocs), fullMark: 100 },
    { metric: 'Innovation', value: Math.round(avgInno), fullMark: 100 },
    { metric: 'Overall', value: Math.round((avgCode + avgDocs + avgInno) / 3), fullMark: 100 },
  ];

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
          <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
