import React from 'react';
import type {
  Skill, TechStack, LearningPath, Certification, SkillEndorsement,
  SkillGap, MarketTrend,
} from '../types';
import {
  SKILL_LEVEL_COLORS, SKILL_CATEGORY_ICONS, SKILL_CATEGORY_COLORS,
  TREND_ICONS, STATUS_COLORS, CERT_STATUS_COLORS,
  formatNumber, formatCurrency, formatRelativeTime, getProficiencyColor,
} from '../types';
import { Card } from '@/components/shared/primitives';
import { TypoCaption, TypoHeading } from '@/components/shared/Typography';

// ============================================================================
// SkillCard
// ============================================================================

export function SkillCard({ skill }: { skill: Skill }) {
  const levelColor = SKILL_LEVEL_COLORS[skill.level];
  const categoryIcon = SKILL_CATEGORY_ICONS[skill.category];
  const categoryColor = SKILL_CATEGORY_COLORS[skill.category];

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryIcon}</span>
          <div>
            <TypoHeading level={5} className="font-semibold text-foreground">{skill.name}</TypoHeading>
            <TypoCaption className="text-muted-foreground capitalize">{skill.category} · {skill.yearsExperience}y exp</TypoCaption>
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full text-white"
          style={{ backgroundColor: levelColor }}
        >
          {skill.level}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <TypoCaption className="text-muted-foreground">Proficiency</TypoCaption>
          <TypoCaption className="text-foreground font-medium">{skill.proficiency}%</TypoCaption>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${skill.proficiency}%`, backgroundColor: getProficiencyColor(skill.proficiency) }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <TypoCaption className="text-muted-foreground">Endorsements</TypoCaption>
          <p className="text-sm font-semibold text-foreground">{skill.endorsements}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground">Projects</TypoCaption>
          <p className="text-sm font-semibold text-foreground">{skill.projectsUsed}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground">Trend</TypoCaption>
          <p className="text-sm font-semibold">
            {TREND_ICONS[skill.trend]} <span className={skill.trendChange > 0 ? 'text-green-500' : skill.trendChange < 0 ? 'text-red-500' : 'text-muted-foreground'}>
              {skill.trendChange > 0 ? '+' : ''}{skill.trendChange}%
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {skill.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {tag}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// TechStackCard
// ============================================================================

export function TechStackCard({ stack }: { stack: TechStack }) {
  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200" style={{ borderLeft: `3px solid ${stack.color}` }}>
      <TypoHeading level={5} className="font-semibold text-foreground mb-1">{stack.name}</TypoHeading>
      <TypoCaption className="text-muted-foreground block mb-3">{stack.description}</TypoCaption>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <TypoCaption className="text-muted-foreground">Projects</TypoCaption>
          <p className="text-sm font-semibold text-foreground">{stack.projectsCount}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground">Avg Salary</TypoCaption>
          <p className="text-sm font-semibold text-green-500">{formatCurrency(stack.avgSalary)}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <TypoCaption className="text-muted-foreground">Market Demand</TypoCaption>
          <TypoCaption className="text-foreground">{TREND_ICONS[stack.marketDemand]} {stack.marketDemand}</TypoCaption>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${stack.popularity}%`, backgroundColor: stack.color }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {stack.skills.map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
            {s}
          </span>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// LearningPathCard
// ============================================================================

export function LearningPathCard({ path }: { path: LearningPath }) {
  const progress = (path.completedHours / path.totalHours) * 100;
  const statusColor = STATUS_COLORS[path.status];

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-start mb-2">
        <TypoHeading level={5} className="font-semibold text-foreground">{path.title}</TypoHeading>
        <span className="text-xs font-semibold px-2 py-1 rounded-full text-white" style={{ backgroundColor: statusColor }}>
          {path.status}
        </span>
      </div>
      <TypoCaption className="text-muted-foreground block mb-3">{path.description}</TypoCaption>

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <TypoCaption className="text-muted-foreground">{path.completedHours}/{path.totalHours} hours</TypoCaption>
          <TypoCaption className="text-foreground font-medium">{Math.round(progress)}%</TypoCaption>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-1">
        {path.modules.slice(0, 4).map((mod, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={mod.completed ? 'text-green-500' : 'text-muted-foreground'}>
              {mod.completed ? '✅' : '⬜'}
            </span>
            <TypoCaption className={mod.completed ? 'text-foreground line-through opacity-60' : 'text-foreground'}>
              {mod.name}
            </TypoCaption>
          </div>
        ))}
        {path.modules.length > 4 && (
          <TypoCaption className="text-muted-foreground">+{path.modules.length - 4} more modules</TypoCaption>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// CertificationCard
// ============================================================================

export function CertificationCard({ cert }: { cert: Certification }) {
  const statusColor = CERT_STATUS_COLORS[cert.status];

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-200" style={{ borderLeft: `3px solid ${cert.badgeColor}` }}>
      <div className="flex justify-between items-start mb-2">
        <TypoHeading level={5} className="font-semibold text-foreground text-sm">{cert.name}</TypoHeading>
        <span className="text-xs font-semibold px-2 py-1 rounded-full text-white" style={{ backgroundColor: statusColor }}>
          {cert.status}
        </span>
      </div>
      <TypoCaption className="text-muted-foreground block mb-2">{cert.issuer}</TypoCaption>

      {cert.earnedAt && (
        <TypoCaption className="text-foreground block mb-1">Earned: {new Date(cert.earnedAt).toLocaleDateString()}</TypoCaption>
      )}
      {cert.expiresAt && (
        <TypoCaption className="text-muted-foreground block mb-2">Expires: {new Date(cert.expiresAt).toLocaleDateString()}</TypoCaption>
      )}
      {cert.credentialId && (
        <TypoCaption className="text-muted-foreground block font-mono text-xs">{cert.credentialId}</TypoCaption>
      )}

      <div className="flex flex-wrap gap-1 mt-2">
        {cert.skills.map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// EndorsementCard
// ============================================================================

export function EndorsementCard({ endorsement }: { endorsement: SkillEndorsement }) {
  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          {endorsement.endorsedBy.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{endorsement.endorsedBy}</p>
          <TypoCaption className="text-muted-foreground">{endorsement.projectContext}</TypoCaption>
        </div>
      </div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-semibold text-primary">{endorsement.skillName}</span>
        <TypoCaption className="text-muted-foreground">endorsement</TypoCaption>
      </div>
      <p className="text-sm text-muted-foreground italic">"{endorsement.message}"</p>
      <TypoCaption className="text-muted-foreground mt-2 block">{formatRelativeTime(endorsement.createdAt)}</TypoCaption>
    </Card>
  );
}

// ============================================================================
// GapCard
// ============================================================================

export function GapCard({ gap }: { gap: SkillGap }) {
  const priorityColors = { high: '#f44336', medium: '#ff9800', low: '#4caf50' };
  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200" style={{ borderLeft: `3px solid ${priorityColors[gap.priority]}` }}>
      <div className="flex justify-between items-center mb-1">
        <TypoHeading level={5} className="font-semibold text-foreground text-sm">{gap.skill}</TypoHeading>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: priorityColors[gap.priority] }}>
          {gap.priority}
        </span>
      </div>
      <TypoCaption className="text-muted-foreground block mb-2">
        {gap.currentLevel} → {gap.targetLevel} · ~{gap.estimatedHours}h
      </TypoCaption>
      <div className="flex flex-wrap gap-1">
        {gap.recommendedResources.slice(0, 2).map(r => (
          <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{r}</span>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// MarketTrendCard
// ============================================================================

export function MarketTrendCard({ trend }: { trend: MarketTrend }) {
  return (
    <Card className="p-3 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-center mb-2">
        <TypoHeading level={5} className="font-semibold text-foreground">{trend.skill}</TypoHeading>
        <span className="text-sm">{TREND_ICONS[trend.trend]}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <TypoCaption className="text-muted-foreground">Demand</TypoCaption>
          <p className="text-sm font-semibold text-foreground">{trend.demand}/100</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground">Growth</TypoCaption>
          <p className="text-sm font-semibold text-green-500">+{trend.growth}%</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground">Avg Salary</TypoCaption>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(trend.avgSalary)}</p>
        </div>
        <div>
          <TypoCaption className="text-muted-foreground">Job Posts</TypoCaption>
          <p className="text-sm font-semibold text-foreground">{formatNumber(trend.jobPostings)}</p>
        </div>
      </div>
    </Card>
  );
}
