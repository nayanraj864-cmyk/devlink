/**
 * Developer Skills & Tech Stack Dashboard
 * Type definitions for skills, tech stacks, learning paths, and certifications
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'data' | 'mobile' | 'design' | 'security' | 'ai-ml';
export type TrendDirection = 'rising' | 'stable' | 'declining';
export type LearningStatus = 'not-started' | 'in-progress' | 'completed' | 'bookmarked';
export type CertStatus = 'earned' | 'in-progress' | 'expired' | 'planned';
export type SkillSource = 'project' | 'course' | 'certification' | 'contribution' | 'self-taught';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  yearsExperience: number;
  proficiency: number; // 0-100
  trend: TrendDirection;
  trendChange: number; // +/- percentage
  endorsements: number;
  projectsUsed: number;
  lastUsedAt: string;
  source: SkillSource;
  tags: string[];
}

export interface TechStack {
  id: string;
  name: string;
  description: string;
  skills: string[];
  projectsCount: number;
  popularity: number; // 0-100
  marketDemand: TrendDirection;
  avgSalary: number;
  color: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  skills: string[];
  totalHours: number;
  completedHours: number;
  status: LearningStatus;
  difficulty: SkillLevel;
  estimatedCompletion: string;
  modules: { name: string; completed: boolean }[];
  createdAt: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  skills: string[];
  status: CertStatus;
  earnedAt: string | null;
  expiresAt: string | null;
  credentialId: string;
  badgeColor: string;
}

export interface SkillEndorsement {
  id: string;
  skillName: string;
  endorsedBy: string;
  endorsedByAvatar: string;
  projectContext: string;
  message: string;
  createdAt: string;
}

export interface SkillGap {
  skill: string;
  currentLevel: SkillLevel;
  targetLevel: SkillLevel;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  recommendedResources: string[];
}

export interface SkillTimeline {
  date: string;
  skill: string;
  level: SkillLevel;
  proficiency: number;
  endorsements: number;
}

export interface MarketTrend {
  skill: string;
  demand: number;
  growth: number;
  avgSalary: number;
  jobPostings: number;
  trend: TrendDirection;
}

export interface SkillsSummary {
  totalSkills: number;
  expertLevel: number;
  totalEndorsements: number;
  activeProjects: number;
  certsEarned: number;
  learningInProgress: number;
  topCategory: SkillCategory;
  avgProficiency: number;
}

// ============================================================================
// Helper Utilities
// ============================================================================

export const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: '#607d8b',
  intermediate: '#2196f3',
  advanced: '#ff9800',
  expert: '#4caf50',
  master: '#ffd700',
};

export const SKILL_CATEGORY_ICONS: Record<SkillCategory, string> = {
  frontend: '🎨',
  backend: '⚙️',
  devops: '🔧',
  data: '📊',
  mobile: '📱',
  design: '✏️',
  security: '🔒',
  'ai-ml': '🤖',
};

export const SKILL_CATEGORY_COLORS: Record<SkillCategory, string> = {
  frontend: '#00e5ff',
  backend: '#4caf50',
  devops: '#ff9800',
  data: '#9c27b0',
  mobile: '#e91e63',
  design: '#ff6b35',
  security: '#f44336',
  'ai-ml': '#ffd700',
};

export const TREND_ICONS: Record<TrendDirection, string> = {
  rising: '📈',
  stable: '➡️',
  declining: '📉',
};

export const STATUS_COLORS: Record<LearningStatus, string> = {
  'not-started': '#9e9e9e',
  'in-progress': '#2196f3',
  completed: '#4caf50',
  bookmarked: '#ff9800',
};

export const CERT_STATUS_COLORS: Record<CertStatus, string> = {
  earned: '#4caf50',
  'in-progress': '#2196f3',
  expired: '#f44336',
  planned: '#9e9e9e',
};

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function getProficiencyColor(prof: number): string {
  if (prof >= 90) return '#ffd700';
  if (prof >= 75) return '#4caf50';
  if (prof >= 50) return '#ff9800';
  if (prof >= 25) return '#2196f3';
  return '#607d8b';
}
