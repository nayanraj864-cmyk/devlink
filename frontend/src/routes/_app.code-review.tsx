import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  GitPullRequest, GitBranch, GitMerge, MessageSquare, CheckCircle2,
  XCircle, AlertTriangle, Clock, Star, Award, ThumbsUp, ThumbsDown,
  Minus, ChevronDown, ChevronUp, Search, Filter, Eye, Code2, FileText,
  Shield, Bug, Zap, Flame, Heart, TrendingUp, TrendingDown, BarChart3,
  Target, Lightbulb, BookOpen, AlertCircle, Info, Copy, Share2,
  Send, Reply, MoreHorizontal, Edit3, Trash2, Bookmark, Flag,
  Layers, Terminal, Palette, Database, Globe, Server, Brain,
  Sparkles, Crown, Medal, Trophy, CircleDot, Hash, AtSign,
  ArrowRight, ExternalLink, RefreshCw, Download, Settings,
} from "lucide-react";
import { Card } from "@/components/shared/primitives";
import { TypoCaption, TypoHeading } from "@/components/shared/Typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/code-review")({
  head: () => ({
    meta: [
      { title: "Code Review Playground — DevLink" },
      { name: "description", content: "Practice code reviews, improve feedback quality, and learn best practices." },
    ],
  }),
  component: CodeReviewPlayground,
});

/* ─────────────── Types ─────────────── */

type ReviewSeverity = "info" | "suggestion" | "warning" | "issue" | "critical";
type ReviewCategory = "correctness" | "performance" | "security" | "readability" | "maintainability" | "testing" | "documentation" | "style";
type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert";

interface ReviewChallenge {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: DifficultyLevel;
  category: ReviewCategory;
  totalIssues: number;
  timeLimit: number;
  points: number;
  solvedBy: number;
  rating: number;
  tags: string[];
  author: string;
  createdAt: string;
}

interface CodeFile {
  id: string;
  filename: string;
  language: string;
  content: string;
  diff?: string;
  issues: CodeIssue[];
}

interface CodeIssue {
  id: string;
  line: number;
  endLine?: number;
  severity: ReviewSeverity;
  category: ReviewCategory;
  message: string;
  suggestion: string;
  codeExample?: string;
  found: boolean;
  points: number;
}

interface ReviewComment {
  id: string;
  issueId: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  reactions: { emoji: string; count: number }[];
  replies: ReviewComment[];
  resolved: boolean;
}

interface ReviewStats {
  totalReviews: number;
  avgScore: number;
  issuesFound: number;
  accuracy: number;
  topCategories: { category: string; count: number; accuracy: number }[];
  streak: number;
  level: number;
  xp: number;
  maxXp: number;
}

interface ReviewTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  prefix: string;
  examples: string[];
}

/* ─────────────── Constants ─────────────── */

const SEVERITY_CONFIG: Record<ReviewSeverity, { color: string; bg: string; icon: React.ReactNode; label: string; points: number }> = {
  info: { color: "text-blue-400", bg: "bg-blue-500/20", icon: <Info size={14} />, label: "Info", points: 5 },
  suggestion: { color: "text-cyan-400", bg: "bg-cyan-500/20", icon: <Lightbulb size={14} />, label: "Suggestion", points: 10 },
  warning: { color: "text-yellow-400", bg: "bg-yellow-500/20", icon: <AlertTriangle size={14} />, label: "Warning", points: 15 },
  issue: { color: "text-orange-400", bg: "bg-orange-500/20", icon: <AlertCircle size={14} />, label: "Issue", points: 20 },
  critical: { color: "text-red-400", bg: "bg-red-500/20", icon: <Bug size={14} />, label: "Critical", points: 30 },
};

const CATEGORY_CONFIG: Record<ReviewCategory, { color: string; icon: React.ReactNode; label: string }> = {
  correctness: { color: "text-red-400", icon: <Bug size={14} />, label: "Correctness" },
  performance: { color: "text-yellow-400", icon: <Zap size={14} />, label: "Performance" },
  security: { color: "text-orange-400", icon: <Shield size={14} />, label: "Security" },
  readability: { color: "text-cyan-400", icon: <Eye size={14} />, label: "Readability" },
  maintainability: { color: "text-purple-400", icon: <Layers size={14} />, label: "Maintainability" },
  testing: { color: "text-green-400", icon: <CheckCircle2 size={14} />, label: "Testing" },
  documentation: { color: "text-blue-400", icon: <FileText size={14} />, label: "Documentation" },
  style: { color: "text-pink-400", icon: <Palette size={14} />, label: "Style" },
};

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { color: string; bg: string; label: string }> = {
  beginner: { color: "text-green-400", bg: "bg-green-500/20", label: "Beginner" },
  intermediate: { color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Intermediate" },
  advanced: { color: "text-orange-400", bg: "bg-orange-500/20", label: "Advanced" },
  expert: { color: "text-red-400", bg: "bg-red-500/20", label: "Expert" },
};

const REVIEW_TEMPLATES: ReviewTemplate[] = [
  { id: "t1", name: "Bug Report", icon: <Bug size={14} />, prefix: "🐛 Bug:", examples: ["Off-by-one error in loop boundary", "Null pointer dereference possible", "Race condition in async handler"] },
  { id: "t2", name: "Performance", icon: <Zap size={14} />, prefix: "⚡ Perf:", examples: ["O(n²) complexity — consider using a Set for O(1) lookups", "Unnecessary re-render — memoize this component", "Memory leak — add cleanup in useEffect"] },
  { id: "t3", name: "Security", icon: <Shield size={14} />, prefix: "🔒 Security:", examples: ["SQL injection risk — use parameterized queries", "XSS vulnerability — sanitize user input", "Hardcoded secret detected"] },
  { id: "t4", name: "Suggestion", icon: <Lightbulb size={14} />, prefix: "💡 Suggestion:", examples: ["Consider extracting this into a custom hook", "Use optional chaining for cleaner null checks", "Could simplify with array destructuring"] },
  { id: "t5", name: "Praise", icon: <Heart size={14} />, prefix: "❤️ Love:", examples: ["Clean separation of concerns!", "Great use of TypeScript generics", "This error handling is thorough"] },
  { id: "t6", name: "Question", icon: <MessageSquare size={14} />, prefix: "❓ Question:", examples: ["What happens if the API returns an empty array?", "Is this intentionally mutable?", "Should this be await-ed?"] },
];

/* ─────────────── Sample Data ─────────────── */

const CHALLENGES: ReviewChallenge[] = [
  { id: "ch1", title: "React Component Cleanup", description: "Review a React component for memory leaks, cleanup issues, and useEffect anti-patterns", language: "TypeScript", difficulty: "beginner", category: "correctness", totalIssues: 5, timeLimit: 15, points: 50, solvedBy: 2340, rating: 4.7, tags: ["react", "hooks", "cleanup"], author: "CodeReviewBot", createdAt: "2026-08-15" },
  { id: "ch2", title: "API Rate Limiter", description: "Find bugs and security issues in a custom rate limiter implementation", language: "TypeScript", difficulty: "intermediate", category: "security", totalIssues: 7, timeLimit: 20, points: 100, solvedBy: 1890, rating: 4.8, tags: ["api", "security", "rate-limiting"], author: "SecurityGuru", createdAt: "2026-08-20" },
  { id: "ch3", title: "Database Query Optimizer", description: "Identify N+1 queries, missing indexes, and inefficient ORM usage", language: "TypeScript", difficulty: "advanced", category: "performance", totalIssues: 8, timeLimit: 25, points: 150, solvedBy: 1200, rating: 4.9, tags: ["database", "orm", "optimization"], author: "DBExpert", createdAt: "2026-08-22" },
  { id: "ch4", title: "Authentication Flow", description: "Review JWT implementation for security vulnerabilities and token management issues", language: "TypeScript", difficulty: "advanced", category: "security", totalIssues: 6, timeLimit: 20, points: 120, solvedBy: 1560, rating: 4.6, tags: ["auth", "jwt", "security"], author: "AuthMaster", createdAt: "2026-08-25" },
  { id: "ch5", title: "E-Commerce Cart Logic", description: "Find correctness bugs in shopping cart calculation and state management", language: "JavaScript", difficulty: "beginner", category: "correctness", totalIssues: 6, timeLimit: 15, points: 60, solvedBy: 3100, rating: 4.5, tags: ["cart", "state", "calculation"], author: "ShopDev", createdAt: "2026-07-10" },
  { id: "ch6", title: "WebSocket Chat Server", description: "Identify concurrency issues, memory leaks, and scalability problems", language: "TypeScript", difficulty: "expert", category: "correctness", totalIssues: 10, timeLimit: 30, points: 200, solvedBy: 680, rating: 4.9, tags: ["websocket", "concurrency", "scaling"], author: "RealTimePro", createdAt: "2026-08-28" },
];

const SAMPLE_FILES: CodeFile[] = [
  {
    id: "f1", filename: "useDebounce.ts", language: "TypeScript",
    content: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const debouncedCallback = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const newId = window.setTimeout(() => {
      callback(...args);
    }, delay);
    setTimeoutId(newId as unknown as number);
  };

  return debouncedCallback as T;
}`,
    issues: [
      { id: "i1", line: 13, severity: "warning", category: "correctness", message: "Missing dependency in useEffect", suggestion: "The 'delay' prop is missing from the dependency array. If delay changes, the effect won't re-run.", codeExample: "}, [value, delay]);", found: false, points: 15 },
      { id: "i2", line: 22, severity: "issue", category: "correctness", message: "Potential memory leak in useDebouncedCallback", suggestion: "Timeout ID is not cleaned up on unmount. Add a cleanup function.", codeExample: "useEffect(() => () => { if (timeoutId) clearTimeout(timeoutId); }, [timeoutId]);", found: false, points: 20 },
      { id: "i3", line: 26, severity: "warning", category: "correctness", message: "Type assertion may cause issues", suggestion: "window.setTimeout returns a NodeJS.Timeout or number depending on environment. Use a more robust type.", codeExample: "const newId = window.setTimeout(() => {", found: false, points: 10 },
      { id: "i4", line: 17, severity: "suggestion", category: "readability", message: "Consider using useRef for timeout tracking", suggestion: "Using useState for timeout IDs causes unnecessary re-renders. useRef is more appropriate here.", codeExample: "const timeoutRef = useRef<number | null>(null);", found: false, points: 10 },
      { id: "i5", line: 24, severity: "suggestion", category: "maintainability", message: "Callback is not memoized", suggestion: "The debounced callback is recreated on every render. Wrap with useCallback for stable references.", codeExample: "const debouncedCallback = useCallback((...args: Parameters<T>) => {", found: false, points: 10 },
    ],
  },
  {
    id: "f2", filename: "apiClient.ts", language: "TypeScript",
    content: `const API_BASE = "https://api.example.com/v1";

interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      "Content-Type": "application/json",
    };
  }

  setAuthToken(token: string) {
    this.headers["Authorization"] = \`Bearer \${token}\`;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return response.json();
  }
}

export const api = new ApiClient(API_BASE);`,
    issues: [
      { id: "i6", line: 27, severity: "issue", category: "correctness", message: "No error handling for non-OK responses", suggestion: "response.json() will fail if the server returns an error status. Check response.ok before parsing.", codeExample: "if (!response.ok) throw new ApiError(response.status, await response.text());", found: false, points: 20 },
      { id: "i7", line: 29, severity: "issue", category: "correctness", message: "Missing error handling on response parsing", suggestion: "response.json() can throw if the body is not valid JSON. Wrap in try-catch.", codeExample: "const data = await response.json().catch(() => null);", found: false, points: 15 },
      { id: "i8", line: 37, severity: "issue", category: "correctness", message: "No error handling for non-OK responses in POST", suggestion: "Same issue as GET — POST requests also need error handling.", codeExample: "if (!response.ok) { const err = await response.text(); throw new Error(err); }", found: false, points: 15 },
      { id: "i9", line: 1, severity: "info", category: "security", message: "Hardcoded API base URL", suggestion: "Move to environment variable for different deployment environments.", codeExample: 'const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.example.com/v1";', found: false, points: 10 },
      { id: "i10", line: 10, severity: "suggestion", category: "maintainability", message: "Consider using an interceptor pattern", suggestion: "Add request/response interceptors for auth tokens, retries, and error handling.", codeExample: "this.interceptors.request.use((config) => { ... });", found: false, points: 10 },
      { id: "i11", line: 34, severity: "warning", category: "security", message: "No request timeout configured", suggestion: "Fetch requests can hang indefinitely. Add AbortController with timeout.", codeExample: "const controller = new AbortController(); setTimeout(() => controller.abort(), 10000);", found: false, points: 15 },
    ],
  },
];

const REVIEW_STATS: ReviewStats = {
  totalReviews: 47, avgScore: 78, issuesFound: 156, accuracy: 82,
  topCategories: [
    { category: "correctness", count: 52, accuracy: 88 },
    { category: "security", count: 34, accuracy: 76 },
    { category: "performance", count: 28, accuracy: 82 },
    { category: "readability", count: 22, accuracy: 91 },
    { category: "maintainability", count: 20, accuracy: 74 },
  ],
  streak: 5, level: 7, xp: 3450, maxXp: 5000,
};

const SAMPLE_COMMENTS: ReviewComment[] = [
  { id: "c1", issueId: "i1", author: "ReviewBot", avatar: "🤖", content: "Good catch on the dependency array! Missing deps is a common React pitfall.", timestamp: "2h ago", reactions: [{ emoji: "👍", count: 3 }, { emoji: "🎯", count: 1 }], replies: [], resolved: false },
  { id: "c2", issueId: "i6", author: "SeniorDev", avatar: "👨‍💻", content: "This is a critical issue. In production, this would cause silent failures when the API returns 4xx/5xx errors.", timestamp: "1h ago", reactions: [{ emoji: "💯", count: 5 }], replies: [{ id: "c3", issueId: "i6", author: "JuniorDev", avatar: "🧑‍💻", content: "Thanks! I'll add proper error handling.", timestamp: "45m ago", reactions: [], replies: [], resolved: false }], resolved: false },
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

const ChallengeCard: React.FC<{ challenge: ReviewChallenge; selected: boolean; onSelect: () => void }> = ({ challenge, selected, onSelect }) => {
  const diffCfg = DIFFICULTY_CONFIG[challenge.difficulty];
  const catCfg = CATEGORY_CONFIG[challenge.category];
  return (
    <div onClick={onSelect} className={`cursor-pointer rounded-xl p-4 border transition-all ${selected ? "border-cyan-400 bg-cyan-500/10 shadow-lg" : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white text-sm">{challenge.title}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${diffCfg.bg} ${diffCfg.color}`}>{diffCfg.label}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">{challenge.description}</p>
      <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-2">
        <span className="flex items-center gap-1">{catCfg.icon}{catCfg.label}</span>
        <span className="flex items-center gap-1"><Code2 size={10} />{challenge.language}</span>
        <span className="flex items-center gap-1"><Bug size={10} />{challenge.totalIssues} issues</span>
        <span className="flex items-center gap-1"><Clock size={10} />{challenge.timeLimit}min</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px]"><Star size={10} className="text-yellow-400 fill-yellow-400" /><span className="text-gray-400">{challenge.rating}</span><span className="text-gray-500">· {challenge.solvedBy.toLocaleString()} solved</span></div>
        <span className="text-xs font-bold text-cyan-400">{challenge.points} pts</span>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {challenge.tags.map((t) => <span key={t} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400">#{t}</span>)}
      </div>
    </div>
  );
};

const CodeViewer: React.FC<{ file: CodeFile; foundIssues: Set<string>; onToggleIssue: (id: string) => void }> = ({ file, foundIssues, onToggleIssue }) => {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const lines = file.content.split("\n");
  return (
    <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /><span className="w-3 h-3 rounded-full bg-yellow-500" /><span className="w-3 h-3 rounded-full bg-green-500" /></div>
        <span className="text-xs text-gray-400 ml-2 font-mono">{file.filename}</span>
        <span className="text-[10px] text-gray-500 ml-auto">{file.language}</span>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <pre className="text-xs font-mono leading-5">
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const issue = file.issues.find((iss) => iss.line === lineNum);
            const isFound = issue ? foundIssues.has(issue.id) : false;
            const isHovered = hoveredLine === lineNum;
            const hasIssue = !!issue;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredLine(lineNum)}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => issue && onToggleIssue(issue.id)}
                className={`flex items-center ${hasIssue ? (isFound ? "bg-green-500/10" : "bg-red-500/10") : isHovered ? "bg-white/5" : ""} ${hasIssue ? "cursor-pointer" : ""} transition-colors`}
              >
                <span className="w-12 text-right pr-3 text-gray-600 select-none shrink-0">{lineNum}</span>
                <span className={`w-6 shrink-0 ${hasIssue && !isFound ? "text-red-400" : hasIssue && isFound ? "text-green-400" : "text-gray-600"}`}>
                  {hasIssue ? (isFound ? "✓" : "●") : ""}
                </span>
                <span className="pl-2 pr-4 text-gray-300">{line || " "}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};

const IssuePanel: React.FC<{ issues: CodeIssue[]; foundIssues: Set<string>; onToggleIssue: (id: string) => void; selectedIssue: CodeIssue | null; onSelectIssue: (issue: CodeIssue) => void }> = ({ issues, foundIssues, onToggleIssue, selectedIssue, onSelectIssue }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between mb-2">
      <TypoCaption className="text-gray-400">Issues ({foundIssues.size}/{issues.length})</TypoCaption>
      <div className="flex gap-1">
        {Object.entries(SEVERITY_CONFIG).map(([k, v]) => {
          const count = issues.filter((i) => i.severity === k).length;
          return count > 0 ? <span key={k} className={`text-[10px] px-1.5 py-0.5 rounded-full ${v.bg} ${v.color}`}>{count} {v.label}</span> : null;
        })}
      </div>
    </div>
    {issues.map((issue) => {
      const isFound = foundIssues.has(issue.id);
      const sevCfg = SEVERITY_CONFIG[issue.severity];
      const catCfg = CATEGORY_CONFIG[issue.category];
      const isSelected = selectedIssue?.id === issue.id;
      return (
        <div key={issue.id} onClick={() => onSelectIssue(issue)} className={`rounded-lg p-3 border cursor-pointer transition-all ${isSelected ? "border-cyan-400 bg-cyan-500/10" : isFound ? "border-green-400/30 bg-green-500/5" : "border-white/10 bg-white/5 hover:bg-white/8"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${isFound ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-500"}`}>{isFound ? "✓" : issue.line}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sevCfg.bg} ${sevCfg.color}`}>{sevCfg.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${catCfg.color} bg-white/5`}>{catCfg.label}</span>
            <span className="text-[10px] text-gray-500 ml-auto">+{issue.points}pts</span>
          </div>
          <div className="text-xs text-white mb-1">{issue.message}</div>
          {isSelected && (
            <div className="mt-2 space-y-2">
              <div className="text-[11px] text-gray-400 bg-white/5 rounded-lg p-2">{issue.suggestion}</div>
              {issue.codeExample && (
                <div className="bg-gray-900 rounded-lg p-2 text-[11px] font-mono text-green-400">{issue.codeExample}</div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const CommentThread: React.FC<{ comment: ReviewComment }> = ({ comment }) => (
  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">{comment.avatar}</span>
      <span className="text-sm font-semibold text-white">{comment.author}</span>
      <span className="text-[10px] text-gray-500">{comment.timestamp}</span>
      {comment.resolved && <CheckCircle2 size={12} className="text-green-400" />}
    </div>
    <p className="text-xs text-gray-300 mb-2">{comment.content}</p>
    <div className="flex items-center gap-2">
      {comment.reactions.map((r) => (
        <span key={r.emoji} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-400 cursor-pointer hover:bg-white/20">{r.emoji} {r.count}</span>
      ))}
      <button className="text-[10px] text-gray-500 hover:text-white ml-auto flex items-center gap-1"><Reply size={10} />Reply</button>
    </div>
    {comment.replies.length > 0 && (
      <div className="mt-2 ml-4 space-y-2 border-l border-white/10 pl-3">
        {comment.replies.map((r) => <CommentThread key={r.id} comment={r} />)}
      </div>
    )}
  </div>
);

/* ─────────────── Main Component ─────────────── */

function CodeReviewPlayground() {
  const [activeTab, setActiveTab] = useState<"challenges" | "playground" | "templates" | "stats">("challenges");
  const [selectedChallenge, setSelectedChallenge] = useState<ReviewChallenge | null>(null);
  const [selectedFile, setSelectedFile] = useState<CodeFile>(SAMPLE_FILES[0]);
  const [foundIssues, setFoundIssues] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<CodeIssue | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel | "all">("all");
  const [filterCategory, setFilterCategory] = useState<ReviewCategory | "all">("all");
  const [showHint, setShowHint] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const toggleIssue = (id: string) => {
    setFoundIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const score = useMemo(() => {
    const issues = selectedFile.issues;
    const found = issues.filter((i) => foundIssues.has(i.id));
    const total = issues.reduce((s, i) => s + i.points, 0);
    const earned = found.reduce((s, i) => s + i.points, 0);
    return { found: found.length, total: issues.length, pointsEarned: earned, pointsTotal: total, percentage: total > 0 ? Math.round((earned / total) * 100) : 0 };
  }, [foundIssues, selectedFile]);

  const filteredChallenges = useMemo(() => {
    let result = [...CHALLENGES];
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((c) => c.title.toLowerCase().includes(q) || c.tags.some((t) => t.includes(q))); }
    if (filterDifficulty !== "all") result = result.filter((c) => c.difficulty === filterDifficulty);
    if (filterCategory !== "all") result = result.filter((c) => c.category === filterCategory);
    return result;
  }, [searchQuery, filterDifficulty, filterCategory]);

  const tabs = [
    { id: "challenges" as const, label: "Challenges", icon: <Target size={14} /> },
    { id: "playground" as const, label: "Playground", icon: <Code2 size={14} /> },
    { id: "templates" as const, label: "Templates", icon: <FileText size={14} /> },
    { id: "stats" as const, label: "My Stats", icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="mx-auto flex max-w-[1536px] w-full flex-col gap-4 pb-6 pt-2 px-1 sm:px-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
            <GitPullRequest size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Code Review Playground</h1>
            <p className="text-sm text-gray-400">Practice reviews · Find bugs · Level up</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-cyan-400">Level {REVIEW_STATS.level}</Badge>
          <Badge variant="outline" className="text-purple-400">🔥 {REVIEW_STATS.streak} streak</Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={<GitPullRequest size={18} />} label="Reviews" value={REVIEW_STATS.totalReviews} color="text-purple-400" />
        <KpiCard icon={<Bug size={18} />} label="Issues Found" value={REVIEW_STATS.issuesFound} color="text-red-400" trend="+12 this week" trendUp />
        <KpiCard icon={<Target size={18} />} label="Accuracy" value={`${REVIEW_STATS.accuracy}%`} color="text-green-400" />
        <KpiCard icon={<Flame size={18} />} label="Streak" value={`${REVIEW_STATS.streak} days`} color="text-orange-400" />
        <KpiCard icon={<Zap size={18} />} label="XP" value={`${REVIEW_STATS.xp}/${REVIEW_STATS.maxXp}`} color="text-cyan-400" sub={`Level ${REVIEW_STATS.level}`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-purple-500/20 text-purple-400 border border-purple-400/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Challenges Tab */}
      {activeTab === "challenges" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 px-3 py-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-gray-400 mr-2" />
              <input type="text" placeholder="Search challenges..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-white text-sm outline-none flex-1" />
            </div>
            <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
              <option value="all">All Levels</option>
              {Object.entries(DIFFICULTY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none">
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredChallenges.map((c) => (
              <ChallengeCard key={c.id} challenge={c} selected={selectedChallenge?.id === c.id} onSelect={() => { setSelectedChallenge(c); setActiveTab("playground"); }} />
            ))}
          </div>
        </div>
      )}

      {/* Playground Tab */}
      {activeTab === "playground" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {/* File Tabs */}
            <div className="flex gap-1">
              {SAMPLE_FILES.map((f) => (
                <button key={f.id} onClick={() => { setSelectedFile(f); setFoundIssues(new Set()); setSelectedIssue(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${selectedFile.id === f.id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>
                  {f.filename}
                </button>
              ))}
            </div>
            <CodeViewer file={selectedFile} foundIssues={foundIssues} onToggleIssue={toggleIssue} />
            {/* Score Bar */}
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-semibold">Review Score</span>
                <span className="text-sm font-bold text-cyan-400">{score.pointsEarned}/{score.pointsTotal} pts ({score.percentage}%)</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-purple-400 to-cyan-400 h-2.5 rounded-full transition-all" style={{ width: `${score.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                <span>Found {score.found}/{score.total} issues</span>
                <button onClick={() => setShowHint(!showHint)} className="text-cyan-400 hover:underline">{showHint ? "Hide hints" : "Need a hint?"}</button>
              </div>
              {showHint && (
                <div className="mt-2 p-2 bg-cyan-500/10 rounded-lg text-[11px] text-cyan-300">
                  💡 Look at the useEffect dependency array and error handling patterns. Check for missing cleanup functions and type safety issues.
                </div>
              )}
            </Card>
            {/* Comment Box */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🧑‍💻</span>
                <span className="text-sm text-white font-medium">Add Review Comment</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {REVIEW_TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => { setSelectedTemplate(t.id); setReviewComment(t.prefix + " "); }} className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-all ${selectedTemplate === t.id ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                    {t.icon}{t.name}
                  </button>
                ))}
              </div>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Write your review comment..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-400 resize-none h-20" />
              <div className="flex justify-end mt-2"><Button size="sm" className="gap-1"><Send size={12} />Post Comment</Button></div>
            </Card>
          </div>
          <div className="space-y-4">
            <IssuePanel issues={selectedFile.issues} foundIssues={foundIssues} onToggleIssue={toggleIssue} selectedIssue={selectedIssue} onSelectIssue={setSelectedIssue} />
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="max-w-3xl space-y-3">
          <TypoHeading className="text-base">Review Comment Templates</TypoHeading>
          {REVIEW_TEMPLATES.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-400">{t.icon}</span>
                <span className="font-semibold text-white">{t.name}</span>
                <span className="text-[10px] text-gray-500 font-mono">{t.prefix}</span>
              </div>
              <div className="space-y-1">
                {t.examples.map((ex, i) => (
                  <div key={i} className="text-xs text-gray-400 bg-white/5 rounded-lg px-3 py-1.5 font-mono">{t.prefix} {ex}</div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Review Performance</TypoHeading>
            <div className="space-y-3">
              {REVIEW_STATS.topCategories.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat.category as ReviewCategory];
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-gray-400">{cfg.icon}{cfg.label}</span>
                      <span className="text-white">{cat.count} reviews · {cat.accuracy}% accuracy</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${cat.accuracy}%`, backgroundColor: cfg.color.replace("text-", "") }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <TypoHeading className="text-base mb-4">Level Progress</TypoHeading>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-32 h-32 mb-4">
                <svg width={128} height={128}>
                  <circle cx={64} cy={64} r={56} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx={64} cy={64} r={56} fill="none" stroke="#a855f7" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 56} strokeDashoffset={2 * Math.PI * 56 * (1 - REVIEW_STATS.xp / REVIEW_STATS.maxXp)} transform="rotate(-90 64 64)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Crown size={24} className="text-purple-400 mb-1" />
                  <span className="text-2xl font-bold text-white">{REVIEW_STATS.level}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-white font-semibold">Level {REVIEW_STATS.level} Reviewer</div>
                <div className="text-xs text-gray-400">{REVIEW_STATS.xp}/{REVIEW_STATS.maxXp} XP to next level</div>
                <div className="w-48 bg-white/10 rounded-full h-2 mt-2">
                  <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${(REVIEW_STATS.xp / REVIEW_STATS.maxXp) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Total Reviews</div><div className="text-white font-bold text-lg">{REVIEW_STATS.totalReviews}</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Avg Score</div><div className="text-green-400 font-bold text-lg">{REVIEW_STATS.avgScore}%</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Issues Found</div><div className="text-red-400 font-bold text-lg">{REVIEW_STATS.issuesFound}</div></div>
              <div className="bg-white/5 rounded-lg p-3"><div className="text-gray-500">Accuracy</div><div className="text-cyan-400 font-bold text-lg">{REVIEW_STATS.accuracy}%</div></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
