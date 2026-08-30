/**
 * Project Portfolio Showcase — GitHub integration & live demos
 * Type definitions for projects, demos, reviews, analytics, and showcases
 */

export type ProjectStatus = 'active' | 'archived' | 'in-development' | 'maintenance' | 'deprecated';
export type ProjectVisibility = 'public' | 'private' | 'unlisted';
export type DemoStatus = 'live' | 'building' | 'error' | 'stopped';
export type LicenseType = 'mit' | 'apache-2.0' | 'gpl-3.0' | 'bsd-3' | 'unlicense' | 'proprietary' | 'other';
export type ReviewSentiment = 'positive' | 'neutral' | 'negative';
export type ShowcaseCategory = 'fullstack' | 'frontend' | 'backend' | 'mobile' | 'ai-ml' | 'devtools' | 'open-source' | 'hackathon';
export type TechTag = string;

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  category: ShowcaseCategory;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  license: LicenseType;
  techStack: TechTag[];
  githubUrl: string;
  demoUrl: string | null;
  demoStatus: DemoStatus;
  documentationUrl: string | null;
  screenshotUrl: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  totalCommits: number;
  contributors: number;
  lastCommitAt: string;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  tags: string[];
}

export interface ProjectReview {
  id: string;
  projectId: string;
  projectName: string;
  reviewer: string;
  reviewerAvatar: string;
  rating: number; // 1-5
  sentiment: ReviewSentiment;
  comment: string;
  codeQuality: number;
  documentation: number;
  innovation: number;
  createdAt: string;
}

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  views30d: number;
  uniqueVisitors30d: number;
  demoClicks30d: number;
  githubClicks30d: number;
  starsGrowth30d: number;
  forksGrowth30d: number;
  dailyViews: { date: string; views: number; unique: number }[];
  trafficSources: { source: string; visits: number }[];
  topReferrers: { referrer: string; count: number }[];
}

export interface ShowcaseCollection {
  id: string;
  name: string;
  description: string;
  projectIds: string[];
  isPublic: boolean;
  createdAt: string;
  curatedBy: string;
}

export interface GitHubStats {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  languages: { name: string; bytes: number; color: string }[];
  contributionStreak: number;
  longestStreak: number;
  totalContributions: number;
  yearlyContributions: { month: string; count: number }[];
}

export interface ProjectInsight {
  id: string;
  type: 'tip' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  metric?: string;
  value?: string;
  actionable: boolean;
}

export interface PortfolioSummary {
  totalProjects: number;
  activeProjects: number;
  featuredProjects: number;
  totalStars: number;
  totalForks: number;
  avgRating: number;
  totalViews30d: number;
  demoLiveCount: number;
}

// ============================================================================
// Helper Utilities
// ============================================================================

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: '#4caf50',
  archived: '#9e9e9e',
  'in-development': '#ff9800',
  maintenance: '#2196f3',
  deprecated: '#f44336',
};

export const DEMO_STATUS_COLORS: Record<DemoStatus, string> = {
  live: '#4caf50',
  building: '#ff9800',
  error: '#f44336',
  stopped: '#9e9e9e',
};

export const CATEGORY_ICONS: Record<ShowcaseCategory, string> = {
  fullstack: '🌐', frontend: '🎨', backend: '⚙️', mobile: '📱',
  'ai-ml': '🤖', devtools: '🔧', 'open-source': '📦', hackathon: '🏆',
};

export const CATEGORY_COLORS: Record<ShowcaseCategory, string> = {
  fullstack: '#00e5ff', frontend: '#ff6b35', backend: '#4caf50', mobile: '#e91e63',
  'ai-ml': '#ffd700', devtools: '#ff9800', 'open-source': '#2196f3', hackathon: '#9c27b0',
};

export const LICENSE_SHORT: Record<LicenseType, string> = {
  mit: 'MIT', 'apache-2.0': 'Apache 2.0', 'gpl-3.0': 'GPL-3.0', 'bsd-3': 'BSD-3',
  unlicense: 'Unlicense', proprietary: 'Proprietary', other: 'Other',
};

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
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
