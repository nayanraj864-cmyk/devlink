import type {
  DeveloperProfile, Connection, NetworkingEvent, NetworkingGroup,
  CollaborationOpportunity, NetworkInsight, NetworkSummary,
} from './types';

// ============================================================================
// Developer Profiles (suggested connections)
// ============================================================================

export const mockProfiles: DeveloperProfile[] = [
  { id: 'dp-001', name: 'Sarah Chen', username: 'sarahchen', avatar: '', title: 'Senior Frontend Engineer', company: 'Stripe', location: 'San Francisco, CA', bio: 'React & TypeScript enthusiast. Building beautiful, accessible interfaces.', skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'], languages: ['TypeScript', 'Python'], interests: ['design-systems', 'a11y', 'performance'], openToCollaboration: true, connectionCount: 342, mutualConnections: 12, matchScore: 'perfect', matchReasons: ['Same tech stack', 'Both in SF', 'Open to collab'], lastActive: '2026-08-24T14:00:00Z', isOnline: true },
  { id: 'dp-002', name: 'Mike Rodriguez', username: 'mikerod', avatar: '', title: 'Full-Stack Developer', company: 'Vercel', location: 'Austin, TX', bio: 'Building the future of web development. Open source contributor.', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], languages: ['TypeScript', 'Go'], interests: ['open-source', 'edge-computing', 'serverless'], openToCollaboration: true, connectionCount: 256, mutualConnections: 8, matchScore: 'strong', matchReasons: ['Full-stack overlap', 'Both contribute to OSS'], lastActive: '2026-08-24T10:00:00Z', isOnline: true },
  { id: 'dp-003', name: 'Alex Kim', username: 'alexkim', avatar: '', title: 'ML Engineer', company: 'OpenAI', location: 'Seattle, WA', bio: 'Building intelligent systems with Python and TensorFlow.', skills: ['Python', 'TensorFlow', 'PyTorch', 'FastAPI'], languages: ['Python', 'C++'], interests: ['ai-ml', 'nlp', 'computer-vision'], openToCollaboration: false, connectionCount: 189, mutualConnections: 5, matchScore: 'good', matchReasons: ['Python overlap', 'AI interest'], lastActive: '2026-08-23T16:00:00Z', isOnline: false },
  { id: 'dp-004', name: 'Emma Wilson', username: 'emmawilson', avatar: '', title: 'DevOps Lead', company: 'Netflix', location: 'Los Gatos, CA', bio: 'Cloud infrastructure and automation. Kubernetes enthusiast.', skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform'], languages: ['Go', 'Python'], interests: ['devops', 'cloud-native', 'observability'], openToCollaboration: true, connectionCount: 420, mutualConnections: 15, matchScore: 'strong', matchReasons: ['DevOps expertise', 'Cloud-native focus'], lastActive: '2026-08-24T08:00:00Z', isOnline: true },
  { id: 'dp-005', name: 'Jordan Patel', username: 'jordanp', avatar: '', title: 'Backend Engineer', company: 'Figma', location: 'New York, NY', bio: 'Building scalable APIs and real-time systems.', skills: ['Go', 'Rust', 'PostgreSQL', 'Redis'], languages: ['Go', 'Rust'], interests: ['distributed-systems', 'real-time', 'performance'], openToCollaboration: true, connectionCount: 178, mutualConnections: 3, matchScore: 'good', matchReasons: ['Backend focus', 'Performance interest'], lastActive: '2026-08-24T12:00:00Z', isOnline: false },
  { id: 'dp-006', name: 'Priya Sharma', username: 'priyasharma', avatar: '', title: 'Mobile Developer', company: 'Spotify', location: 'Stockholm, Sweden', bio: 'Crafting beautiful mobile experiences with React Native and Swift.', skills: ['React Native', 'Swift', 'Kotlin', 'TypeScript'], languages: ['TypeScript', 'Swift'], interests: ['mobile', 'ui-ux', 'music-tech'], openToCollaboration: true, connectionCount: 215, mutualConnections: 7, matchScore: 'good', matchReasons: ['TypeScript overlap', 'Mobile interest'], lastActive: '2026-08-24T09:00:00Z', isOnline: true },
];

// ============================================================================
// Connections
// ============================================================================

export const mockConnections: Connection[] = [
  { id: 'conn-001', developerId: 'dp-001', developer: mockProfiles[0], status: 'connected', connectedAt: '2026-07-15T10:00:00Z', mutualProjects: ['DevLink Platform'], interactionScore: 85, lastInteractionAt: '2026-08-24T14:00:00Z' },
  { id: 'conn-002', developerId: 'dp-002', developer: mockProfiles[1], status: 'connected', connectedAt: '2026-06-20T10:00:00Z', mutualProjects: ['MailGenie'], interactionScore: 72, lastInteractionAt: '2026-08-20T10:00:00Z' },
  { id: 'conn-003', developerId: 'dp-004', developer: mockProfiles[3], status: 'pending-received', connectedAt: null, mutualProjects: [], interactionScore: 0, lastInteractionAt: null },
  { id: 'conn-004', developerId: 'dp-006', developer: mockProfiles[5], status: 'pending-sent', connectedAt: null, mutualProjects: [], interactionScore: 0, lastInteractionAt: null },
];

// ============================================================================
// Events
// ============================================================================

export const mockEvents: NetworkingEvent[] = [
  {
    id: 'evt-001', title: 'React Summit 2026', description: 'Annual React conference with talks on server components, patterns, and the ecosystem',
    type: 'conference', status: 'upcoming', organizer: 'React Community', organizerAvatar: '',
    date: '2026-09-15', time: '09:00 AM PST', duration: '2 days',
    location: 'San Francisco, CA', isVirtual: true, maxAttendees: 500, currentAttendees: 342,
    topics: ['React 19', 'Server Components', 'Patterns', 'Performance'],
    speakers: [{ name: 'Dan Abramov', title: 'React Core Team', avatar: '' }, { name: 'Andrew Clark', title: 'React Core Team', avatar: '' }],
    registered: true, tags: ['react', 'conference', 'frontend'],
  },
  {
    id: 'evt-002', title: 'TypeScript Deep Dive Workshop', description: 'Hands-on workshop covering advanced TypeScript patterns and type-level programming',
    type: 'workshop', status: 'upcoming', organizer: 'TS Community', organizerAvatar: '',
    date: '2026-09-01', time: '02:00 PM EST', duration: '3 hours',
    location: 'Online (Zoom)', isVirtual: true, maxAttendees: 100, currentAttendees: 78,
    topics: ['Generics', 'Conditional Types', 'Template Literals', 'Type Guards'],
    speakers: [{ name: 'Matt Pocock', title: 'TypeScript Educator', avatar: '' }],
    registered: false, tags: ['typescript', 'workshop', 'advanced'],
  },
  {
    id: 'evt-003', title: 'SF Developer Meetup', description: 'Monthly meetup for Bay Area developers — lightning talks and networking',
    type: 'meetup', status: 'upcoming', organizer: 'SF Dev Community', organizerAvatar: '',
    date: '2026-08-28', time: '06:30 PM PST', duration: '2 hours',
    location: 'GitHub HQ, San Francisco', isVirtual: false, maxAttendees: 80, currentAttendees: 52,
    topics: ['Lightning Talks', 'Networking', 'Open Source'],
    speakers: [],
    registered: true, tags: ['meetup', 'networking', 'sf'],
  },
  {
    id: 'evt-004', title: 'AI/ML Hackathon Weekend', description: '48-hour hackathon focused on building AI-powered developer tools',
    type: 'hackathon', status: 'upcoming', organizer: 'AI Dev Community', organizerAvatar: '',
    date: '2026-09-08', time: '10:00 AM PST', duration: '48 hours',
    location: 'Online + SF Hub', isVirtual: true, maxAttendees: 200, currentAttendees: 156,
    topics: ['LLMs', 'Developer Tools', 'AI Agents', 'Code Generation'],
    speakers: [{ name: 'Andrej Karpathy', title: 'AI Researcher', avatar: '' }],
    registered: false, tags: ['hackathon', 'ai', 'ml', 'weekend'],
  },
];

// ============================================================================
// Groups
// ============================================================================

export const mockGroups: NetworkingGroup[] = [
  { id: 'grp-001', name: 'React Enthusiasts', description: 'Community of React developers sharing tips, patterns, and projects', type: 'networking', memberCount: 1240, activityLevel: 'high', lastPostAt: '2026-08-24T10:00:00Z', topics: ['React', 'Hooks', 'Performance', 'SSR'], memberRole: 'member', createdAt: '2025-06-01T10:00:00Z', tags: ['react', 'frontend', 'community'] },
  { id: 'grp-002', name: 'TypeScript Masters', description: 'Advanced TypeScript discussions — type gymnastics and real-world patterns', type: 'study', memberCount: 680, activityLevel: 'medium', lastPostAt: '2026-08-23T14:00:00Z', topics: ['TypeScript', 'Generics', 'Type-Level', 'Patterns'], memberRole: 'admin', createdAt: '2025-09-15T10:00:00Z', tags: ['typescript', 'advanced', 'learning'] },
  { id: 'grp-003', name: 'Open Source Contributors', description: 'Find collaborators for open source projects and contribute together', type: 'open-source', memberCount: 2100, activityLevel: 'high', lastPostAt: '2026-08-24T08:00:00Z', topics: ['Open Source', 'Contributing', 'Maintainers', 'Licensing'], memberRole: 'member', createdAt: '2025-03-01T10:00:00Z', tags: ['open-source', 'collaboration', 'community'] },
  { id: 'grp-004', name: 'AI/ML Builders', description: 'Building AI-powered applications and sharing ML insights', type: 'project', memberCount: 890, activityLevel: 'high', lastPostAt: '2026-08-24T09:00:00Z', topics: ['AI', 'ML', 'LLMs', 'TensorFlow', 'PyTorch'], memberRole: 'member', createdAt: '2026-01-01T10:00:00Z', tags: ['ai', 'ml', 'deep-learning'] },
  { id: 'grp-005', name: 'Mentorship Circle', description: 'Senior developers mentoring junior developers — 1-on-1 and group sessions', type: 'mentorship', memberCount: 420, activityLevel: 'medium', lastPostAt: '2026-08-22T16:00:00Z', topics: ['Mentorship', 'Career Growth', 'Code Review', 'Best Practices'], memberRole: 'owner', createdAt: '2025-11-01T10:00:00Z', tags: ['mentorship', 'career', 'growth'] },
];

// ============================================================================
// Collaboration Opportunities
// ============================================================================

export const mockCollaborations: CollaborationOpportunity[] = [
  { id: 'coll-001', title: 'React Component Library', description: 'Building an open-source React component library with accessibility focus', project: 'DevLink UI', neededSkills: ['React', 'TypeScript', 'Accessibility', 'Storybook'], status: 'looking', postedBy: 'Sarah Chen', postedByAvatar: '', applicants: 12, postedAt: '2026-08-20T10:00:00Z', deadline: '2026-09-15T00:00:00Z', isUrgent: false, tags: ['react', 'components', 'a11y'] },
  { id: 'coll-002', title: 'AI Code Review Bot', description: 'Develop an AI-powered code review bot using LLMs for GitHub PRs', project: 'CodeReviewAI', neededSkills: ['Python', 'LLMs', 'GitHub API', 'FastAPI'], status: 'looking', postedBy: 'Alex Kim', postedByAvatar: '', applicants: 8, postedAt: '2026-08-22T14:00:00Z', deadline: '2026-09-30T00:00:00Z', isUrgent: true, tags: ['ai', 'code-review', 'github'] },
  { id: 'coll-003', title: 'Mobile App for DevLink', description: 'React Native mobile app for the DevLink developer platform', project: 'DevLink Mobile', neededSkills: ['React Native', 'TypeScript', 'Mobile UI', 'Push Notifications'], status: 'open', postedBy: 'Priya Sharma', postedByAvatar: '', applicants: 5, postedAt: '2026-08-18T09:00:00Z', deadline: null, isUrgent: false, tags: ['mobile', 'react-native', 'app'] },
  { id: 'coll-004', title: 'Kubernetes Operator for Deployments', description: 'Build a custom K8s operator for automated blue-green deployments', project: 'K8s-Operator', neededSkills: ['Go', 'Kubernetes', 'Docker', 'CI/CD'], status: 'looking', postedBy: 'Emma Wilson', postedByAvatar: '', applicants: 3, postedAt: '2026-08-23T11:00:00Z', deadline: '2026-10-01T00:00:00Z', isUrgent: false, tags: ['kubernetes', 'devops', 'go'] },
];

// ============================================================================
// Insights
// ============================================================================

export const mockInsights: NetworkInsight[] = [
  { id: 'ni-001', type: 'success', title: 'Strong React Network', description: 'You have 8 connections in the React ecosystem. Consider attending React Summit to expand further.', metric: 'React Connections', value: '8', actionable: true },
  { id: 'ni-002', type: 'tip', title: 'Join AI/ML Builders', description: 'Your TensorFlow skills match the AI/ML Builders group (890 members). High-activity community.', metric: 'Group Match', value: '890 members', actionable: true },
  { id: 'ni-003', type: 'info', title: 'Network Growing Steadily', description: 'You gained 12 new connections this month. Your network reach has increased by 18%.', metric: 'Monthly Growth', value: '+18%', actionable: false },
  { id: 'ni-004', type: 'tip', title: 'Mentorship Opportunity', description: 'You\'re listed as a mentor. 3 junior developers are looking for React mentors.', metric: 'Mentee Requests', value: '3', actionable: true },
  { id: 'ni-005', type: 'warning', title: 'Pending Connection Request', description: 'Emma Wilson sent you a connection request 2 days ago. She\'s a DevOps Lead at Netflix.', metric: 'Pending', value: '1 request', actionable: true },
];

// ============================================================================
// Summary
// ============================================================================

export const mockNetworkSummary: NetworkSummary = {
  totalConnections: 248,
  pendingRequests: 2,
  groupsJoined: 5,
  eventsAttended: 12,
  collaborationOpps: 4,
  matchScore: 87,
  networkGrowth30d: 12,
  messagesThisWeek: 34,
};
