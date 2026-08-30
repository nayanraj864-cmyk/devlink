import type {
  Skill, TechStack, LearningPath, Certification, SkillEndorsement,
  SkillGap, SkillTimeline, MarketTrend, SkillsSummary,
} from './types';

// ============================================================================
// Skills
// ============================================================================

export const mockSkills: Skill[] = [
  { id: 'sk-001', name: 'React', category: 'frontend', level: 'expert', yearsExperience: 4, proficiency: 92, trend: 'rising', trendChange: 5, endorsements: 48, projectsUsed: 12, lastUsedAt: '2026-08-24T10:00:00Z', source: 'project', tags: ['hooks', 'typescript', 'nextjs', 'react-query'] },
  { id: 'sk-002', name: 'TypeScript', category: 'frontend', level: 'expert', yearsExperience: 3.5, proficiency: 88, trend: 'rising', trendChange: 8, endorsements: 42, projectsUsed: 15, lastUsedAt: '2026-08-24T10:00:00Z', source: 'project', tags: ['generics', 'utility-types', 'strict'] },
  { id: 'sk-003', name: 'Python', category: 'backend', level: 'advanced', yearsExperience: 5, proficiency: 85, trend: 'stable', trendChange: 1, endorsements: 35, projectsUsed: 8, lastUsedAt: '2026-08-23T14:00:00Z', source: 'project', tags: ['fastapi', 'django', 'async', 'dataclasses'] },
  { id: 'sk-004', name: 'Node.js', category: 'backend', level: 'advanced', yearsExperience: 4, proficiency: 82, trend: 'stable', trendChange: 2, endorsements: 30, projectsUsed: 10, lastUsedAt: '2026-08-24T08:00:00Z', source: 'project', tags: ['express', 'nest', 'graphql', 'websocket'] },
  { id: 'sk-005', name: 'Docker', category: 'devops', level: 'advanced', yearsExperience: 3, proficiency: 78, trend: 'rising', trendChange: 4, endorsements: 25, projectsUsed: 8, lastUsedAt: '2026-08-22T16:00:00Z', source: 'project', tags: ['compose', 'multi-stage', 'healthcheck'] },
  { id: 'sk-006', name: 'PostgreSQL', category: 'data', level: 'advanced', yearsExperience: 4, proficiency: 80, trend: 'stable', trendChange: 0, endorsements: 22, projectsUsed: 7, lastUsedAt: '2026-08-23T11:00:00Z', source: 'project', tags: ['queries', 'indexes', 'migrations', 'jsonb'] },
  { id: 'sk-007', name: 'AWS', category: 'devops', level: 'intermediate', yearsExperience: 2, proficiency: 65, trend: 'rising', trendChange: 6, endorsements: 18, projectsUsed: 4, lastUsedAt: '2026-08-20T09:00:00Z', source: 'course', tags: ['ec2', 's3', 'lambda', 'rds'] },
  { id: 'sk-008', name: 'Tailwind CSS', category: 'frontend', level: 'expert', yearsExperience: 3, proficiency: 90, trend: 'rising', trendChange: 7, endorsements: 38, projectsUsed: 11, lastUsedAt: '2026-08-24T10:00:00Z', source: 'project', tags: ['design-system', 'responsive', 'animation'] },
  { id: 'sk-009', name: 'GraphQL', category: 'backend', level: 'intermediate', yearsExperience: 1.5, proficiency: 55, trend: 'rising', trendChange: 3, endorsements: 12, projectsUsed: 3, lastUsedAt: '2026-08-15T14:00:00Z', source: 'project', tags: ['apollo', 'subscriptions', 'federation'] },
  { id: 'sk-010', name: 'Kubernetes', category: 'devops', level: 'beginner', yearsExperience: 0.5, proficiency: 30, trend: 'rising', trendChange: 10, endorsements: 8, projectsUsed: 1, lastUsedAt: '2026-08-10T10:00:00Z', source: 'course', tags: ['pods', 'services', 'ingress'] },
  { id: 'sk-011', name: 'React Native', category: 'mobile', level: 'intermediate', yearsExperience: 1, proficiency: 48, trend: 'stable', trendChange: 1, endorsements: 10, projectsUsed: 2, lastUsedAt: '2026-07-28T09:00:00Z', source: 'project', tags: ['expo', 'navigation', 'async-storage'] },
  { id: 'sk-012', name: 'Redis', category: 'data', level: 'intermediate', yearsExperience: 2, proficiency: 58, trend: 'stable', trendChange: 0, endorsements: 14, projectsUsed: 4, lastUsedAt: '2026-08-18T11:00:00Z', source: 'project', tags: ['caching', 'pub-sub', 'streams'] },
  { id: 'sk-013', name: 'Figma', category: 'design', level: 'intermediate', yearsExperience: 2, proficiency: 52, trend: 'stable', trendChange: 2, endorsements: 15, projectsUsed: 6, lastUsedAt: '2026-08-21T15:00:00Z', source: 'self-taught', tags: ['prototyping', 'design-system', 'auto-layout'] },
  { id: 'sk-014', name: 'Rust', category: 'backend', level: 'beginner', yearsExperience: 0.3, proficiency: 22, trend: 'rising', trendChange: 12, endorsements: 5, projectsUsed: 1, lastUsedAt: '2026-08-05T10:00:00Z', source: 'self-taught', tags: ['ownership', 'async', 'wasm'] },
  { id: 'sk-015', name: 'TensorFlow', category: 'ai-ml', level: 'beginner', yearsExperience: 0.5, proficiency: 28, trend: 'rising', trendChange: 8, endorsements: 6, projectsUsed: 1, lastUsedAt: '2026-08-12T14:00:00Z', source: 'course', tags: ['keras', 'neural-networks', 'classification'] },
  { id: 'sk-016', name: 'CI/CD', category: 'devops', level: 'advanced', yearsExperience: 3, proficiency: 75, trend: 'stable', trendChange: 1, endorsements: 20, projectsUsed: 10, lastUsedAt: '2026-08-24T07:00:00Z', source: 'project', tags: ['github-actions', 'gitlab-ci', 'jenkins'] },
];

// ============================================================================
// Tech Stacks
// ============================================================================

export const mockTechStacks: TechStack[] = [
  { id: 'ts-001', name: 'MERN Stack', description: 'MongoDB, Express, React, Node.js — full-stack JavaScript', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], projectsCount: 6, popularity: 92, marketDemand: 'rising', avgSalary: 95000, color: '#00e5ff' },
  { id: 'ts-002', name: 'Python Backend', description: 'FastAPI + PostgreSQL + Redis — high-performance Python APIs', skills: ['Python', 'PostgreSQL', 'Redis', 'Docker'], projectsCount: 3, popularity: 85, marketDemand: 'rising', avgSalary: 105000, color: '#4caf50' },
  { id: 'ts-003', name: 'Cloud Native', description: 'AWS + Docker + Kubernetes — cloud-native deployment', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'], projectsCount: 2, popularity: 88, marketDemand: 'rising', avgSalary: 120000, color: '#ff9800' },
  { id: 'ts-004', name: 'Frontend Modern', description: 'React + TypeScript + Tailwind — modern frontend development', skills: ['React', 'TypeScript', 'Tailwind CSS', 'GraphQL'], projectsCount: 8, popularity: 90, marketDemand: 'stable', avgSalary: 90000, color: '#9c27b0' },
];

// ============================================================================
// Learning Paths
// ============================================================================

export const mockLearningPaths: LearningPath[] = [
  {
    id: 'lp-001', title: 'Kubernetes Mastery', description: 'Complete Kubernetes learning path from pods to production clusters',
    skills: ['Kubernetes', 'Docker', 'CI/CD'], totalHours: 60, completedHours: 18, status: 'in-progress',
    difficulty: 'advanced', estimatedCompletion: '2026-11-15T00:00:00Z',
    modules: [
      { name: 'K8s Fundamentals', completed: true }, { name: 'Pods & Deployments', completed: true },
      { name: 'Services & Networking', completed: true }, { name: 'ConfigMaps & Secrets', completed: false },
      { name: 'StatefulSets & PV', completed: false }, { name: 'Helm Charts', completed: false },
      { name: 'Production Clusters', completed: false }, { name: 'Monitoring & Logging', completed: false },
    ],
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'lp-002', title: 'Rust for Web Developers', description: 'Learn Rust from a web developer perspective — ownership, async, and WebAssembly',
    skills: ['Rust'], totalHours: 40, completedHours: 12, status: 'in-progress',
    difficulty: 'intermediate', estimatedCompletion: '2026-12-01T00:00:00Z',
    modules: [
      { name: 'Ownership & Borrowing', completed: true }, { name: 'Structs & Enums', completed: true },
      { name: 'Error Handling', completed: false }, { name: 'Collections', completed: false },
      { name: 'Traits & Generics', completed: false }, { name: 'Async Rust', completed: false },
    ],
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'lp-003', title: 'ML with TensorFlow', description: 'Machine learning fundamentals with TensorFlow and Keras',
    skills: ['TensorFlow'], totalHours: 50, completedHours: 50, status: 'completed',
    difficulty: 'intermediate', estimatedCompletion: '2026-06-15T00:00:00Z',
    modules: [
      { name: 'ML Basics', completed: true }, { name: 'Neural Networks', completed: true },
      { name: 'CNNs', completed: true }, { name: 'RNNs', completed: true },
      { name: 'Transfer Learning', completed: true }, { name: 'Deployment', completed: true },
    ],
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'lp-004', title: 'GraphQL Deep Dive', description: 'Master GraphQL with Apollo, subscriptions, and federation',
    skills: ['GraphQL'], totalHours: 25, completedHours: 0, status: 'not-started',
    difficulty: 'intermediate', estimatedCompletion: '2027-02-01T00:00:00Z',
    modules: [
      { name: 'Schema Design', completed: false }, { name: 'Resolvers', completed: false },
      { name: 'Apollo Client', completed: false }, { name: 'Subscriptions', completed: false },
    ],
    createdAt: '2026-08-20T10:00:00Z',
  },
];

// ============================================================================
// Certifications
// ============================================================================

export const mockCertifications: Certification[] = [
  { id: 'cert-001', name: 'AWS Solutions Architect — Associate', issuer: 'Amazon Web Services', skills: ['AWS', 'Cloud Architecture'], status: 'earned', earnedAt: '2026-04-15T00:00:00Z', expiresAt: '2029-04-15T00:00:00Z', credentialId: 'AWS-SAA-2026-XXXX', badgeColor: '#ff9900' },
  { id: 'cert-002', name: 'Meta Frontend Developer', issuer: 'Meta (Coursera)', skills: ['React', 'TypeScript', 'Tailwind CSS'], status: 'earned', earnedAt: '2025-11-20T00:00:00Z', expiresAt: null, credentialId: 'META-FE-2025-YYYY', badgeColor: '#0668E1' },
  { id: 'cert-003', name: 'CKA — Certified Kubernetes Administrator', issuer: 'CNCF', skills: ['Kubernetes', 'Docker'], status: 'in-progress', earnedAt: null, expiresAt: null, credentialId: '', badgeColor: '#326CE5' },
  { id: 'cert-004', name: 'Google Cloud Professional Data Engineer', issuer: 'Google Cloud', skills: ['Python', 'Data Engineering'], status: 'planned', earnedAt: null, expiresAt: null, credentialId: '', badgeColor: '#4285F4' },
];

// ============================================================================
// Endorsements
// ============================================================================

export const mockEndorsements: SkillEndorsement[] = [
  { id: 'en-001', skillName: 'React', endorsedBy: 'Sarah Chen', endorsedByAvatar: '', projectContext: 'DevLink Platform', message: 'Built the entire frontend architecture with React and TanStack Router. Excellent hooks patterns.', createdAt: '2026-08-20T14:00:00Z' },
  { id: 'en-002', skillName: 'TypeScript', endorsedBy: 'Mike Rodriguez', endorsedByAvatar: '', projectContext: 'API Gateway Service', message: 'Strong type safety across the entire codebase. Great use of generics and utility types.', createdAt: '2026-08-18T10:00:00Z' },
  { id: 'en-003', skillName: 'Python', endorsedBy: 'Alex Kim', endorsedByAvatar: '', projectContext: 'ML Pipeline', message: 'Implemented a production-ready FastAPI backend with excellent async patterns.', createdAt: '2026-08-15T16:00:00Z' },
  { id: 'en-004', skillName: 'Docker', endorsedBy: 'Jordan Patel', endorsedByAvatar: '', projectContext: 'Microservices Migration', message: 'Created multi-stage Docker builds that reduced image sizes by 60%.', createdAt: '2026-08-12T09:00:00Z' },
  { id: 'en-005', skillName: 'Tailwind CSS', endorsedBy: 'Emma Wilson', endorsedByAvatar: '', projectContext: 'Design System', message: 'Built a comprehensive design system with Tailwind. Beautiful, consistent UI.', createdAt: '2026-08-10T11:00:00Z' },
];

// ============================================================================
// Skill Gaps
// ============================================================================

export const mockSkillGaps: SkillGap[] = [
  { skill: 'Kubernetes', currentLevel: 'beginner', targetLevel: 'advanced', gap: 2, priority: 'high', estimatedHours: 42, recommendedResources: ['CKA Course', 'Kubernetes in Action', 'Hands-on Labs'] },
  { skill: 'AWS', currentLevel: 'intermediate', targetLevel: 'expert', gap: 2, priority: 'high', estimatedHours: 30, recommendedResources: ['AWS Solutions Architect', 'AWS Well-Architected Labs'] },
  { skill: 'Rust', currentLevel: 'beginner', targetLevel: 'intermediate', gap: 1, priority: 'medium', estimatedHours: 28, recommendedResources: ['The Rust Book', 'Rustlings', 'Exercism Rust Track'] },
  { skill: 'GraphQL', currentLevel: 'intermediate', targetLevel: 'advanced', gap: 1, priority: 'medium', estimatedHours: 15, recommendedResources: ['How to GraphQL', 'Apollo docs', 'GraphQL in Production'] },
  { skill: 'TensorFlow', currentLevel: 'beginner', targetLevel: 'intermediate', gap: 1, priority: 'low', estimatedHours: 22, recommendedResources: ['TensorFlow docs', 'ML Crash Course', 'Kaggle competitions'] },
];

// ============================================================================
// Skill Timeline
// ============================================================================

export const mockTimeline: SkillTimeline[] = [
  { date: '2026-03', skill: 'React', level: 'advanced', proficiency: 72, endorsements: 28 },
  { date: '2026-04', skill: 'React', level: 'advanced', proficiency: 78, endorsements: 32 },
  { date: '2026-05', skill: 'React', level: 'advanced', proficiency: 82, endorsements: 36 },
  { date: '2026-06', skill: 'React', level: 'expert', proficiency: 86, endorsements: 40 },
  { date: '2026-07', skill: 'React', level: 'expert', proficiency: 89, endorsements: 44 },
  { date: '2026-08', skill: 'React', level: 'expert', proficiency: 92, endorsements: 48 },
  { date: '2026-03', skill: 'TypeScript', level: 'intermediate', proficiency: 60, endorsements: 18 },
  { date: '2026-04', skill: 'TypeScript', level: 'advanced', proficiency: 68, endorsements: 22 },
  { date: '2026-05', skill: 'TypeScript', level: 'advanced', proficiency: 74, endorsements: 28 },
  { date: '2026-06', skill: 'TypeScript', level: 'advanced', proficiency: 80, endorsements: 34 },
  { date: '2026-07', skill: 'TypeScript', level: 'expert', proficiency: 85, endorsements: 38 },
  { date: '2026-08', skill: 'TypeScript', level: 'expert', proficiency: 88, endorsements: 42 },
];

// ============================================================================
// Market Trends
// ============================================================================

export const mockMarketTrends: MarketTrend[] = [
  { skill: 'React', demand: 95, growth: 12, avgSalary: 92000, jobPostings: 14200, trend: 'rising' },
  { skill: 'TypeScript', demand: 90, growth: 18, avgSalary: 95000, jobPostings: 11800, trend: 'rising' },
  { skill: 'Python', demand: 88, growth: 8, avgSalary: 100000, jobPostings: 16500, trend: 'rising' },
  { skill: 'AWS', demand: 85, growth: 15, avgSalary: 120000, jobPostings: 9200, trend: 'rising' },
  { skill: 'Docker', demand: 82, growth: 10, avgSalary: 105000, jobPostings: 7800, trend: 'rising' },
  { skill: 'Kubernetes', demand: 78, growth: 20, avgSalary: 130000, jobPostings: 5400, trend: 'rising' },
  { skill: 'Node.js', demand: 80, growth: 5, avgSalary: 88000, jobPostings: 8900, trend: 'stable' },
  { skill: 'Rust', demand: 65, growth: 35, avgSalary: 125000, jobPostings: 2100, trend: 'rising' },
  { skill: 'GraphQL', demand: 60, growth: 8, avgSalary: 98000, jobPostings: 3200, trend: 'stable' },
  { skill: 'TensorFlow', demand: 55, growth: 22, avgSalary: 115000, jobPostings: 2800, trend: 'rising' },
];

// ============================================================================
// Summary
// ============================================================================

export const mockSkillsSummary: SkillsSummary = {
  totalSkills: 16,
  expertLevel: 4,
  totalEndorsements: 351,
  activeProjects: 12,
  certsEarned: 2,
  learningInProgress: 2,
  topCategory: 'frontend',
  avgProficiency: 65,
};
