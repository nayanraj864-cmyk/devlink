import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  GitPullRequest, GitBranch, GitMerge, Coins, Trophy, Award, Star,
  Clock, AlertTriangle, CheckCircle2, XCircle, ExternalLink, Eye,
  ChevronDown, ChevronUp, Search, Filter, Heart, Flame, Zap, Shield,
  Target, TrendingUp, TrendingDown, BarChart3, Users, MessageSquare,
  Bookmark, Share2, Code2, Globe, Database, Server, Layers, Palette,
  Brain, Rocket, Lightbulb, Sparkles, Crown, Medal, Flag, Map,
  ArrowUpRight, ArrowRight, CircleDot, Hash, Calendar, Bell,
  DollarSign, Banknote, CreditCard, Wallet, Download, RefreshCw,
  Info, AlertCircle, ThumbsUp, ThumbsDown, Minus, Play, Pause,
} from "lucide-react";
import { Card } from "@/components/shared/primitives";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/bounties")({
  head: () => ({
    meta: [
      { title: "Open Source Bounty Board — DevLink" },
      { name: "description", content: "Find open source bounties, earn rewards, and build your contributor reputation." },
    ],
  }),
  component: BountyBoard,
});

/* ─────────────── Types ─────────────── */

type BountyStatus = "open" | "in_progress" | "review" | "completed" | "cancelled";
type BountyDifficulty = "good_first_issue" | "easy" | "medium" | "hard" | "expert";
type BountyCategory = "bug_fix" | "feature" | "documentation" | "design" | "testing" | "security" | "performance" | "refactor";
type PaymentType = "fixed" | "hourly" | "negotiable";

interface Bounty {
  id: string;
  title: string;
  description: string;
  repository: string;
  repoOwner: string;
  issueUrl: string;
  status: BountyStatus;
  difficulty: BountyDifficulty;
  category: BountyCategory;
  reward: number;
  paymentType: PaymentType;
  currency: string;
  tags: string[];
  language: string[];
  submittedBy: string;
  submittedAt: string;
  deadline: string | null;
  assignee: string | null;
  claims: number;
  comments: number;
  upvotes: number;
  timeEstimate: string;
  skillsRequired: string[];
  difficulty_score: number;
}

interface Contribution {
  id: string;
  bountyId: string;
  bountyTitle: string;
  repository: string;
  prUrl: string;
  prNumber: number;
  status: "submitted" | "reviewing" | "approved" | "merged" | "rejected";
  submittedAt: string;
  reward: number;
  earned: number;
  feedback: string;
  reviewer: string;
  mergeTime: string | null;
}

interface BountyStats {
  totalEarned: number;
  totalBounties: number;
  completedBounties: number;
  avgReward: number;
  successRate: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  xp: number;
  maxXp: number;
  rank: number;
  totalDevs: number;
  topLanguages: { language: string; bounties: number; earned: number }[];
  monthlyEarnings: { month: number; earned: number; count: number }[];
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  totalEarned: number;
  bountiesCompleted: number;
  successRate: number;
  level: number;
  streak: number;
  topSkill: string;
}

/* ─────────────── Constants ─────────────── */

const STATUS_CONFIG: Record<BountyStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  open: { color: "text-green-400", bg: "bg-green-500/20", icon: <Play size={14} />, label: "Open" },
  in_progress: { color: "text-yellow-400", bg: "bg-yellow-500/20", icon: <Pause size={14} />, label: "In Progress" },
  review: { color: "text-blue-400", bg: "bg-blue-500/20", icon: <Eye size={14} />, label: "Under Review" },
  completed: { color: "text-purple-400", bg: "bg-purple-500/20", icon: <CheckCircle2 size={14} />, label: "Completed" },
  cancelled: { color: "text-gray-400", bg: "bg-gray-500/20", icon: <XCircle size={14} />, label: "Cancelled" },
};

const DIFFICULTY_CONFIG: Record<BountyDifficulty, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  good_first_issue: { color: "text-green-400", bg: "bg-green-500/20", label: "Good First Issue", icon: <Flag size={14} /> },
  easy: { color: "text-cyan-400", bg: "bg-cyan-500/20", label: "Easy", icon: <Zap size={14} /> },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Medium", icon: <Target size={14} /> },
  hard: { color: "text-orange-400", bg: "bg-orange-500/20", label: "Hard", icon: <Flame size={14} /> },
  expert: { color: "text-red-400", bg: "bg-red-500/20", label: "Expert", icon: <Crown size={14} /> },
};

const CATEGORY_CONFIG: Record<BountyCategory, { color: string; icon: React.ReactNode; label: string }> = {
  bug_fix: { color: "text-red-400", icon: <AlertCircle size={14} />, label: "Bug Fix" },
  feature: { color: "text-green-400", icon: <Rocket size={14} />, label: "Feature" },
  documentation: { color: "text-blue-400", icon: <FileText size={14} />, label: "Documentation" },
  design: { color: "text-pink-400", icon: <Palette size={14} />, label: "Design" },
  testing: { color: "text-purple-400", icon: <CheckCircle2 size={14} />, label: "Testing" },
  security: { color: "text-orange-400", icon: <Shield size={14} />, label: "Security" },
  performance: { color: "text-yellow-400", icon: <Zap size={14} />, label: "Performance" },
  refactor: { color: "text-cyan-400", icon: <Layers size={14} />, label: "Refactor" },
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178C6", JavaScript: "#F7DF1E", Python: "#3572A5", Rust: "#DEA584",
  Go: "#00ADD8", Java: "#B07219", "C++": "#F34B7D", Ruby: "#701516",
  Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB", Shell: "#89E051",
};

/* ─────────────── Sample Data ─────────────── */

const BOUNTIES: Bounty[] = [
  { id: "b1", title: "Fix memory leak in WebSocket reconnection", description: "The WebSocket client leaks memory when reconnecting after network drops. Need to properly clean up event listeners and timeouts.", repository: "realtime-app", repoOwner: "acme-corp", issueUrl: "#1234", status: "open", difficulty: "medium", category: "bug_fix", reward: 250, paymentType: "fixed", currency: "USD", tags: ["websocket", "memory-leak", "cleanup"], language: ["TypeScript"], submittedBy: "maintainer-alex", submittedAt: "2026-08-25", deadline: "2026-09-15", assignee: null, claims: 3, comments: 8, upvotes: 24, timeEstimate: "4-6 hours", skillsRequired: ["TypeScript", "WebSockets", "Memory Management"], difficulty_score: 5 },
  { id: "b2", title: "Add dark mode support to dashboard", description: "Implement a theme toggle with CSS variables and localStorage persistence. Must follow the existing design system.", repository: "admin-dashboard", repoOwner: "startup-io", issueUrl: "#567", status: "open", difficulty: "easy", category: "feature", reward: 150, paymentType: "fixed", currency: "USD", tags: ["dark-mode", "ui", "theming"], language: ["TypeScript", "CSS"], submittedBy: "design-lead", submittedAt: "2026-08-28", deadline: "2026-09-10", assignee: null, claims: 5, comments: 12, upvotes: 45, timeEstimate: "2-3 hours", skillsRequired: ["CSS Variables", "React", "Design Systems"], difficulty_score: 3 },
  { id: "b3", title: "Implement rate limiting middleware", description: "Create an Express middleware for API rate limiting with sliding window algorithm, Redis backend, and configurable limits per endpoint.", repository: "api-gateway", repoOwner: "cloud-services", issueUrl: "#890", status: "in_progress", difficulty: "hard", category: "feature", reward: 500, paymentType: "fixed", currency: "USD", tags: ["rate-limiting", "middleware", "redis"], language: ["TypeScript"], submittedBy: "tech-lead-sam", submittedAt: "2026-08-20", deadline: "2026-09-05", assignee: "dev-jordan", claims: 2, comments: 15, upvotes: 67, timeEstimate: "8-12 hours", skillsRequired: ["Express", "Redis", "TypeScript", "Algorithms"], difficulty_score: 7 },
  { id: "b4", title: "Write API documentation for v2 endpoints", description: "Document all v2 REST endpoints with request/response examples, error codes, and authentication requirements using OpenAPI 3.0.", repository: "api-docs", repoOwner: "devtools-inc", issueUrl: "#234", status: "open", difficulty: "easy", category: "documentation", reward: 100, paymentType: "fixed", currency: "USD", tags: ["docs", "openapi", "rest"], language: ["YAML"], submittedBy: "docs-team", submittedAt: "2026-08-29", deadline: null, assignee: null, claims: 1, comments: 4, upvotes: 18, timeEstimate: "3-5 hours", skillsRequired: ["OpenAPI", "REST", "Technical Writing"], difficulty_score: 2 },
  { id: "b5", title: "Fix XSS vulnerability in markdown renderer", description: "The markdown renderer doesn't sanitize HTML in user content, allowing XSS attacks. Implement DOMPurify or similar sanitization.", repository: "note-taking-app", repoOwner: "opennotes", issueUrl: "#678", status: "review", difficulty: "medium", category: "security", reward: 350, paymentType: "fixed", currency: "USD", tags: ["xss", "security", "sanitization"], language: ["TypeScript"], submittedBy: "security-team", submittedAt: "2026-08-15", deadline: "2026-08-30", assignee: "sec-dev-kai", claims: 4, comments: 20, upvotes: 89, timeEstimate: "3-4 hours", skillsRequired: ["XSS Prevention", "DOM Sanitization", "TypeScript"], difficulty_score: 5 },
  { id: "b6", title: "Optimize PostgreSQL queries for analytics", description: "Several analytics queries are taking 5+ seconds. Add proper indexes, optimize JOINs, and implement materialized views for dashboard aggregations.", repository: "analytics-engine", repoOwner: "data-platform", issueUrl: "#456", status: "open", difficulty: "expert", category: "performance", reward: 750, paymentType: "negotiable", currency: "USD", tags: ["postgresql", "optimization", "analytics"], language: ["TypeScript", "SQL"], submittedBy: "db-admin", submittedAt: "2026-08-22", deadline: "2026-09-20", assignee: null, claims: 1, comments: 9, upvotes: 56, timeEstimate: "10-15 hours", skillsRequired: ["PostgreSQL", "Query Optimization", "Indexing", "Materialized Views"], difficulty_score: 9 },
  { id: "b7", title: "Add unit tests for payment processing", description: "Write comprehensive unit tests for the payment processing module covering Stripe webhooks, refund logic, and edge cases.", repository: "payment-service", repoOwner: "fintech-startup", issueUrl: "#345", status: "open", difficulty: "medium", category: "testing", reward: 200, paymentType: "fixed", currency: "USD", tags: ["testing", "stripe", "unit-tests"], language: ["TypeScript"], submittedBy: "qa-lead", submittedAt: "2026-08-27", deadline: "2026-09-12", assignee: null, claims: 2, comments: 6, upvotes: 32, timeEstimate: "5-7 hours", skillsRequired: ["Jest", "Testing Patterns", "Stripe API"], difficulty_score: 5 },
  { id: "b8", title: "Redesign user settings page", description: "Modernize the settings page with a tabbed layout, better grouping, and improved accessibility. Must follow the new design system.", repository: "web-app", repoOwner: "design-studio", issueUrl: "#789", status: "open", difficulty: "medium", category: "design", reward: 300, paymentType: "fixed", currency: "USD", tags: ["design", "ui", "accessibility"], language: ["TypeScript"], submittedBy: "ux-lead", submittedAt: "2026-08-26", deadline: "2026-09-15", assignee: null, claims: 3, comments: 11, upvotes: 41, timeEstimate: "6-8 hours", skillsRequired: ["React", "CSS", "Accessibility", "Design Systems"], difficulty_score: 5 },
];

const CONTRIBUTIONS: Contribution[] = [
  { id: "c1", bountyId: "b5", bountyTitle: "Fix XSS vulnerability in markdown renderer", repository: "note-taking-app", prUrl: "https://github.com/opennotes/note-taking-app/pull/892", prNumber: 892, status: "reviewing", submittedAt: "2026-08-28", reward: 350, earned: 0, feedback: "Looks good! Minor suggestions on the test coverage.", reviewer: "security-team", mergeTime: null },
  { id: "c2", bountyId: "b_prev1", bountyTitle: "Fix pagination bug in search results", repository: "search-engine", prUrl: "https://github.com/search-inc/search-engine/pull/456", prNumber: 456, status: "merged", submittedAt: "2026-08-20", reward: 150, earned: 150, feedback: "Excellent fix! Clean implementation.", reviewer: "maintainer-joe", mergeTime: "2026-08-21" },
  { id: "c3", bountyId: "b_prev2", bountyTitle: "Add keyboard shortcuts documentation", repository: "editor-app", prUrl: "https://github.com/editors/editor-app/pull/234", prNumber: 234, status: "merged", submittedAt: "2026-08-15", reward: 75, earned: 75, feedback: "Great documentation, well-organized.", reviewer: "docs-team", mergeTime: "2026-08-16" },
  { id: "c4", bountyId: "b_prev3", bountyTitle: "Optimize image loading pipeline", repository: "media-service", prUrl: "https://github.com/media/media-service/pull/123", prNumber: 123, status: "merged", submittedAt: "2026-08-10", reward: 400, earned: 400, feedback: "Significant performance improvement! 60% faster loads.", reviewer: "perf-team", mergeTime: "2026-08-12" },
  { id: "c5", bountyId: "b_prev4", bountyTitle: "Fix CSS grid layout on mobile", repository: "web-app", prUrl: "https://github.com/design-studio/web-app/pull/567", prNumber: 567, status: "rejected", submittedAt: "2026-08-05", reward: 100, earned: 0, feedback: "Good attempt but the approach breaks the existing layout. Consider using container queries.", reviewer: "ux-lead", mergeTime: null },
];

const BOUNTY_STATS: BountyStats = {
  totalEarned: 625, totalBounties: 12, completedBounties: 8, avgReward: 187, successRate: 73,
  currentStreak: 3, longestStreak: 5, level: 5, xp: 2340, maxXp: 4000,
  rank: 42, totalDevs: 1850,
  topLanguages: [
    { language: "TypeScript", bounties: 6, earned: 400 },
    { language: "SQL", bounties: 2, earned: 125 },
    { language: "Python", bounties: 2, earned: 100 },
    { language: "CSS", bounties: 2, earned: 0 },
  ],
  monthlyEarnings: [
    { month: 4, earned: 75, count: 1 }, { month: 5, earned: 150, count: 2 },
    { month: 6, earned: 400, count: 1 }, { month: 7, earned: 0, count: 0 },
    { month: 8, earned: 0, count: 4 },
  ],
};

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "CodeNinja_42", avatar: "🥷", totalEarned: 12450, bountiesCompleted: 67, successRate: 94, level: 12, streak: 15, topSkill: "TypeScript" },
  { rank: 2, name: "BugHunter_Sam", avatar: "🐛", totalEarned: 9800, bountiesCompleted: 52, successRate: 88, level: 10, streak: 8, topSkill: "Security" },
  { rank: 3, name: "OpenSourceQueen", avatar: "👑", totalEarned: 8900, bountiesCompleted: 48, successRate: 91, level: 9, streak: 12, topSkill: "Python" },
  { rank: 4, name: "DevMaster_Lee", avatar: "🧑‍💻", totalEarned: 7600, bountiesCompleted: 41, successRate: 85, level: 8, streak: 6, topSkill: "Go" },
  { rank: 5, name: "RustLord_99", avatar: "🦀", totalEarned: 6200, bountiesCompleted: 35, successRate: 92, level: 7, streak: 10, topSkill: "Rust" },
];

/* ─────────────── Sub-Components ─────────────── */

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string; trend?: string; trendUp?: boolean }> = ({ icon, label, value, sub, color = "text-white", trend, trendUp }) => (
  <Card className="p-4 hover:border-white/20 transition-all">
    <div className="flex items-center gap-2 mb-2"><span className={color}>{icon}</span><span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span></div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    {trend && <div className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? "text-green-400" : "text-red-400"}`}>{trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{trend}</div>}
  </Card>
);

const BountyCard: React.FC<{ bounty: Bounty; selected: boolean; onSelect: () => void }> = ({ bounty, selected, onSelect }) => {
  const statusCfg = STATUS_CONFIG[bounty.status];
  const diffCfg = DIFFICULTY_CONFIG[bounty.difficulty];
  const catCfg = CATEGORY_CONFIG[bounty.category];
  const daysLeft = bounty.deadline ? Math.max(0, Math.ceil((new Date(bounty.deadline).getTime() - Date.now()) / 86400000)) : null;
  return (
    <div onClick={onSelect} className={`cursor-pointer rounded-xl p-4 border transition-all ${selected ? "border-cyan-400 bg-cyan-500/10 shadow-lg" : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold text-white`}>{bounty.repoOwner}/{bounty.repository}</span>
          <span className="text-[10px] text-gray-500">{bounty.issueUrl}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{bounty.title}</h3>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2">{bounty.description}</p>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${diffCfg.bg} ${diffCfg.color} flex items-center gap-1`}>{diffCfg.icon}{diffCfg.label}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${catCfg.color} bg-white/5 flex items-center gap-1`}>{catCfg.icon}{catCfg.label}</span>
        {bounty.language.map((l) => <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{l}</span>)}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><Coins size={10} className="text-yellow-400" />{bounty.claims} claims</span>
          <span className="flex items-center gap-1"><MessageSquare size={10} />{bounty.comments}</span>
          <span className="flex items-center gap-1"><ThumbsUp size={10} />{bounty.upvotes}</span>
          <span className="flex items-center gap-1"><Clock size={10} />{bounty.timeEstimate}</span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-400">${bounty.reward}</div>
          {daysLeft !== null && <div className={`text-[10px] ${daysLeft < 3 ? "text-red-400" : daysLeft < 7 ? "text-yellow-400" : "text-gray-500"}`}>{daysLeft}d left</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {bounty.skillsRequired.map((s) => <span key={s} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400">{s}</span>)}
      </div>
    </div>
  );
};

const ContributionRow: React.FC<{ contribution: Contribution }> = ({ contribution }) => {
  const statusColors: Record<string, string> = { submitted: "text-yellow-400", reviewing: "text-blue-400", approved: "text-green-400", merged: "text-purple-400", rejected: "text-red-400" };
  const statusBg: Record<string, string> = { submitted: "bg-yellow-500/20", reviewing: "bg-blue-500/20", approved: "bg-green-500/20", merged: "bg-purple-500/20", rejected: "bg-red-500/20" };
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${contribution.status === "merged" ? "border-green-400/20 bg-green-500/5" : contribution.status === "rejected" ? "border-red-400/20 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-white font-medium truncate">{contribution.bountyTitle}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBg[contribution.status]} ${statusColors[contribution.status]}`}>{contribution.status}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>{contribution.repository}</span>
          <span>PR #{contribution.prNumber}</span>
          <span>{contribution.submittedAt}</span>
          {contribution.mergeTime && <span className="text-green-400">Merged {contribution.mergeTime}</span>}
        </div>
        {contribution.feedback && <div className="text-[11px] text-gray-400 mt-1 italic">"{contribution.feedback}"</div>}
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${contribution.earned > 0 ? "text-green-400" : contribution.status === "rejected" ? "text-red-400" : "text-gray-400"}`}>
          {contribution.earned > 0 ? `+$${contribution.earned}` : contribution.status === "rejected" ? "$0" : `$${contribution.reward}`}
        </div>
        <div className="text-[10px] text-gray-500">{contribution.reviewer}</div>
      </div>
    </div>
  );
};

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; isMe?: boolean }> = ({ entry, isMe }) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isMe ? "border border-cyan-400/30 bg-cyan-500/10" : "border border-white/10 bg-white/5 hover:bg-white/8"}`}>
    <div className="w-8 text-center">
      {entry.rank <= 3 ? <span className={`text-lg ${entry.rank === 1 ? "text-yellow-400" : entry.rank === 2 ? "text-gray-300" : "text-orange-400"}`}>{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span> : <span className="text-sm text-gray-500">#{entry.rank}</span>}
    </div>
    <span className="text-xl">{entry.avatar}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{entry.name}</span>
        {isMe && <Badge variant="outline" className="text-[10px] text-cyan-400">You</Badge>}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Lvl {entry.level}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span>{entry.bountiesCompleted} bounties</span>
        <span>{entry.successRate}% success</span>
        <span className="text-orange-400">🔥 {entry.streak}</span>
        <span>{entry.topSkill}</span>
      </div>
    </div>
    <div className="text-right">
      <div className="text-sm font-bold text-green-400">${entry.totalEarned.toLocaleString()}</div>
    </div>
  </div>
);

/* ─────────────── Main Component ─────────────── */

function BountyBoard() {
  const [activeTab, setActiveTab] = useState<"discover" | "my_bounties" | "leaderboard" | "stats">("discover");
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<BountyDifficulty | "all">("all");
  const [filterCategory, setFilterCategory] = useState<BountyCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<BountyStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"reward" | "newest" | "deadline" | "popular">("reward");

  const filteredBounties = useMemo(() => {
    let result = [...BOUNTIES];
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((b) => b.title.toLowerCase().includes(q) || b.tags.some((t) => t.includes(q)) || b.repository.toLowerCase().includes(q)); }
    if (filterDifficulty !== "all") result = result.filter((b) => b.difficulty === filterDifficulty);
    if (filterCategory !== "all") result = result.filter((b) => b.category === filterCategory);
    if (filterStatus !== "all") result = result.filter((b) => b.status === filterStatus);
    if (sortBy === "reward") result.sort((a, b) => b.reward - a.reward);
    else if (sortBy === "newest") result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    else if (sortBy === "deadline") result.sort((a, b) => { if (!a.deadline) return 1; if (!b.deadline) return -1; return new Date(a.deadline).getTime() - new Date(b.deadline).getTime(); });
    else if (sortBy === "popular") result.sort((a, b) => b.upvotes - a.upvotes);
    return result;
  }, [searchQuery, filterDifficulty, filterCategory, filterStatus, sortBy]);

  const tabs = [
    { id: "discover" as const, label: "Discover", icon: <Search size={14} /> },
    { id: "my_bounties" as const, label: "My Bounties", icon: <GitPullRequest size={14} /> },
    { id: "leaderboard" as const, label: "Leaderboard", icon: <Trophy size={14} /> },
    { id: "stats" as const, label: "Stats", icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="mx-auto flex max-w-[1536px] w-full flex-col gap-4 pb-6 pt-2 px-1 sm:px-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center">
            <Coins size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bounty Board</h1>
            <p className="text-sm text-gray-400">Find bounties · Contribute · Earn rewards</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-yellow-400">💰 ${BOUNTY_STATS.totalEarned} earned</Badge>
          <Badge variant="outline" className="text-green-400">🎯 {BOUNTY_STATS.completedBounties} completed</Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Coins size={18} />} label="Total Earned" value={`$${BOUNTY_STATS.totalEarned}`} color="text-yellow-400" trend="+$150 this month" trendUp />
        <KpiCard icon={<GitPullRequest size={18} />} label="Completed" value={BOUNTY_STATS.completedBounties} sub={`of ${BOUNTY_STATS.totalBounties} claimed`} color="text-green-400" />
        <KpiCard icon={<Target size={18} />} label="Success Rate" value={`${BOUNTY_STATS.successRate}%`} color="text-cyan-400" />
        <KpiCard icon={<Flame size={18} />} label="Streak" value={`${BOUNTY_STATS.currentStreak}`} sub="consecutive merges" color="text-orange-400" />
        <KpiCard icon={<Crown size={18} />} label="Rank" value={`#${BOUNTY_STATS.rank}`} sub={`of ${BOUNTY_STATS.totalDevs}`} color="text-purple-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-yellow-500/20 text-yellow-400 border border-yellow-400/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Discover Tab */}
      {activeTab === "discover" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center bg-white/5 rounded-lg border border-white/10 px-3 py-2 flex-1 min-w-[200px]">
                <Search size={14} className="text-gray-400 mr-2" />
                <input type="text" placeholder="Search bounties, repos, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-white text-sm outline-none flex-1" />
              </div>
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
                <option value="all">All Levels</option>
                {Object.entries(DIFFICULTY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
                <option value="reward">Sort: Reward</option>
                <option value="newest">Sort: Newest</option>
                <option value="deadline">Sort: Deadline</option>
                <option value="popular">Sort: Popular</option>
              </select>
            </div>
            {filteredBounties.map((b) => <BountyCard key={b.id} bounty={b} selected={selectedBounty?.id === b.id} onSelect={() => setSelectedBounty(b)} />)}
            {filteredBounties.length === 0 && <div className="text-center py-12 text-gray-500"><Search size={32} className="mx-auto mb-2 opacity-50" /><p>No bounties match your filters</p></div>}
          </div>
          <div className="space-y-4">
            {selectedBounty ? (
              <>
                <Card className="p-5">
                  <TypoHeading className="text-base mb-3">{selectedBounty.title}</TypoHeading>
                  <p className="text-xs text-gray-400 mb-3">{selectedBounty.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Reward</div><div className="text-green-400 font-bold text-lg">${selectedBounty.reward}</div></div>
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Time</div><div className="text-white font-bold">{selectedBounty.timeEstimate}</div></div>
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Claims</div><div className="text-white font-bold">{selectedBounty.claims}</div></div>
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Difficulty</div><div className="text-white font-bold">{selectedBounty.difficulty_score}/10</div></div>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-500 mb-1">Skills Required</div>
                    <div className="flex flex-wrap gap-1">{selectedBounty.skillsRequired.map((s) => <span key={s} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{s}</span>)}</div>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-500 mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">{selectedBounty.tags.map((t) => <span key={t} className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400">#{t}</span>)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
                    <span>By {selectedBounty.submittedBy}</span>
                    <span>·</span>
                    <span>{selectedBounty.submittedAt}</span>
                    {selectedBounty.deadline && <><span>·</span><span className="text-yellow-400">Due {selectedBounty.deadline}</span></>}
                  </div>
                  <Button className="w-full" variant="outline"><ExternalLink size={14} className="mr-1" />View on GitHub</Button>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center"><Coins size={32} className="mx-auto mb-2 text-gray-600" /><p className="text-gray-400 text-sm">Select a bounty to view details</p></Card>
            )}
          </div>
        </div>
      )}

      {/* My Bounties Tab */}
      {activeTab === "my_bounties" && (
        <div className="space-y-3 max-w-4xl">
          <TypoHeading className="text-base">My Contributions</TypoHeading>
          {CONTRIBUTIONS.map((c) => <ContributionRow key={c.id} contribution={c} />)}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div className="max-w-3xl space-y-2">
          <TypoHeading className="text-base mb-3">Top Contributors</TypoHeading>
          {LEADERBOARD.map((entry) => <LeaderboardRow key={entry.rank} entry={entry} />)}
          <div className="mt-4 p-4 bg-cyan-500/10 rounded-xl border border-cyan-400/20">
            <div className="flex items-center gap-2 text-sm text-cyan-400 font-semibold mb-1"><Crown size={16} />Your Position</div>
            <LeaderboardRow entry={{ rank: BOUNTY_STATS.rank, name: "You", avatar: "🧑‍💻", totalEarned: BOUNTY_STATS.totalEarned, bountiesCompleted: BOUNTY_STATS.completedBounties, successRate: BOUNTY_STATS.successRate, level: BOUNTY_STATS.level, streak: BOUNTY_STATS.currentStreak, topSkill: "TypeScript" }} isMe />
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Earnings Overview</TypoHeading>
            <div className="flex items-end gap-2 h-40">
              {BOUNTY_STATS.monthlyEarnings.map((m) => {
                const maxEarned = Math.max(...BOUNTY_STATS.monthlyEarnings.map((x) => x.earned), 1);
                const h = (m.earned / maxEarned) * 100;
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">{m.earned > 0 ? `$${m.earned}` : "—"}</span>
                    <div className="w-full rounded-t bg-yellow-400" style={{ height: `${Math.max(h, 4)}%` }} />
                    <span className="text-[9px] text-gray-500">{monthNames[m.month - 1]}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Language Breakdown</TypoHeading>
            <div className="space-y-3">
              {BOUNTY_STATS.topLanguages.map((lang) => (
                <div key={lang.language}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 text-gray-400">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[lang.language] || "#666" }} />
                      {lang.language}
                    </span>
                    <span className="text-white">{lang.bounties} bounties · ${lang.earned}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${(lang.bounties / BOUNTY_STATS.totalBounties) * 100}%`, backgroundColor: LANGUAGE_COLORS[lang.language] || "#666" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Level Progress</TypoHeading>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-32 h-32 mb-4">
                <svg width={128} height={128}>
                  <circle cx={64} cy={64} r={56} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx={64} cy={64} r={56} fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - BOUNTY_STATS.xp / BOUNTY_STATS.maxXp)} transform="rotate(-90 64 64)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Crown size={24} className="text-yellow-400 mb-1" />
                  <span className="text-2xl font-bold text-white">{BOUNTY_STATS.level}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-white font-semibold">Bounty Hunter Lv.{BOUNTY_STATS.level}</div>
                <div className="text-xs text-gray-400">{BOUNTY_STATS.xp}/{BOUNTY_STATS.maxXp} XP</div>
                <div className="w-48 bg-white/10 rounded-full h-2 mt-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(BOUNTY_STATS.xp / BOUNTY_STATS.maxXp) * 100}%` }} />
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Achievements</TypoHeading>
            <div className="space-y-2">
              {[
                { icon: <Star size={16} />, name: "First Bounty", desc: "Completed your first bounty", unlocked: true },
                { icon: <Flame size={16} />, name: "Streak Master", desc: "5-day contribution streak", unlocked: true },
                { icon: <Coins size={16} />, name: "$500 Earned", desc: "Earned over $500 in bounties", unlocked: true },
                { icon: <Trophy size={16} />, name: "Top 50", desc: "Reach top 50 on leaderboard", unlocked: true },
                { icon: <Shield size={16} />, name: "Security Hero", desc: "Complete 3 security bounties", unlocked: false },
                { icon: <Crown size={16} />, name: "$1000 Club", desc: "Earn over $1000 in bounties", unlocked: false },
              ].map((a, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${a.unlocked ? "bg-white/5" : "bg-gray-800/30 opacity-50"}`}>
                  <span className={a.unlocked ? "text-yellow-400" : "text-gray-600"}>{a.icon}</span>
                  <div><div className={`text-xs font-medium ${a.unlocked ? "text-white" : "text-gray-500"}`}>{a.name}</div><div className="text-[10px] text-gray-500">{a.desc}</div></div>
                  {a.unlocked && <CheckCircle2 size={14} className="text-green-400 ml-auto" />}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function FileText({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>; }
