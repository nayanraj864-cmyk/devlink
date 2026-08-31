import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Users, UserPlus, Code2, Video, MessageSquare, Mic, MicOff, VideoOff,
  Screen, Monitor, Terminal, Play, Pause, Square, Clock, Timer,
  Star, Award, Trophy, Flame, Heart, ThumbsUp, ThumbsDown, Shield,
  Zap, Target, Brain, Rocket, Lightbulb, Sparkles, Crown, Medal,
  Search, Filter, ChevronDown, ChevronUp, Eye, GitBranch, GitMerge,
  CheckCircle2, XCircle, AlertTriangle, Info, ArrowRight, ArrowUpRight,
  ExternalLink, RefreshCw, Settings, Bell, Bookmark, Share2,
  Globe, Database, Server, Layers, Palette, Briefcase, GraduationCap,
  Map, Compass, Flag, Calendar, BarChart3, TrendingUp, TrendingDown,
  CircleDot, Hash, Send, Reply, MoreHorizontal, Smile, Paperclip,
} from "lucide-react";
import { Card } from "@/components/shared/primitives";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/pair-programming")({
  head: () => ({
    meta: [
      { title: "Pair Programming Arena — DevLink" },
      { name: "description", content: "Find pair programming partners, collaborate in real-time, and improve together." },
    ],
  }),
  component: PairProgrammingArena,
});

/* ─────────────── Types ─────────────── */

type SessionStatus = "waiting" | "matching" | "active" | "completed" | "cancelled";
type PairRole = "driver" | "navigator" | "both";
type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";
type SessionType = "learning" | "debugging" | "feature_build" | "code_review" | "interview_prep" | "open_source";

interface PairPartner {
  id: string;
  name: string;
  avatar: string;
  handle: string;
  level: SkillLevel;
  rating: number;
  sessionsCompleted: number;
  skills: string[];
  languages: string[];
  timezone: string;
  online: boolean;
  lastActive: string;
  bio: string;
  specialties: string[];
  lookingFor: string[];
  matchScore: number;
}

interface PairSession {
  id: string;
  title: string;
  type: SessionType;
  status: SessionStatus;
  partner: PairPartner | null;
  myRole: PairRole;
  startTime: string;
  endTime: string | null;
  duration: number;
  language: string;
  topic: string;
  tasksCompleted: number;
  linesWritten: number;
  rating: number;
  feedback: string;
  tags: string[];
}

interface SessionMessage {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  type: "text" | "code" | "system" | "action";
}

interface PairStats {
  totalSessions: number;
  totalHours: number;
  partnersWorkedWith: number;
  avgRating: number;
  favoriteLanguage: string;
  favoriteSessionType: string;
  skillsImproved: string[];
  streak: number;
  level: number;
  xp: number;
  maxXp: number;
}

interface MatchQueue {
  id: string;
  lookingFor: string;
  skills: string[];
  language: string;
  sessionType: SessionType;
  waitTime: string;
  rating: number;
}

/* ─────────────── Constants ─────────────── */

const SESSION_TYPE_CONFIG: Record<SessionType, { color: string; bg: string; icon: React.ReactNode; label: string; description: string }> = {
  learning: { color: "text-cyan-400", bg: "bg-cyan-500/20", icon: <GraduationCap size={14} />, label: "Learning", description: "Learn a new concept or technology" },
  debugging: { color: "text-red-400", bg: "bg-red-500/20", icon: <Target size={14} />, label: "Debugging", description: "Solve bugs together" },
  feature_build: { color: "text-green-400", bg: "bg-green-500/20", icon: <Rocket size={14} />, label: "Feature Build", description: "Build a feature from scratch" },
  code_review: { color: "text-purple-400", bg: "bg-purple-500/20", icon: <Eye size={14} />, label: "Code Review", description: "Review each other's code" },
  interview_prep: { color: "text-yellow-400", bg: "bg-yellow-500/20", icon: <Briefcase size={14} />, label: "Interview Prep", description: "Practice coding interviews" },
  open_source: { color: "text-orange-400", bg: "bg-orange-500/20", icon: <Globe size={14} />, label: "Open Source", description: "Contribute to OSS together" },
};

const LEVEL_CONFIG: Record<SkillLevel, { color: string; bg: string; label: string }> = {
  beginner: { color: "text-green-400", bg: "bg-green-500/20", label: "Beginner" },
  intermediate: { color: "text-blue-400", bg: "bg-blue-500/20", label: "Intermediate" },
  advanced: { color: "text-purple-400", bg: "bg-purple-500/20", label: "Advanced" },
  expert: { color: "text-orange-400", bg: "bg-orange-500/20", label: "Expert" },
};

const ROLE_CONFIG: Record<PairRole, { color: string; bg: string; icon: React.ReactNode; label: string; description: string }> = {
  driver: { color: "text-cyan-400", bg: "bg-cyan-500/20", icon: <Terminal size={14} />, label: "Driver", description: "Writes the code" },
  navigator: { color: "text-purple-400", bg: "bg-purple-500/20", icon: <Compass size={14} />, label: "Navigator", description: "Guides the direction" },
  both: { color: "text-yellow-400", bg: "bg-yellow-500/20", icon: <Users size={14} />, label: "Both", description: "Switch roles freely" },
};

/* ─────────────── Sample Data ─────────────── */

const PARTNERS: PairPartner[] = [
  { id: "p1", name: "Alex Chen", avatar: "👨‍💻", handle: "@alexchen", level: "advanced", rating: 4.8, sessionsCompleted: 34, skills: ["React", "TypeScript", "Node.js", "GraphQL"], languages: ["TypeScript", "Python"], timezone: "UTC-5", online: true, lastActive: "now", bio: "Full-stack dev, love teaching React patterns", specialties: ["React Hooks", "Performance"], lookingFor: ["Open Source", "Code Review"], matchScore: 95 },
  { id: "p2", name: "Sara Patel", avatar: "👩‍💻", handle: "@sarapatel", level: "expert", rating: 4.9, sessionsCompleted: 56, skills: ["System Design", "Rust", "Go", "Kubernetes"], languages: ["Rust", "Go", "TypeScript"], timezone: "UTC+5:30", online: true, lastActive: "now", bio: "Backend architect, systems thinker", specialties: ["Distributed Systems", "Performance"], lookingFor: ["Feature Build", "Learning"], matchScore: 88 },
  { id: "p3", name: "Marcus Johnson", avatar: "🧑‍💻", handle: "@marcusj", level: "intermediate", rating: 4.5, sessionsCompleted: 18, skills: ["Python", "Django", "PostgreSQL", "Docker"], languages: ["Python", "SQL"], timezone: "UTC+0", online: false, lastActive: "2h ago", bio: "Backend dev transitioning to full-stack", specialties: ["APIs", "Databases"], lookingFor: ["Learning", "Debugging"], matchScore: 72 },
  { id: "p4", name: "Yuki Tanaka", avatar: "🧑‍🎨", handle: "@yukit", level: "advanced", rating: 4.7, sessionsCompleted: 28, skills: ["CSS", "Tailwind", "Figma", "Animation"], languages: ["TypeScript", "CSS"], timezone: "UTC+9", online: true, lastActive: "now", bio: "Frontend wizard, design systems enthusiast", specialties: ["CSS Architecture", "Animation"], lookingFor: ["Code Review", "Feature Build"], matchScore: 85 },
  { id: "p5", name: "Elena Rodriguez", avatar: "👩‍🔬", handle: "@elenar", level: "beginner", rating: 4.3, sessionsCompleted: 8, skills: ["JavaScript", "HTML", "CSS", "React basics"], languages: ["JavaScript"], timezone: "UTC-3", online: true, lastActive: "now", bio: "CS student, eager to learn and contribute", specialties: ["Web Basics"], lookingFor: ["Learning", "Interview Prep"], matchScore: 65 },
  { id: "p6", name: "Dev Singh", avatar: "🧑‍🚀", handle: "@devsingh", level: "advanced", rating: 4.6, sessionsCompleted: 42, skills: ["React Native", "Flutter", "Firebase", "GraphQL"], languages: ["TypeScript", "Dart"], timezone: "UTC+5:30", online: false, lastActive: "30m ago", bio: "Mobile dev, cross-platform advocate", specialties: ["Mobile", "Offline-First"], lookingFor: ["Open Source", "Debugging"], matchScore: 82 },
];

const SESSIONS: PairSession[] = [
  { id: "s1", title: "React Performance Optimization", type: "feature_build", status: "completed", partner: PARTNERS[0], myRole: "both", startTime: "2026-08-30T10:00", endTime: "2026-08-30T11:30", duration: 90, language: "TypeScript", topic: "Memoization & Lazy Loading", tasksCompleted: 3, linesWritten: 145, rating: 5, feedback: "Great session! Learned a lot about React.memo and useMemo patterns.", tags: ["react", "performance", "hooks"] },
  { id: "s2", title: "Debugging WebSocket Connection Issues", type: "debugging", status: "completed", partner: PARTNERS[1], myRole: "navigator", startTime: "2026-08-29T14:00", endTime: "2026-08-29T15:00", duration: 60, language: "TypeScript", topic: "WebSocket Reconnection", tasksCompleted: 2, linesWritten: 67, rating: 5, feedback: "Sara's debugging skills are incredible. Found the root cause in 10 minutes.", tags: ["websocket", "debugging", "async"] },
  { id: "s3", title: "Python Data Pipeline Review", type: "code_review", status: "completed", partner: PARTNERS[2], myRole: "driver", startTime: "2026-08-28T09:00", endTime: "2026-08-28T10:00", duration: 60, language: "Python", topic: "ETL Pipeline", tasksCompleted: 4, linesWritten: 89, rating: 4, feedback: "Good review session. Marcus suggested some nice patterns.", tags: ["python", "data", "pipeline"] },
  { id: "s4", title: "CSS Grid Layout Workshop", type: "learning", status: "completed", partner: PARTNERS[3], myRole: "navigator", startTime: "2026-08-27T16:00", endTime: "2026-08-27T17:30", duration: 90, language: "CSS", topic: "Advanced Grid Patterns", tasksCompleted: 5, linesWritten: 210, rating: 5, feedback: "Yuki's CSS knowledge is phenomenal. Learned subgrid and container queries.", tags: ["css", "grid", "layout"] },
  { id: "s5", title: "Mock Interview: System Design", type: "interview_prep", status: "completed", partner: PARTNERS[1], myRole: "both", startTime: "2026-08-26T11:00", endTime: "2026-08-26T12:30", duration: 90, language: "TypeScript", topic: "URL Shortener Design", tasksCompleted: 1, linesWritten: 0, rating: 5, feedback: "Excellent mock interview. Sara asked tough but fair questions.", tags: ["system-design", "interview", "architecture"] },
  { id: "s6", title: "React Native Bug Hunt", type: "debugging", status: "active", partner: PARTNERS[5], myRole: "both", startTime: "2026-08-30T14:00", endTime: null, duration: 45, language: "TypeScript", topic: "Navigation State Bug", tasksCompleted: 1, linesWritten: 34, rating: 0, feedback: "", tags: ["react-native", "navigation", "bug"] },
];

const MESSAGES: SessionMessage[] = [
  { id: "m1", author: "You", avatar: "🧑‍💻", content: "Hey! Ready to tackle this navigation bug?", timestamp: "14:00", type: "text" },
  { id: "m2", author: "Dev Singh", avatar: "🧑‍🚀", content: "Yes! I think it might be related to the deep link handler. Let me share my screen.", timestamp: "14:01", type: "text" },
  { id: "m3", author: "System", avatar: "🤖", content: "Dev Singh started screen sharing", timestamp: "14:02", type: "system" },
  { id: "m4", author: "Dev Singh", avatar: "🧑‍🚀", content: "```typescript\nconst linking = {\n  prefixes: ['myapp://'],\n  config: {\n    screens: {\n      Home: '',\n      Profile: 'user/:id',\n    },\n  },\n};\n```", timestamp: "14:03", type: "code" },
  { id: "m5", author: "You", avatar: "🧑‍💻", content: "I see the issue! The `config.screens` mapping is missing the nested routes.", timestamp: "14:04", type: "text" },
  { id: "m6", author: "System", avatar: "🤖", content: "You started typing in the shared editor", timestamp: "14:05", type: "action" },
];

const MATCH_QUEUE: MatchQueue[] = [
  { id: "mq1", lookingFor: "React expert for code review", skills: ["React", "TypeScript"], language: "TypeScript", sessionType: "code_review", waitTime: "2m", rating: 4.7 },
  { id: "mq2", lookingFor: "Python debugging partner", skills: ["Python", "Django"], language: "Python", sessionType: "debugging", waitTime: "5m", rating: 4.4 },
  { id: "mq3", lookingFor: "System design practice buddy", skills: ["System Design", "Architecture"], language: "Any", sessionType: "interview_prep", waitTime: "1m", rating: 4.9 },
  { id: "mq4", lookingFor: "Open source contributor", skills: ["TypeScript", "React"], language: "TypeScript", sessionType: "open_source", waitTime: "8m", rating: 4.5 },
];

const PAIR_STATS: PairStats = {
  totalSessions: 24, totalHours: 18.5, partnersWorkedWith: 12, avgRating: 4.7,
  favoriteLanguage: "TypeScript", favoriteSessionType: "Learning",
  skillsImproved: ["React Performance", "Debugging", "System Design", "CSS Grid", "TypeScript"],
  streak: 5, level: 6, xp: 2100, maxXp: 3500,
};

/* ─────────────── Sub-Components ─────────────── */

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string; trend?: string; trendUp?: boolean }> = ({ icon, label, value, sub, color = "text-white", trend, trendUp }) => (
  <Card className="p-4 hover:border-white/20 transition-all">
    <div className="flex items-center gap-2 mb-2"><span className={color}>{icon}</span><span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span></div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    {trend && <div className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? "text-green-400" : "text-red-400"}`}>{trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{trend}</div>}
  </Card>
);

const PartnerCard: React.FC<{ partner: PairPartner; selected: boolean; onSelect: () => void }> = ({ partner, selected, onSelect }) => {
  const lvlCfg = LEVEL_CONFIG[partner.level];
  return (
    <div onClick={onSelect} className={`cursor-pointer rounded-xl p-4 border transition-all ${selected ? "border-cyan-400 bg-cyan-500/10 shadow-lg" : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative">
          <span className="text-2xl">{partner.avatar}</span>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${partner.online ? "bg-green-400" : "bg-gray-500"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">{partner.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${lvlCfg.bg} ${lvlCfg.color}`}>{lvlCfg.label}</span>
          </div>
          <div className="text-[10px] text-gray-500">{partner.handle} · {partner.timezone}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400" /><span className="text-sm font-bold text-white">{partner.rating}</span></div>
          <div className="text-[10px] text-gray-500">{partner.sessionsCompleted} sessions</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-2">{partner.bio}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {partner.skills.map((s) => <span key={s} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400">{s}</span>)}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2 text-gray-500">
          <span>{partner.languages.join(", ")}</span>
        </div>
        {partner.online ? <span className="text-green-400">● Online</span> : <span className="text-gray-500">○ {partner.lastActive}</span>}
      </div>
      {partner.matchScore > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-white/10 rounded-full h-1.5"><div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${partner.matchScore}%` }} /></div>
          <span className="text-[10px] text-cyan-400 font-bold">{partner.matchScore}% match</span>
        </div>
      )}
    </div>
  );
};

const SessionCard: React.FC<{ session: PairSession; selected: boolean; onSelect: () => void }> = ({ session, selected, onSelect }) => {
  const typeCfg = SESSION_TYPE_CONFIG[session.type];
  const statusCfg: Record<string, { color: string; bg: string; label: string }> = {
    waiting: { color: "text-gray-400", bg: "bg-gray-500/20", label: "Waiting" },
    matching: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Matching" },
    active: { color: "text-green-400", bg: "bg-green-500/20", label: "Active" },
    completed: { color: "text-purple-400", bg: "bg-purple-500/20", label: "Completed" },
    cancelled: { color: "text-red-400", bg: "bg-red-500/20", label: "Cancelled" },
  };
  const sc = statusCfg[session.status];
  return (
    <div onClick={onSelect} className={`cursor-pointer rounded-xl p-4 border transition-all ${selected ? "border-cyan-400 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={typeCfg.color}>{typeCfg.icon}</span>
          <span className="text-sm font-semibold text-white">{session.title}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
        {session.partner && <span className="flex items-center gap-1">{session.partner.avatar}{session.partner.name}</span>}
        <span className="flex items-center gap-1"><Clock size={10} />{session.duration}min</span>
        <span className="flex items-center gap-1"><Code2 size={10} />{session.language}</span>
        <span className="flex items-center gap-1"><Terminal size={10} />{session.linesWritten} lines</span>
      </div>
      {session.rating > 0 && (
        <div className="flex items-center gap-1 text-[10px]">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={10} className={i < session.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"} />)}
          {session.feedback && <span className="text-gray-500 ml-2 italic truncate">"{session.feedback}"</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-2">
        {session.tags.map((t) => <span key={t} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400">#{t}</span>)}
      </div>
    </div>
  );
};

const ChatMessage: React.FC<{ message: SessionMessage }> = ({ message }) => {
  if (message.type === "system" || message.type === "action") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[10px] text-gray-500 bg-white/5 px-3 py-1 rounded-full">{message.content}</span>
      </div>
    );
  }
  const isMe = message.author === "You";
  return (
    <div className={`flex gap-2 mb-3 ${isMe ? "flex-row-reverse" : ""}`}>
      <span className="text-lg shrink-0">{message.avatar}</span>
      <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold text-white">{message.author}</span>
          <span className="text-[10px] text-gray-500">{message.timestamp}</span>
        </div>
        <div className={`rounded-xl px-3 py-2 text-xs ${isMe ? "bg-cyan-500/20 text-cyan-100" : "bg-white/10 text-gray-300"}`}>
          {message.type === "code" ? (
            <pre className="font-mono text-[11px] text-green-400 whitespace-pre-wrap">{message.content.replace(/```\w*\n?/g, "").trim()}</pre>
          ) : (
            <span>{message.content}</span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────── Main Component ─────────────── */

function PairProgrammingArena() {
  const [activeTab, setActiveTab] = useState<"find_partner" | "sessions" | "active_session" | "stats">("find_partner");
  const [selectedPartner, setSelectedPartner] = useState<PairPartner | null>(null);
  const [selectedSession, setSelectedSession] = useState<PairSession | null>(SESSIONS.find((s) => s.status === "active") || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<SkillLevel | "all">("all");
  const [filterSessionType, setFilterSessionType] = useState<SessionType | "all">("all");
  const [selectedRole, setSelectedRole] = useState<PairRole>("both");
  const [chatMessage, setChatMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredPartners = useMemo(() => {
    let result = [...PARTNERS];
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((p) => p.name.toLowerCase().includes(q) || p.skills.some((s) => s.toLowerCase().includes(q))); }
    if (filterLevel !== "all") result = result.filter((p) => p.level === filterLevel);
    result.sort((a, b) => b.matchScore - a.matchScore);
    return result;
  }, [searchQuery, filterLevel]);

  const completedSessions = SESSIONS.filter((s) => s.status === "completed");

  const tabs = [
    { id: "find_partner" as const, label: "Find Partner", icon: <Users size={14} /> },
    { id: "sessions" as const, label: "Sessions", icon: <Clock size={14} /> },
    { id: "active_session" as const, label: "Active Session", icon: <Code2 size={14} /> },
    { id: "stats" as const, label: "Stats", icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="mx-auto flex max-w-[1536px] w-full flex-col gap-4 pb-6 pt-2 px-1 sm:px-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pair Programming Arena</h1>
            <p className="text-sm text-gray-400">Find partners · Code together · Grow faster</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-400">🔥 {PAIR_STATS.streak} streak</Badge>
          <Badge variant="outline" className="text-purple-400">Lvl {PAIR_STATS.level}</Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<Users size={18} />} label="Sessions" value={PAIR_STATS.totalSessions} color="text-blue-400" />
        <KpiCard icon={<Clock size={18} />} label="Hours" value={`${PAIR_STATS.totalHours}h`} color="text-cyan-400" trend="+3h this week" trendUp />
        <KpiCard icon={<Star size={18} />} label="Avg Rating" value={PAIR_STATS.avgRating} color="text-yellow-400" />
        <KpiCard icon={<UserPlus size={18} />} label="Partners" value={PAIR_STATS.partnersWorkedWith} color="text-green-400" />
        <KpiCard icon={<Flame size={18} />} label="Streak" value={`${PAIR_STATS.streak} days`} color="text-orange-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-blue-500/20 text-blue-400 border border-blue-400/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Find Partner Tab */}
      {activeTab === "find_partner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {/* Search & Match */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <TypoHeading className="text-base">Available Partners</TypoHeading>
                <Button onClick={() => setIsSearching(!isSearching)} className={`gap-2 ${isSearching ? "bg-red-500/20 text-red-400 border-red-400/30" : ""}`} variant={isSearching ? "outline" : "default"}>
                  {isSearching ? <><Square size={14} />Stop Searching</> : <><Zap size={14} />Quick Match</>}
                </Button>
              </div>
              {isSearching && (
                <div className="mb-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-400/20">
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Searching for the best match...</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {MATCH_QUEUE.map((mq) => (
                      <div key={mq.id} className="text-[10px] bg-white/5 rounded-lg px-2 py-1 text-gray-400">
                        {mq.lookingFor} · <span className="text-gray-500">waiting {mq.waitTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center bg-white/5 rounded-lg border border-white/10 px-3 py-2 flex-1 min-w-[200px]">
                  <Search size={14} className="text-gray-400 mr-2" />
                  <input type="text" placeholder="Search partners, skills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-white text-sm outline-none flex-1" />
                </div>
                <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
                  <option value="all">All Levels</option>
                  {Object.entries(LEVEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterSessionType} onChange={(e) => setFilterSessionType(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
                  <option value="all">All Types</option>
                  {Object.entries(SESSION_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </Card>
            {/* Partner List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPartners.map((p) => <PartnerCard key={p.id} partner={p} selected={selectedPartner?.id === p.id} onSelect={() => setSelectedPartner(p)} />)}
            </div>
          </div>
          {/* Partner Detail */}
          <div className="space-y-4">
            {selectedPartner ? (
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{selectedPartner.avatar}</span>
                  <div>
                    <h3 className="font-bold text-white">{selectedPartner.name}</h3>
                    <div className="text-[10px] text-gray-500">{selectedPartner.handle}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">{selectedPartner.bio}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Rating</div><div className="text-yellow-400 font-bold">{selectedPartner.rating} ⭐</div></div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Sessions</div><div className="text-white font-bold">{selectedPartner.sessionsCompleted}</div></div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Level</div><div className={`font-bold ${LEVEL_CONFIG[selectedPartner.level].color}`}>{LEVEL_CONFIG[selectedPartner.level].label}</div></div>
                  <div className="bg-white/5 rounded-lg p-2 text-center"><div className="text-gray-500">Match</div><div className="text-cyan-400 font-bold">{selectedPartner.matchScore}%</div></div>
                </div>
                <div className="mb-3"><div className="text-[10px] text-gray-500 mb-1">Skills</div><div className="flex flex-wrap gap-1">{selectedPartner.skills.map((s) => <span key={s} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{s}</span>)}</div></div>
                <div className="mb-3"><div className="text-[10px] text-gray-500 mb-1">Looking For</div><div className="flex flex-wrap gap-1">{selectedPartner.lookingFor.map((l) => <span key={l} className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-400">{l}</span>)}</div></div>
                <div className="mb-4"><div className="text-[10px] text-gray-500 mb-1">Specialties</div><div className="flex flex-wrap gap-1">{selectedPartner.specialties.map((s) => <span key={s} className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-400">{s}</span>)}</div></div>
                {/* Role Selection */}
                <div className="mb-4">
                  <div className="text-[10px] text-gray-500 mb-2">Your Role</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                      <button key={k} onClick={() => setSelectedRole(k as PairRole)} className={`p-2 rounded-lg border text-center transition-all ${selectedRole === k ? `${v.bg} ${v.color} border-current` : "border-white/10 text-gray-400 hover:bg-white/5"}`}>
                        <div className="flex justify-center mb-1">{v.icon}</div>
                        <div className="text-[10px] font-medium">{v.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={() => { setActiveTab("active_session"); }}>
                  <Code2 size={14} />Start Pair Session
                </Button>
              </Card>
            ) : (
              <Card className="p-8 text-center"><Users size={32} className="mx-auto mb-2 text-gray-600" /><p className="text-gray-400 text-sm">Select a partner to view details</p></Card>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <div className="space-y-3 max-w-4xl">
          <TypoHeading className="text-base">Session History</TypoHeading>
          {SESSIONS.map((s) => <SessionCard key={s.id} session={s} selected={selectedSession?.id === s.id} onSelect={() => setSelectedSession(s)} />)}
        </div>
      )}

      {/* Active Session Tab */}
      {activeTab === "active_session" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden">
              {/* Session Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-semibold text-white">{selectedSession?.title || "React Native Bug Hunt"}</span>
                  <Badge variant="outline" className="text-[10px] text-green-400">Live</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white"><Mic size={14} /></button>
                  <button className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white"><Video size={14} /></button>
                  <button className="p-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white"><Monitor size={14} /></button>
                  <button className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:text-red-300"><Square size={14} /></button>
                </div>
              </div>
              {/* Shared Editor */}
              <div className="bg-gray-900 p-4 min-h-[300px] font-mono text-xs">
                <div className="text-gray-500 mb-2">// Shared Editor — {selectedSession?.language || "TypeScript"}</div>
                <div className="text-gray-300">
                  <div><span className="text-purple-400">const</span> <span className="text-cyan-400">linking</span> = {"{"}</div>
                  <div className="pl-4"><span className="text-cyan-400">prefixes</span>: [<span className="text-green-400">'myapp://'</span>],</div>
                  <div className="pl-4"><span className="text-cyan-400">config</span>: {"{"}</div>
                  <div className="pl-8"><span className="text-cyan-400">screens</span>: {"{"}</div>
                  <div className="pl-12"><span className="text-cyan-400">Home</span>: <span className="text-green-400">''</span>,</div>
                  <div className="pl-12"><span className="text-cyan-400">Profile</span>: <span className="text-green-400">'user/:id'</span>,</div>
                  <div className="pl-8">{"}"},</div>
                  <div className="pl-4">{"}"},</div>
                  <div>{"}"}</div>
                  <div className="mt-2 text-gray-500">// 🔍 Bug: Missing nested route mappings for deep links</div>
                  <div className="text-yellow-400">// 💡 Fix: Add Settings and Notification routes</div>
                </div>
              </div>
            </Card>
          </div>
          {/* Chat Panel */}
          <div className="space-y-4">
            <Card className="p-4">
              <TypoCaption className="text-gray-400 mb-3">Session Chat</TypoCaption>
              <div className="space-y-1 max-h-[300px] overflow-y-auto mb-3">
                {MESSAGES.map((m) => <ChatMessage key={m.id} message={m} />)}
              </div>
              <div className="flex gap-2">
                <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-400" />
                <button className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Send size={14} /></button>
              </div>
            </Card>
            {/* Session Info */}
            <Card className="p-4">
              <TypoCaption className="text-gray-400 mb-3">Session Info</TypoCaption>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="text-white">45 min</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tasks</span><span className="text-white">1 completed</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Lines</span><span className="text-white">34 written</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Your Role</span><span className="text-cyan-400 capitalize">{selectedRole}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Partner</span><span className="text-white">Dev Singh 🧑‍🚀</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Session History</TypoHeading>
            <div className="flex items-end gap-2 h-40">
              {PAIR_STATS.totalSessions > 0 && Array.from({ length: 6 }).map((_, i) => {
                const heights = [3, 5, 4, 6, 4, 2];
                const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">{heights[i]}</span>
                    <div className="w-full rounded-t bg-blue-400" style={{ height: `${(heights[i] / 6) * 100}%` }} />
                    <span className="text-[9px] text-gray-500">{months[i]}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Skills Improved</TypoHeading>
            <div className="space-y-2">
              {PAIR_STATS.skillsImproved.map((skill, i) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-32">{skill}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${90 - i * 12}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{90 - i * 12}%</span>
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
                  <circle cx={64} cy={64} r={56} fill="none" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - PAIR_STATS.xp / PAIR_STATS.maxXp)} transform="rotate(-90 64 64)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Users size={24} className="text-blue-400 mb-1" />
                  <span className="text-2xl font-bold text-white">{PAIR_STATS.level}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-white font-semibold">Pair Coder Lv.{PAIR_STATS.level}</div>
                <div className="text-xs text-gray-400">{PAIR_STATS.xp}/{PAIR_STATS.maxXp} XP</div>
                <div className="w-48 bg-white/10 rounded-full h-2 mt-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${(PAIR_STATS.xp / PAIR_STATS.maxXp) * 100}%` }} />
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Quick Stats</TypoHeading>
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Total Hours</div><div className="text-white font-bold text-lg">{PAIR_STATS.totalHours}h</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Avg Rating</div><div className="text-yellow-400 font-bold text-lg">{PAIR_STATS.avgRating} ⭐</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Favorite Lang</div><div className="text-blue-400 font-bold text-lg">{PAIR_STATS.favoriteLanguage}</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Favorite Type</div><div className="text-purple-400 font-bold text-lg">{PAIR_STATS.favoriteSessionType}</div></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
