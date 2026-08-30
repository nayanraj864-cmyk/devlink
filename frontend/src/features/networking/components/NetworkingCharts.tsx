import React from 'react';
import type { DeveloperProfile, Connection } from '../types';
import { Card } from '@/components/shared/primitives';
import { TypoHeading } from '@/components/shared/Typography';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

// ============================================================================
// SkillOverlapRadar — radar comparing your skills vs a connection's
// ============================================================================

export function SkillOverlapRadar({ yourSkills, theirSkills, title }: {
  yourSkills: string[]; theirSkills: string[]; title: string;
}) {
  const allSkills = [...new Set([...yourSkills, ...theirSkills])].slice(0, 8);
  const radarData = allSkills.map(skill => ({
    skill,
    you: yourSkills.includes(skill) ? 85 : 0,
    them: theirSkills.includes(skill) ? 85 : 0,
  }));

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="skill" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
          <Radar name="You" dataKey="you" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
          <Radar name="Them" dataKey="them" stroke="#4caf50" fill="#4caf50" fillOpacity={0.15} strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// NetworkGrowthLine — line chart of network growth over time
// ============================================================================

export function NetworkGrowthLine({ data, title }: {
  data: { month: string; connections: number; groups: number }[];
  title: string;
}) {
  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey="connections" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="groups" stroke="#4caf50" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// ActivityBar — bar chart of connection activity
// ============================================================================

export function ActivityBar({ connections, title }: {
  connections: { developer: { name: string }; interactionScore: number }[];
  title: string;
}) {
  const data = connections.map(c => ({
    name: c.developer.name.split(' ')[0],
    score: c.interactionScore,
  }));

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ============================================================================
// MatchDonut — donut chart of match score distribution
// ============================================================================

export function MatchDonut({ profiles, title }: {
  profiles: { matchScore: string | null }[];
  title: string;
}) {
  const counts: Record<string, number> = {};
  profiles.forEach(p => {
    const score = p.matchScore || 'none';
    counts[score] = (counts[score] || 0) + 1;
  });

  const colors: Record<string, string> = { perfect: '#ffd700', strong: '#4caf50', good: '#2196f3', fair: '#9e9e9e', none: '#607d8b' };
  const pieData = Object.entries(counts).map(([name, value]) => ({ name, value, color: colors[name] || '#666' }));

  return (
    <Card className="p-4">
      <TypoHeading level={5} className="font-semibold text-foreground mb-4">{title}</TypoHeading>
      <div className="flex items-center justify-center gap-6">
        <ResponsiveContainer width="40%" height={180}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {pieData.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <TypoCaption className="text-foreground text-xs capitalize">{d.name}</TypoCaption>
              <TypoCaption className="text-muted-foreground text-xs ml-auto">{d.value}</TypoCaption>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
