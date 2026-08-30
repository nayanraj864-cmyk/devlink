import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  TreePine, GitBranch, GitMerge, CheckCircle2, Lock, Star, Zap,
  Target, Award, BookOpen, Code2, Database, Globe, Server, Cpu,
  Layers, Shield, Terminal, Palette, Brain, Rocket, Flame, Heart,
  ArrowRight, ChevronDown, ChevronUp, Search, Filter, Eye, EyeOff,
  TrendingUp, Clock, Users, Sparkles, Crown, Medal, Trophy,
  BarChart3, PieChart, ArrowUpRight, ExternalLink, Bookmark,
  RefreshCw, Download, Share2, Info, AlertTriangle, CircleDot,
  Lightbulb, GraduationCap, Briefcase, Map, Compass, Flag,
} from "lucide-react";
import { Card } from "@/components/shared/primitives";
import { TypoCaption, TypoHeading, TypoSection } from "@/components/shared/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/skill-tree")({
  head: () => ({
    meta: [
      { title: "Skill Tree & Learning Path — DevLink" },
      { name: "description", content: "Visual skill dependency tree with progress tracking, learning resources, and achievements." },
    ],
  }),
  component: SkillTreePage,
});

/* ─────────────── Types ─────────────── */

type SkillTier = "foundational" | "intermediate" | "advanced" | "expert" | "master";
type SkillStatus = "locked" | "available" | "in_progress" | "completed";
type ResourceType = "course" | "article" | "video" | "project" | "book" | "practice";

interface SkillNode {
  id: string;
  name: string;
  description: string;
  tier: SkillTier;
  status: SkillStatus;
  category: string;
  icon: React.ReactNode;
  color: string;
  xp: number;
  maxXP: number;
  prerequisites: string[];
  unlocks: string[];
  resources: LearningResource[];
  endorsements: number;
  completedBy: number;
  difficulty: number;
  estimatedHours: number;
  tags: string[];
}

interface LearningResource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  duration: string;
  rating: number;
  reviews: number;
  free: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
  unlockedAt: string | null;
  requirement: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface SkillPath {
  id: string;
  name: string;
  description: string;
  skills: string[];
  totalXP: number;
  estimatedWeeks: number;
  difficulty: SkillTier;
  enrolled: number;
  rating: number;
  color: string;
}

/* ─────────────── Constants ─────────────── */

const TIER_CONFIG: Record<SkillTier, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  foundational: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-400/30", label: "Foundational", icon: <Flag size={12} /> },
  intermediate: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-400/30", label: "Intermediate", icon: <Target size={12} /> },
  advanced: { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-400/30", label: "Advanced", icon: <Zap size={12} /> },
  expert: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-400/30", label: "Expert", icon: <Crown size={12} /> },
  master: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-400/30", label: "Master", icon: <Trophy size={12} /> },
};

const STATUS_CONFIG: Record<SkillStatus, { color: string; bg: string; label: string }> = {
  locked: { color: "text-gray-500", bg: "bg-gray-500/10", label: "Locked" },
  available: { color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Available" },
  in_progress: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "In Progress" },
  completed: { color: "text-green-400", bg: "bg-green-500/10", label: "Completed" },
};

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  course: <GraduationCap size={14} />, article: <BookOpen size={14} />, video: <Globe size={14} />,
  project: <Code2 size={14} />, book: <Bookmark size={14} />, practice: <Terminal size={14} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Frontend": "#3B82F6", "Backend": "#10B981", "DevOps": "#F59E0B",
  "Data": "#8B5CF6", "Security": "#EF4444", "Mobile": "#06B6D4",
  "AI/ML": "#EC4899", "Architecture": "#F97316",
};

/* ─────────────── Sample Data ─────────────── */

const SKILLS: SkillNode[] = [
  // Foundational
  { id: "html", name: "HTML5 & Semantic Markup", description: "Master semantic HTML, accessibility, and modern markup patterns", tier: "foundational", status: "completed", category: "Frontend", icon: <Globe size={18} />, color: "#3B82F6", xp: 100, maxXP: 100, prerequisites: [], unlocks: ["css", "accessibility"], resources: [{ id: "r1", title: "MDN HTML Guide", type: "course", url: "#", duration: "8h", rating: 4.9, reviews: 2340, free: true }, { id: "r2", title: "Semantic HTML Deep Dive", type: "article", url: "#", duration: "25min", rating: 4.7, reviews: 456, free: true }], endorsements: 89, completedBy: 12450, difficulty: 1, estimatedHours: 8, tags: ["markup", "accessibility", "seo"] },
  { id: "css", name: "CSS3 & Modern Layout", description: "Flexbox, Grid, animations, responsive design, and CSS architecture", tier: "foundational", status: "completed", category: "Frontend", icon: <Palette size={18} />, color: "#3B82F6", xp: 150, maxXP: 150, prerequisites: ["html"], unlocks: ["tailwind", "animation"], resources: [{ id: "r3", title: "CSS Grid Masterclass", type: "video", url: "#", duration: "12h", rating: 4.8, reviews: 1890, free: false }, { id: "r4", title: "Responsive Design Patterns", type: "book", url: "#", duration: "6h", rating: 4.6, reviews: 780, free: false }], endorsements: 76, completedBy: 11200, difficulty: 2, estimatedHours: 15, tags: ["layout", "responsive", "animations"] },
  { id: "js", name: "JavaScript Fundamentals", description: "ES6+, closures, prototypes, async/await, and the event loop", tier: "foundational", status: "completed", category: "Frontend", icon: <Code2 size={18} />, color: "#F59E0B", xp: 200, maxXP: 200, prerequisites: [], unlocks: ["ts", "react", "node"], resources: [{ id: "r5", title: "JavaScript.info", type: "course", url: "#", duration: "40h", rating: 4.9, reviews: 5670, free: true }], endorsements: 156, completedBy: 15600, difficulty: 3, estimatedHours: 40, tags: ["es6", "async", "fundamentals"] },
  { id: "git", name: "Git & Version Control", description: "Branching strategies, rebasing, conflict resolution, and GitHub workflows", tier: "foundational", status: "completed", category: "DevOps", icon: <GitBranch size={18} />, color: "#F59E0B", xp: 80, maxXP: 80, prerequisites: [], unlocks: ["ci_cd", "code_review"], resources: [{ id: "r6", title: "Pro Git Book", type: "book", url: "#", duration: "10h", rating: 4.8, reviews: 3400, free: true }], endorsements: 67, completedBy: 18900, difficulty: 1, estimatedHours: 10, tags: ["version-control", "github", "branching"] },
  // Intermediate
  { id: "ts", name: "TypeScript Mastery", description: "Type system, generics, utility types, declaration files, and type-safe patterns", tier: "intermediate", status: "completed", category: "Frontend", icon: <Shield size={18} />, color: "#3B82F6", xp: 250, maxXP: 250, prerequisites: ["js"], unlocks: ["react", "node"], resources: [{ id: "r7", title: "TypeScript Deep Dive", type: "course", url: "#", duration: "20h", rating: 4.7, reviews: 2100, free: true }], endorsements: 112, completedBy: 9800, difficulty: 3, estimatedHours: 20, tags: ["types", "generics", "type-safety"] },
  { id: "react", name: "React & Component Architecture", description: "Hooks, context, performance patterns, server components, and the React ecosystem", tier: "intermediate", status: "in_progress", category: "Frontend", icon: <Layers size={18} />, color: "#06B6D4", xp: 180, maxXP: 300, prerequisites: ["js", "ts"], unlocks: ["nextjs", "state_mgmt"], resources: [{ id: "r8", title: "React Official Docs", type: "course", url: "#", duration: "25h", rating: 4.9, reviews: 8900, free: true }, { id: "r9", title: "Advanced React Patterns", type: "video", url: "#", duration: "15h", rating: 4.8, reviews: 3400, free: false }], endorsements: 234, completedBy: 13200, difficulty: 4, estimatedHours: 30, tags: ["hooks", "components", "performance"] },
  { id: "node", name: "Node.js & Express", description: "Server-side JavaScript, REST APIs, middleware, authentication, and real-time", tier: "intermediate", status: "in_progress", category: "Backend", icon: <Server size={18} />, color: "#10B981", xp: 120, maxXP: 280, prerequisites: ["js", "ts"], unlocks: ["graphql", "microservices"], resources: [{ id: "r10", title: "Node.js Design Patterns", type: "book", url: "#", duration: "15h", rating: 4.7, reviews: 1200, free: false }], endorsements: 98, completedBy: 8700, difficulty: 4, estimatedHours: 25, tags: ["express", "api", "server"] },
  { id: "sql", name: "SQL & Database Design", description: "Relational modeling, normalization, indexing, query optimization, and transactions", tier: "intermediate", status: "completed", category: "Data", icon: <Database size={18} />, color: "#8B5CF6", xp: 200, maxXP: 200, prerequisites: [], unlocks: ["orm", "nosql"], resources: [{ id: "r11", title: "SQLBolt Interactive", type: "practice", url: "#", duration: "8h", rating: 4.8, reviews: 4500, free: true }], endorsements: 87, completedBy: 10200, difficulty: 3, estimatedHours: 15, tags: ["database", "normalization", "indexing"] },
  { id: "tailwind", name: "Tailwind CSS", description: "Utility-first CSS, custom design systems, and responsive component patterns", tier: "intermediate", status: "completed", category: "Frontend", icon: <Wind size={18} />, color: "#06B6D4", xp: 120, maxXP: 120, prerequisites: ["css"], unlocks: ["design_system"], resources: [{ id: "r12", title: "Tailwind UI", type: "course", url: "#", duration: "10h", rating: 4.9, reviews: 6700, free: false }], endorsements: 65, completedBy: 11500, difficulty: 2, estimatedHours: 10, tags: ["css", "utility-first", "components"] },
  // Advanced
  { id: "nextjs", name: "Next.js & Full-Stack React", description: "SSR, SSG, API routes, middleware, ISR, and the App Router", tier: "advanced", status: "available", category: "Frontend", icon: <Rocket size={18} />, color: "#06B6D4", xp: 0, maxXP: 350, prerequisites: ["react", "ts"], unlocks: ["deployment", "edge"], resources: [{ id: "r13", title: "Next.js Academy", type: "course", url: "#", duration: "30h", rating: 4.8, reviews: 5600, free: true }], endorsements: 145, completedBy: 6700, difficulty: 5, estimatedHours: 35, tags: ["ssr", "app-router", "full-stack"] },
  { id: "graphql", name: "GraphQL & API Design", description: "Schema design, resolvers, subscriptions, federation, and client caching", tier: "advanced", status: "available", category: "Backend", icon: <Database size={18} />, color: "#10B981", xp: 0, maxXP: 300, prerequisites: ["node"], unlocks: ["federation"], resources: [{ id: "r14", title: "How to GraphQL", type: "course", url: "#", duration: "20h", rating: 4.7, reviews: 3200, free: true }], endorsements: 78, completedBy: 4500, difficulty: 5, estimatedHours: 25, tags: ["api", "schema", "federation"] },
  { id: "testing", name: "Testing & Quality Engineering", description: "Unit, integration, E2E testing, TDD, mocking, and code coverage", tier: "advanced", status: "available", category: "DevOps", icon: <CheckCircle2 size={18} />, color: "#F59E0B", xp: 0, maxXP: 250, prerequisites: ["js", "ts"], unlocks: ["tdd", "ci_cd"], resources: [{ id: "r15", title: "Testing JavaScript", type: "course", url: "#", duration: "15h", rating: 4.8, reviews: 4100, free: false }], endorsements: 92, completedBy: 5600, difficulty: 4, estimatedHours: 20, tags: ["jest", "playwright", "tdd"] },
  { id: "security", name: "Web Security Fundamentals", description: "OWASP Top 10, XSS, CSRF, auth patterns, CSP, and secure coding", tier: "advanced", status: "locked", category: "Security", icon: <Shield size={18} />, color: "#EF4444", xp: 0, maxXP: 280, prerequisites: ["node", "react"], audits: 0, unlocks: ["pentesting"], resources: [{ id: "r16", title: "OWASP Top 10", type: "course", url: "#", duration: "12h", rating: 4.6, reviews: 2800, free: true }], endorsements: 67, completedBy: 3400, difficulty: 5, estimatedHours: 20, tags: ["owasp", "auth", "encryption"] },
  // Expert
  { id: "microservices", name: "Microservices Architecture", description: "Service decomposition, event sourcing, CQRS, saga patterns, and service mesh", tier: "expert", status: "locked", category: "Architecture", icon: <Layers size={18} />, color: "#F97316", xp: 0, maxXP: 400, prerequisites: ["node", "sql", "graphql"], unlocks: ["distributed"], resources: [{ id: "r17", title: "Designing Data-Intensive Apps", type: "book", url: "#", duration: "40h", rating: 4.9, reviews: 8900, free: false }], endorsements: 56, completedBy: 2100, difficulty: 7, estimatedHours: 40, tags: ["distributed", "event-sourcing", "cqrs"] },
  { id: "perf", name: "Performance Engineering", description: "Profiling, caching strategies, lazy loading, bundle optimization, and CDN", tier: "expert", status: "locked", category: "Architecture", icon: <Zap size={18} />, color: "#F97316", xp: 0, maxXP: 350, prerequisites: ["react", "node"], unlocks: ["monitoring"], resources: [{ id: "r18", title: "Web Performance in Action", type: "book", url: "#", duration: "15h", rating: 4.7, reviews: 1800, free: false }], endorsements: 45, completedBy: 2800, difficulty: 6, estimatedHours: 25, tags: ["caching", "optimization", "profiling"] },
  // Master
  { id: "system_design", name: "System Design & Architecture", description: "Designing scalable systems, trade-offs, capacity planning, and architecture决策", tier: "master", status: "locked", category: "Architecture", icon: <Brain size={18} />, color: "#EF4444", xp: 0, maxXP: 500, prerequisites: ["microservices", "perf", "security"], unlocks: [], resources: [{ id: "r19", title: "System Design Interview", type: "book", url: "#", duration: "30h", rating: 4.9, reviews: 12000, free: false }], endorsements: 234, completedBy: 890, difficulty: 9, estimatedHours: 50, tags: ["architecture", "scalability", "trade-offs"] },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", name: "First Steps", description: "Complete your first skill", icon: <Star size={18} />, color: "#10B981", unlocked: true, unlockedAt: "2026-06-15", requirement: "Complete 1 skill", rarity: "common" },
  { id: "a2", name: "Foundation Builder", description: "Complete all foundational skills", icon: <Flag size={18} />, color: "#3B82F6", unlocked: true, unlockedAt: "2026-07-20", requirement: "Complete all foundational skills", rarity: "rare" },
  { id: "a3", name: "Full-Stack Explorer", description: "Complete at least one Frontend and one Backend skill", icon: <Globe size={18} />, color: "#8B5CF6", unlocked: true, unlockedAt: "2026-08-01", requirement: "1 Frontend + 1 Backend skill", rarity: "rare" },
  { id: "a4", name: "Type Safe", description: "Complete TypeScript Mastery", icon: <Shield size={18} />, color: "#06B6D4", unlocked: true, unlockedAt: "2026-08-10", requirement: "Complete TypeScript Mastery", rarity: "common" },
  { id: "a5", name: "Code Warrior", description: "Earn 500+ total XP", icon: <Zap size={18} />, color: "#F59E0B", unlocked: true, unlockedAt: "2026-08-15", requirement: "Earn 500+ XP", rarity: "common" },
  { id: "a6", name: "Architecture Apprentice", description: "Unlock an Expert-tier skill", icon: <Crown size={18} />, color: "#F97316", unlocked: false, unlockedAt: null, requirement: "Unlock an Expert-tier skill", rarity: "epic" },
  { id: "a7", name: "Grandmaster", description: "Complete the System Design & Architecture skill", icon: <Trophy size={18} />, color: "#EF4444", unlocked: false, unlockedAt: null, requirement: "Complete System Design & Architecture", rarity: "legendary" },
  { id: "a8", name: "Knowledge Sharer", description: "Get 100+ endorsements across all skills", icon: <Heart size={18} />, color: "#EC4899", unlocked: false, unlockedAt: null, requirement: "100+ endorsements", rarity: "epic" },
];

const LEARNING_PATHS: SkillPath[] = [
  { id: "p1", name: "Frontend Engineer", description: "Complete path from HTML to Next.js mastery", skills: ["html", "css", "js", "ts", "react", "tailwind", "nextjs"], totalXP: 1200, estimatedWeeks: 16, difficulty: "advanced", enrolled: 4500, rating: 4.8, color: "#3B82F6" },
  { id: "p2", name: "Backend Engineer", description: "Server-side mastery from Node.js to microservices", skills: ["js", "ts", "node", "sql", "graphql", "security", "microservices"], totalXP: 1460, estimatedWeeks: 20, difficulty: "expert", enrolled: 3200, rating: 4.7, color: "#10B981" },
  { id: "p3", name: "Full-Stack Developer", description: "End-to-end web development mastery", skills: ["html", "css", "js", "ts", "react", "node", "sql", "nextjs"], totalXP: 1550, estimatedWeeks: 22, difficulty: "advanced", enrolled: 6700, rating: 4.9, color: "#06B6D4" },
  { id: "p4", name: "Software Architect", description: "Architecture, design patterns, and system thinking", skills: ["ts", "react", "node", "sql", "graphql", "microservices", "perf", "system_design"], totalXP: 2430, estimatedWeeks: 35, difficulty: "master", enrolled: 1200, rating: 4.9, color: "#EF4444" },
];

/* ─────────────── Sub-Components ─────────────── */

const SkillNodeCard: React.FC<{
  skill: SkillNode; selected: boolean; onSelect: () => void; compact?: boolean;
}> = ({ skill, selected, onSelect, compact }) => {
  const tierCfg = TIER_CONFIG[skill.tier];
  const statusCfg = STATUS_CONFIG[skill.status];
  const progress = skill.xp / skill.maxXP;
  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border transition-all ${
        selected ? `${tierCfg.border} ${tierCfg.bg} shadow-lg` :
        skill.status === "locked" ? "border-gray-700/30 bg-gray-800/20 opacity-60" :
        skill.status === "completed" ? "border-green-400/20 bg-green-500/5" :
        "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${skill.status === "completed" ? "bg-green-500/20 text-green-400" : skill.status === "locked" ? "bg-gray-700/30 text-gray-500" : "bg-white/10"}`} style={skill.status !== "locked" && skill.status !== "completed" ? { color: skill.color } : {}}>
          {skill.status === "locked" ? <Lock size={18} /> : skill.status === "completed" ? <CheckCircle2 size={18} /> : skill.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${skill.status === "locked" ? "text-gray-500" : "text-white"}`}>{skill.name}</span>
            {skill.status === "completed" && <CheckCircle2 size={14} className="text-green-400" />}
          </div>
          {!compact && <div className="text-[10px] text-gray-500 truncate">{skill.description}</div>}
        </div>
      </div>
      {!compact && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tierCfg.bg} ${tierCfg.color} flex items-center gap-1`}>{tierCfg.icon}{tierCfg.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-gray-400">{skill.xp}/{skill.maxXP} XP</span>
              <span className="text-gray-500">~{skill.estimatedHours}h</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${skill.status === "completed" ? "bg-green-400" : "bg-cyan-400"}`} style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><Users size={10} />{skill.completedBy.toLocaleString()}</span>
            <span className="flex items-center gap-1"><Heart size={10} />{skill.endorsements}</span>
            <span className="flex items-center gap-1"><Star size={10} />{skill.difficulty}/10</span>
          </div>
        </>
      )}
    </div>
  );
};

const ResourceCard: React.FC<{ resource: LearningResource }> = ({ resource }) => (
  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-gray-400">
      {RESOURCE_ICONS[resource.type]}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm text-white truncate">{resource.title}</div>
      <div className="text-[10px] text-gray-500">{resource.type} · {resource.duration} · {resource.free ? "Free" : "Paid"}</div>
    </div>
    <div className="text-right">
      <div className="flex items-center gap-1 text-[10px]"><Star size={10} className="text-yellow-400 fill-yellow-400" /><span className="text-gray-400">{resource.rating}</span></div>
      <div className="text-[10px] text-gray-500">{resource.reviews.toLocaleString()}</div>
    </div>
  </div>
);

const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const rarityColors: Record<string, string> = { common: "text-gray-400", rare: "text-blue-400", epic: "text-purple-400", legendary: "text-yellow-400" };
  const rarityBg: Record<string, string> = { common: "bg-gray-500/10", rare: "bg-blue-500/10", epic: "bg-purple-500/10", legendary: "bg-yellow-500/10" };
  return (
    <div className={`rounded-xl p-4 border transition-all ${achievement.unlocked ? "border-white/20 bg-white/5" : "border-gray-700/30 bg-gray-800/20 opacity-50"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${achievement.unlocked ? rarityBg[achievement.rarity] : "bg-gray-700/30"}`}>
          <span className={achievement.unlocked ? "" : "text-gray-600"} style={achievement.unlocked ? { color: achievement.color } : {}}>{achievement.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${achievement.unlocked ? "text-white" : "text-gray-500"}`}>{achievement.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${rarityBg[achievement.rarity]} ${rarityColors[achievement.rarity]}`}>{achievement.rarity}</span>
          </div>
          <div className="text-xs text-gray-400">{achievement.description}</div>
          {achievement.unlockedAt && <div className="text-[10px] text-gray-500">Unlocked {achievement.unlockedAt}</div>}
        </div>
      </div>
    </div>
  );
};

const PathCard: React.FC<{ path: SkillPath; selected: boolean; onSelect: () => void }> = ({ path, selected, onSelect }) => (
  <div onClick={onSelect} className={`cursor-pointer rounded-xl p-4 border transition-all ${selected ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="font-semibold text-white text-sm">{path.name}</span>
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${TIER_CONFIG[path.difficulty].bg} ${TIER_CONFIG[path.difficulty].color}`}>{TIER_CONFIG[path.difficulty].label}</span>
    </div>
    <p className="text-xs text-gray-400 mb-3">{path.description}</p>
    <div className="flex items-center gap-4 text-[10px] text-gray-500">
      <span className="flex items-center gap-1"><Layers size={10} />{path.skills.length} skills</span>
      <span className="flex items-center gap-1"><Zap size={10} />{path.totalXP} XP</span>
      <span className="flex items-center gap-1"><Clock size={10} />{path.estimatedWeeks} weeks</span>
      <span className="flex items-center gap-1"><Users size={10} />{path.enrolled.toLocaleString()}</span>
    </div>
    <div className="flex gap-1 mt-2 flex-wrap">
      {path.skills.map((s) => {
        const skill = SKILLS.find((sk) => sk.id === s);
        return skill ? (
          <span key={s} className={`text-[9px] px-1.5 py-0.5 rounded-full ${
            skill.status === "completed" ? "bg-green-500/20 text-green-400" :
            skill.status === "in_progress" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-white/10 text-gray-400"
          }`}>{skill.name.split(" ")[0]}</span>
        ) : null;
      })}
    </div>
  </div>
);

const DependencyLine: React.FC<{ from: SkillNode; to: SkillNode }> = ({ from, to }) => (
  <div className="absolute pointer-events-none" style={{ left: "50%", top: "100%", height: "20px", borderLeft: `2px dashed ${to.status === "locked" ? "#374151" : "#06b6d4"}` }} />
);

/* ─────────────── Main Component ─────────────── */

function SkillTreePage() {
  const [activeTab, setActiveTab] = useState<"tree" | "paths" | "achievements" | "skills">("tree");
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState<SkillTier | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<SkillStatus | "all">("all");
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedPath, setSelectedPath] = useState<SkillPath | null>(null);
  const [showResources, setShowResources] = useState(false);

  const stats = useMemo(() => {
    const total = SKILLS.length;
    const completed = SKILLS.filter((s) => s.status === "completed").length;
    const inProgress = SKILLS.filter((s) => s.status === "in_progress").length;
    const totalXP = SKILLS.reduce((s, sk) => s + sk.xp, 0);
    const maxXP = SKILLS.reduce((s, sk) => s + sk.maxXP, 0);
    const unlocked = ACHIEVEMENTS.filter((a) => a.unlocked).length;
    const totalEndorsements = SKILLS.reduce((s, sk) => s + sk.endorsements, 0);
    return { total, completed, inProgress, totalXP, maxXP, unlocked, totalEndorsements };
  }, []);

  const filteredSkills = useMemo(() => {
    let result = [...SKILLS];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)) || s.category.toLowerCase().includes(q));
    }
    if (filterTier !== "all") result = result.filter((s) => s.tier === filterTier);
    if (filterCategory !== "all") result = result.filter((s) => s.category === filterCategory);
    if (filterStatus !== "all") result = result.filter((s) => s.status === filterStatus);
    if (!showCompleted) result = result.filter((s) => s.status !== "completed");
    return result;
  }, [searchQuery, filterTier, filterCategory, filterStatus, showCompleted]);

  const tabs = [
    { id: "tree" as const, label: "Skill Tree", icon: <TreePine size={14} /> },
    { id: "paths" as const, label: "Learning Paths", icon: <Map size={14} /> },
    { id: "achievements" as const, label: "Achievements", icon: <Award size={14} /> },
    { id: "skills" as const, label: "All Skills", icon: <Layers size={14} /> },
  ];

  return (
    <div className="mx-auto flex max-w-[1536px] w-full flex-col gap-4 pb-6 pt-2 px-1 sm:px-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <TreePine size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Skill Tree</h1>
            <p className="text-sm text-gray-400">Master skills · Unlock paths · Earn achievements</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4"><TypoCaption className="text-gray-400">Progress</TypoCaption><div className="text-xl font-bold text-cyan-400">{stats.completed}/{stats.total}</div></Card>
        <Card className="p-4"><TypoCaption className="text-gray-400">XP Earned</TypoCaption><div className="text-xl font-bold text-green-400">{stats.totalXP}/{stats.maxXP}</div></Card>
        <Card className="p-4"><TypoCaption className="text-gray-400">In Progress</TypoCaption><div className="text-xl font-bold text-yellow-400">{stats.inProgress}</div></Card>
        <Card className="p-4"><TypoCaption className="text-gray-400">Achievements</TypoCaption><div className="text-xl font-bold text-purple-400">{stats.unlocked}/{ACHIEVEMENTS.length}</div></Card>
        <Card className="p-4"><TypoCaption className="text-gray-400">Endorsements</TypoCaption><div className="text-xl font-bold text-pink-400">{stats.totalEndorsements}</div></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Skill Tree Tab */}
      {activeTab === "tree" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TypoHeading className="mb-3">Skill Dependency Tree</TypoHeading>
            {(["foundational", "intermediate", "advanced", "expert", "master"] as SkillTier[]).map((tier) => {
              const tierSkills = SKILLS.filter((s) => s.tier === tier);
              if (tierSkills.length === 0) return null;
              const tierCfg = TIER_CONFIG[tier];
              return (
                <div key={tier} className="mb-6">
                  <div className={`flex items-center gap-2 mb-3 ${tierCfg.color}`}>
                    {tierCfg.icon}<span className="font-semibold text-sm">{tierCfg.label} Tier</span>
                    <span className="text-[10px] text-gray-500">({tierSkills.length} skills)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {tierSkills.map((skill) => (
                      <SkillNodeCard key={skill.id} skill={skill} selected={selectedSkill?.id === skill.id} onSelect={() => { setSelectedSkill(skill); setShowResources(false); }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-4">
            {selectedSkill ? (
              <>
                <Card className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedSkill.color}20`, color: selectedSkill.color }}>
                      {selectedSkill.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{selectedSkill.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TIER_CONFIG[selectedSkill.tier].bg} ${TIER_CONFIG[selectedSkill.tier].color}`}>{TIER_CONFIG[selectedSkill.tier].label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[selectedSkill.status].bg} ${STATUS_CONFIG[selectedSkill.status].color}`}>{STATUS_CONFIG[selectedSkill.status].label}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{selectedSkill.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">XP</div><div className="text-white font-bold">{selectedSkill.xp}/{selectedSkill.maxXP}</div></div>
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Hours</div><div className="text-white font-bold">{selectedSkill.estimatedHours}h</div></div>
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Difficulty</div><div className="text-white font-bold">{selectedSkill.difficulty}/10</div></div>
                    <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Completed</div><div className="text-white font-bold">{selectedSkill.completedBy.toLocaleString()}</div></div>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                    <div className={`h-2 rounded-full ${selectedSkill.status === "completed" ? "bg-green-400" : "bg-cyan-400"}`} style={{ width: `${(selectedSkill.xp / selectedSkill.maxXP) * 100}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedSkill.tags.map((t) => <span key={t} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">#{t}</span>)}
                  </div>
                  {selectedSkill.prerequisites.length > 0 && (
                    <div className="mb-3"><div className="text-[10px] text-gray-500 mb-1">Prerequisites</div><div className="flex flex-wrap gap-1">{selectedSkill.prerequisites.map((p) => { const sk = SKILLS.find((s) => s.id === p); return sk ? <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full ${sk.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400"}`}>{sk.name.split(" ")[0]}</span> : null; })}</div></div>
                  )}
                  {selectedSkill.unlocks.length > 0 && (
                    <div><div className="text-[10px] text-gray-500 mb-1">Unlocks</div><div className="flex flex-wrap gap-1">{selectedSkill.unlocks.map((u) => { const sk = SKILLS.find((s) => s.id === u); return sk ? <span key={u} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">{sk.name.split(" ")[0]}</span> : null; })}</div></div>
                  )}
                </Card>
                <Button onClick={() => setShowResources(!showResources)} className="w-full" variant="outline">
                  {showResources ? <EyeOff size={14} /> : <BookOpen size={14} />}
                  {showResources ? "Hide Resources" : "View Learning Resources"}
                </Button>
                {showResources && (
                  <Card className="p-4">
                    <TypoCaption className="text-gray-400 mb-2">Learning Resources</TypoCaption>
                    <div className="space-y-2">
                      {selectedSkill.resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8 text-center"><TreePine size={32} className="mx-auto mb-2 text-gray-600" /><p className="text-gray-400 text-sm">Select a skill to view details</p></Card>
            )}
          </div>
        </div>
      )}

      {/* Learning Paths Tab */}
      {activeTab === "paths" && (
        <div>
          <TypoHeading className="mb-3">Learning Paths</TypoHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {LEARNING_PATHS.map((path) => <PathCard key={path.id} path={path} selected={selectedPath?.id === path.id} onSelect={() => setSelectedPath(path)} />)}
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === "achievements" && (
        <div>
          <TypoHeading className="mb-3">Achievements</TypoHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((a) => <AchievementBadge key={a.id} achievement={a} />)}
          </div>
        </div>
      )}

      {/* All Skills Tab */}
      {activeTab === "skills" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 px-3 py-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-gray-400 mr-2" />
              <input type="text" placeholder="Search skills, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-white text-sm outline-none flex-1" />
            </div>
            <select value={filterTier} onChange={(e) => setFilterTier(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
              <option value="all">All Tiers</option>
              {Object.entries(TIER_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
              <option value="all">All Categories</option>
              {[...new Set(SKILLS.map((s) => s.category))].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredSkills.map((skill) => (
              <SkillNodeCard key={skill.id} skill={skill} selected={selectedSkill?.id === skill.id} onSelect={() => { setSelectedSkill(skill); setShowResources(false); }} />
            ))}
          </div>
          {filteredSkills.length === 0 && <div className="text-center py-12 text-gray-500"><Search size={32} className="mx-auto mb-2 opacity-50" /><p>No skills match your filters</p></div>}
        </div>
      )}
    </div>
  );
}

function Wind({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></svg>; }
