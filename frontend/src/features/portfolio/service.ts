import type {
  Project, ProjectReview, ProjectAnalytics, ShowcaseCollection,
  GitHubStats, ProjectInsight, PortfolioSummary,
} from './types';

// ============================================================================
// Projects
// ============================================================================

export const mockProjects: Project[] = [
  {
    id: 'proj-001', name: 'DevLink Platform', slug: 'devlink-platform',
    description: 'Developer social network with profiles, projects, hackathons, and collaboration tools',
    longDescription: 'Full-stack developer platform built with React, TanStack Router, FastAPI, and PostgreSQL. Features real-time messaging, project showcases, hackathon management, and AI-powered skill matching.',
    category: 'fullstack', status: 'active', visibility: 'public', license: 'mit',
    techStack: ['React', 'TypeScript', 'TanStack Router', 'FastAPI', 'PostgreSQL', 'Redis', 'Docker'],
    githubUrl: 'https://github.com/Anubhutisharma-07/devlink', demoUrl: 'https://devlink.app',
    demoStatus: 'live', documentationUrl: 'https://docs.devlink.app',
    screenshotUrl: '/screenshots/devlink.png', stars: 342, forks: 68, watchers: 45,
    openIssues: 12, totalCommits: 1847, contributors: 8,
    lastCommitAt: '2026-08-24T10:00:00Z', createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z', featured: true,
    tags: ['social', 'developer', 'fullstack', 'open-source'],
  },
  {
    id: 'proj-002', name: 'MailGenie', slug: 'mailgenie',
    description: 'AI-powered email campaign management platform with smart send time optimization',
    longDescription: 'Email marketing suite with campaign analytics, template builder, audience segmentation, deliverability monitoring, and AI-powered send time optimization.',
    category: 'fullstack', status: 'active', visibility: 'public', license: 'apache-2.0',
    techStack: ['React', 'Vite', 'MUI', 'Java Spring Boot', 'Redis', 'SendGrid'],
    githubUrl: 'https://github.com/Anubhutisharma-07/MailGenie', demoUrl: 'https://mailgenie.app',
    demoStatus: 'live', documentationUrl: null,
    screenshotUrl: '/screenshots/mailgenie.png', stars: 128, forks: 32, watchers: 18,
    openIssues: 5, totalCommits: 654, contributors: 3,
    lastCommitAt: '2026-08-24T09:00:00Z', createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-08-24T09:00:00Z', featured: true,
    tags: ['email', 'marketing', 'ai', 'campaign'],
  },
  {
    id: 'proj-003', name: 'CampusConnect', slug: 'campus-connect',
    description: 'Campus management platform with event calendar, study groups, marketplace, and wellness tracker',
    longDescription: 'Comprehensive campus life platform with event management, study group scheduling, campus marketplace, career services, and student wellness tracking.',
    category: 'fullstack', status: 'active', visibility: 'public', license: 'mit',
    techStack: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'Socket.io'],
    githubUrl: 'https://github.com/Anubhutisharma-07/CampusConnect', demoUrl: null,
    demoStatus: 'stopped', documentationUrl: null,
    screenshotUrl: '/screenshots/campusconnect.png', stars: 87, forks: 21, watchers: 12,
    openIssues: 3, totalCommits: 423, contributors: 2,
    lastCommitAt: '2026-08-24T08:00:00Z', createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-08-24T08:00:00Z', featured: false,
    tags: ['campus', 'education', 'community', 'fullstack'],
  },
  {
    id: 'proj-004', name: 'CryptoViz', slug: 'cryptoviz',
    description: 'Real-time cryptocurrency analytics dashboard with portfolio tracking and market insights',
    longDescription: 'Crypto portfolio tracker with real-time price feeds, technical analysis charts, portfolio allocation visualization, and market sentiment indicators.',
    category: 'fullstack', status: 'active', visibility: 'public', license: 'mit',
    techStack: ['React', 'TypeScript', 'D3.js', 'WebSocket', 'Python', 'FastAPI'],
    githubUrl: 'https://github.com/Anubhutisharma-07/CryptoViz', demoUrl: 'https://cryptoviz.app',
    demoStatus: 'live', documentationUrl: null,
    screenshotUrl: '/screenshots/cryptoviz.png', stars: 215, forks: 45, watchers: 30,
    openIssues: 8, totalCommits: 892, contributors: 4,
    lastCommitAt: '2026-08-23T14:00:00Z', createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-08-23T14:00:00Z', featured: true,
    tags: ['crypto', 'finance', 'analytics', 'dashboard'],
  },
  {
    id: 'proj-005', name: 'AI Resume Analyzer', slug: 'ai-resume-analyzer',
    description: 'AI-powered resume analysis with skill gap detection, job matching, and interview prep',
    longDescription: 'Resume analysis platform with NLP-powered skill extraction, gap analysis, job match scoring, peer review system, and mock interview coaching.',
    category: 'ai-ml', status: 'active', visibility: 'public', license: 'apache-2.0',
    techStack: ['React', 'TypeScript', 'Python', 'TensorFlow', 'FastAPI', 'FAISS'],
    githubUrl: 'https://github.com/Anubhutisharma-07/AI-Resume-Analyzer', demoUrl: null,
    demoStatus: 'building', documentationUrl: null,
    screenshotUrl: '/screenshots/resume-analyzer.png', stars: 156, forks: 38, watchers: 22,
    openIssues: 6, totalCommits: 534, contributors: 2,
    lastCommitAt: '2026-08-24T07:00:00Z', createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-08-24T07:00:00Z', featured: false,
    tags: ['ai', 'resume', 'nlp', 'career'],
  },
  {
    id: 'proj-006', name: 'Semantic Plagiarism Detector', slug: 'semantic-plagiarism',
    description: 'NLP-based plagiarism detection using sentence embeddings and FAISS vector search',
    longDescription: 'Production-ready NLP application detecting paraphrased and cross-lingual plagiarism using SentenceTransformers, FAISS vector search, and Plotly analytics.',
    category: 'ai-ml', status: 'active', visibility: 'public', license: 'mit',
    techStack: ['Python', 'FastAPI', 'SentenceTransformers', 'FAISS', 'Plotly', 'SQLite'],
    githubUrl: 'https://github.com/Anubhutisharma-07/semantic-plagiarism-detector', demoUrl: null,
    demoStatus: 'stopped', documentationUrl: null,
    screenshotUrl: '/screenshots/plagiarism.png', stars: 289, forks: 72, watchers: 35,
    openIssues: 4, totalCommits: 1245, contributors: 12,
    lastCommitAt: '2026-08-24T10:00:00Z', createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z', featured: true,
    tags: ['nlp', 'plagiarism', 'ai', 'education'],
  },
  {
    id: 'proj-007', name: 'paySphere', slug: 'paysphere',
    description: 'Employee engagement and payroll management platform with real-time analytics',
    longDescription: 'HR platform with employee engagement surveys, pulse checks, recognition tracking, payroll processing, and culture health analytics.',
    category: 'fullstack', status: 'in-development', visibility: 'public', license: 'mit',
    techStack: ['React', 'TypeScript', 'Java Spring Boot', 'PostgreSQL', 'Redis'],
    githubUrl: 'https://github.com/Anubhutisharma-07/paySphere', demoUrl: null,
    demoStatus: 'building', documentationUrl: null,
    screenshotUrl: '/screenshots/paysphere.png', stars: 45, forks: 12, watchers: 8,
    openIssues: 15, totalCommits: 312, contributors: 2,
    lastCommitAt: '2026-08-24T06:00:00Z', createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-08-24T06:00:00Z', featured: false,
    tags: ['hr', 'payroll', 'engagement', 'enterprise'],
  },
  {
    id: 'proj-008', name: 'Pollution Control Hub', slug: 'pollution-control',
    description: 'Environmental monitoring and pollution control dashboard with real-time data visualization',
    longDescription: 'Environmental platform with air/water quality monitoring, pollution source tracking, regulatory compliance tools, and community reporting.',
    category: 'fullstack', status: 'active', visibility: 'public', license: 'mit',
    techStack: ['React', 'TypeScript', 'D3.js', 'Node.js', 'MongoDB'],
    githubUrl: 'https://github.com/Anubhutisharma-07/Pollution-Control-Hub', demoUrl: null,
    demoStatus: 'stopped', documentationUrl: null,
    screenshotUrl: '/screenshots/pollution.png', stars: 67, forks: 18, watchers: 10,
    openIssues: 2, totalCommits: 289, contributors: 2,
    lastCommitAt: '2026-08-20T11:00:00Z', createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z', featured: false,
    tags: ['environment', 'monitoring', 'data-viz', 'civic'],
  },
];

// ============================================================================
// Reviews
// ============================================================================

export const mockReviews: ProjectReview[] = [
  { id: 'rev-001', projectId: 'proj-001', projectName: 'DevLink Platform', reviewer: 'Sarah Chen', reviewerAvatar: '', rating: 5, sentiment: 'positive', comment: 'Excellent architecture and clean code. The TanStack Router integration is seamless.', codeQuality: 95, documentation: 85, innovation: 90, createdAt: '2026-08-20T14:00:00Z' },
  { id: 'rev-002', projectId: 'proj-004', projectName: 'CryptoViz', reviewer: 'Mike Rodriguez', reviewerAvatar: '', rating: 4, sentiment: 'positive', comment: 'Great real-time charts. Would love to see more technical indicators.', codeQuality: 88, documentation: 75, innovation: 85, createdAt: '2026-08-18T10:00:00Z' },
  { id: 'rev-003', projectId: 'proj-006', projectName: 'Semantic Plagiarism Detector', reviewer: 'Alex Kim', reviewerAvatar: '', rating: 5, sentiment: 'positive', comment: 'Impressive NLP pipeline. The FAISS integration for similarity search is production-ready.', codeQuality: 92, documentation: 80, innovation: 95, createdAt: '2026-08-15T16:00:00Z' },
  { id: 'rev-004', projectId: 'proj-002', projectName: 'MailGenie', reviewer: 'Emma Wilson', reviewerAvatar: '', rating: 4, sentiment: 'positive', comment: 'Solid email platform. The template builder is intuitive. Needs more integrations.', codeQuality: 85, documentation: 70, innovation: 80, createdAt: '2026-08-12T09:00:00Z' },
  { id: 'rev-005', projectId: 'proj-001', projectName: 'DevLink Platform', reviewer: 'Jordan Patel', reviewerAvatar: '', rating: 4, sentiment: 'neutral', comment: 'Good feature set. The admin dashboard could use better data visualization.', codeQuality: 82, documentation: 68, innovation: 78, createdAt: '2026-08-10T11:00:00Z' },
];

// ============================================================================
// Project Analytics
// ============================================================================

export const mockAnalytics: ProjectAnalytics[] = [
  {
    projectId: 'proj-001', projectName: 'DevLink Platform',
    views30d: 4250, uniqueVisitors30d: 2800, demoClicks30d: 890, githubClicks30d: 1240,
    starsGrowth30d: 48, forksGrowth30d: 12,
    dailyViews: Array.from({ length: 30 }, (_, i) => ({
      date: new Date('2026-07-26').toISOString().split('T')[0].substring(5),
      views: Math.round(120 + Math.sin(i / 3) * 40 + Math.random() * 20),
      unique: Math.round(80 + Math.sin(i / 3) * 30 + Math.random() * 15),
    })),
    trafficSources: [{ source: 'GitHub', visits: 1240 }, { source: 'Direct', visits: 890 }, { source: 'Twitter', visits: 650 }, { source: 'Dev.to', visits: 420 }, { source: 'HackerNews', visits: 350 }],
    topReferrers: [{ referrer: 'github.com', count: 1240 }, { referrer: 'twitter.com', count: 650 }, { referrer: 'dev.to', count: 420 }],
  },
  {
    projectId: 'proj-004', projectName: 'CryptoViz',
    views30d: 3100, uniqueVisitors30d: 2100, demoClicks30d: 680, githubClicks30d: 890,
    starsGrowth30d: 32, forksGrowth30d: 8,
    dailyViews: Array.from({ length: 30 }, (_, i) => ({
      date: new Date('2026-07-26').toISOString().split('T')[0].substring(5),
      views: Math.round(90 + Math.sin(i / 2) * 30 + Math.random() * 15),
      unique: Math.round(60 + Math.sin(i / 2) * 20 + Math.random() * 10),
    })),
    trafficSources: [{ source: 'GitHub', visits: 890 }, { source: 'ProductHunt', visits: 520 }, { source: 'Twitter', visits: 480 }, { source: 'Reddit', visits: 380 }],
    topReferrers: [{ referrer: 'github.com', count: 890 }, { referrer: 'producthunt.com', count: 520 }],
  },
];

// ============================================================================
// Collections
// ============================================================================

export const mockCollections: ShowcaseCollection[] = [
  { id: 'col-001', name: 'Featured Projects', description: 'Best projects hand-picked for the showcase', projectIds: ['proj-001', 'proj-002', 'proj-004', 'proj-006'], isPublic: true, createdAt: '2026-08-01T10:00:00Z', curatedBy: 'admin' },
  { id: 'col-002', name: 'AI & ML Projects', description: 'Projects leveraging machine learning and AI', projectIds: ['proj-004', 'proj-005', 'proj-006'], isPublic: true, createdAt: '2026-07-15T10:00:00Z', curatedBy: 'admin' },
  { id: 'col-003', name: 'Full-Stack Gems', description: 'Complete full-stack applications', projectIds: ['proj-001', 'proj-002', 'proj-003', 'proj-007', 'proj-008'], isPublic: true, createdAt: '2026-07-20T10:00:00Z', curatedBy: 'admin' },
];

// ============================================================================
// GitHub Stats
// ============================================================================

export const mockGitHubStats: GitHubStats = {
  totalRepos: 24, totalStars: 1329, totalForks: 306, totalCommits: 6196,
  totalPRs: 187, totalIssues: 342,
  languages: [
    { name: 'TypeScript', bytes: 245000, color: '#3178c6' },
    { name: 'Python', bytes: 189000, color: '#3572a5' },
    { name: 'JavaScript', bytes: 124000, color: '#f1e05a' },
    { name: 'Java', bytes: 67000, color: '#b07219' },
    { name: 'CSS', bytes: 45000, color: '#563d7c' },
    { name: 'Rust', bytes: 12000, color: '#dea584' },
  ],
  contributionStreak: 42, longestStreak: 67, totalContributions: 1847,
  yearlyContributions: [
    { month: 'Jan', count: 89 }, { month: 'Feb', count: 112 }, { month: 'Mar', count: 134 },
    { month: 'Apr', count: 156 }, { month: 'May', count: 142 }, { month: 'Jun', count: 168 },
    { month: 'Jul', count: 198 }, { month: 'Aug', count: 248 },
  ],
};

// ============================================================================
// Insights
// ============================================================================

export const mockInsights: ProjectInsight[] = [
  { id: 'ins-001', type: 'success', title: 'DevLink Leads in Stars', description: 'Your DevLink Platform has the most stars (342) and active contributors (8) across all projects.', metric: 'Total Stars', value: '342', actionable: false },
  { id: 'ins-002', type: 'tip', title: 'Improve Documentation', description: 'CryptoViz and MailGenie have documentation scores below 80. Adding a README guide could boost engagement.', metric: 'Doc Score', value: '<80', actionable: true },
  { id: 'ins-003', type: 'warning', title: 'Demo Builds Failing', description: 'AI Resume Analyzer and paySphere demos are in "building" state. Check deployment pipelines.', metric: 'Failed Demos', value: '2', actionable: true },
  { id: 'ins-004', type: 'info', title: 'TypeScript Dominates', description: 'TypeScript is your primary language (245KB). Consider adding Rust/WASM for performance-critical modules.', metric: 'Primary Lang', value: 'TypeScript', actionable: false },
  { id: 'ins-005', type: 'success', title: '42-Day Contribution Streak', description: 'You\'re on a 42-day streak! Your longest was 67 days. Keep the momentum going.', metric: 'Current Streak', value: '42 days', actionable: false },
  { id: 'ins-006', type: 'tip', title: 'Showcase AI Projects', description: 'Your AI/ML projects (CryptoViz, Resume Analyzer, Plagiarism Detector) get 40% more views. Create a dedicated AI showcase collection.', metric: 'AI View Boost', value: '+40%', actionable: true },
];

// ============================================================================
// Summary
// ============================================================================

export const mockPortfolioSummary: PortfolioSummary = {
  totalProjects: 8,
  activeProjects: 6,
  featuredProjects: 4,
  totalStars: 1329,
  totalForks: 306,
  avgRating: 4.6,
  totalViews30d: 7350,
  demoLiveCount: 3,
};
