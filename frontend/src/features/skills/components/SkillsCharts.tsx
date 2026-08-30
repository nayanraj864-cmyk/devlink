import React from 'react';
import type { Skill, MarketTrend, SkillTimeline } from '../types';
import { SKILL_CATEGORY_COLORS, SKILL_CATEGORY_ICONS, formatCurrency } from '../types';
import { Card } from '@/components/shared/primitives';
import { TypoHeading, TypoCaption } from '@/components/shared/Typography';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';

// ============================================================================
// SkillRadar — radar chart of top skills
// ============================================================================

export function SkillRadar({ skills, title }: { skills: Skill[]; title: string }) {
  const radarData = skills.slice(0, 8).map(s => ({
    skill: s.name,
    proficiency: s.proficiency,
    fullMark: 100,
  }));

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Radar name="Proficiency" dataKey="proficiency" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// ProficiencyBar — horizontal bar chart of skills by proficiency
// ============================================================================

export function ProficiencyBar({ skills, title }: { skills: Skill[]; title: string }) {
  const barData = skills.sort((a, b) => b.proficiency - a.proficiency).slice(0, 10).map(s => ({
    name: s.name,
    proficiency: s.proficiency,
    endorsements: s.endorsements,
  }));

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={barData} layout="vertical" margin={{ left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} width={60} />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Bar dataKey="proficiency" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// CategoryDonut — donut chart of skills by category
// ============================================================================

export function CategoryDonut({ skills, title }: { skills: Skill[]; title: string }) {
  const categoryCounts: Record<string, number> = {};
  skills.forEach(s => { categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1; });

  const pieData = Object.entries(categoryCounts).map(([cat, count]) => ({
    name: cat,
    value: count,
    color: SKILL_CATEGORY_COLORS[cat as keyof typeof SKILL_CATEGORY_COLORS] || '#666',
  }));

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <div className="flex items-center justify-center gap-6">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <TypoCaption className="text-foreground capitalize">{d.name}</TypoCaption>
              <TypoCaption className="text-muted-foreground ml-auto">{d.value}</TypoCaption>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// MarketBar — bar chart of market demand by skill
// ============================================================================

export function MarketBar({ trends, title }: { trends: MarketTrend[]; title: string }) {
  const data = trends.sort((a, b) => b.demand - a.demand).slice(0, 8);

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="skill" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
            formatter={(value: number, name: string) => [name === 'avgSalary' ? formatCurrency(value) : value, name]}
          />
          <Legend />
          <Bar dataKey="demand" fill="hsl(var(--primary))" name="Demand" radius={[4, 4, 0, 0]} />
          <Bar dataKey="growth" fill="#4caf50" name="Growth %" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// TimelineLine — line chart of skill proficiency over time
// ============================================================================

export function TimelineLine({ timeline, title }: { timeline: SkillTimeline[]; title: string }) {
  // Group by date
  const dates = [...new Set(timeline.map(t => t.date))];
  const skills = [...new Set(timeline.map(t => t.skill))];

  const chartData = dates.map(date => {
    const point: Record<string, any> = { date };
    skills.forEach(skill => {
      const entry = timeline.find(t => t.date === date && t.skill === skill);
      point[skill] = entry?.proficiency || 0;
    });
    return point;
  });

  const colors = ['#00e5ff', '#4caf50', '#ff9800', '#9c27b0', '#f44336'];

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          <Legend />
          {skills.map((skill, i) => (
            <Line key={skill} type="monotone" dataKey={skill} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
