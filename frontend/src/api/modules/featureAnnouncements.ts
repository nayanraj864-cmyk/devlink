import { api, isBackendConfigured } from "../client";

export type AnnouncementCategory = "feature" | "release_notes" | "changelog" | "roadmap";

export interface FeatureAnnouncement {
  id: string;
  created_by_id: string;
  created_by?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_image?: string | null;
  } | null;
  title: string;
  summary: string;
  content: string;
  category: AnnouncementCategory;
  version?: string | null;
  badge_label?: string | null;
  is_featured: boolean;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  is_read: boolean;
}

export interface FeatureAnnouncementListResponse {
  items: FeatureAnnouncement[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  unread_count: number;
}

export interface CreateAnnouncementInput {
  title: string;
  summary: string;
  content: string;
  category: AnnouncementCategory;
  version?: string;
  badge_label?: string;
  is_featured?: boolean;
  is_published?: boolean;
  published_at?: string;
}

export const mockFeatureAnnouncements: FeatureAnnouncement[] = [
  {
    id: "ann-1",
    created_by_id: "usr-admin-1",
    created_by: {
      id: "usr-admin-1",
      username: "alex_dev",
      first_name: "Alex",
      last_name: "Rivera",
    },
    title: "Feature Announcement Center & Changelog Hub",
    summary:
      "A centralized destination to discover what's new in DevLink, track platform release notes, and follow upcoming roadmap milestones.",
    content:
      "### Welcome to DevLink Feature Announcements!\n\nWe are excited to launch our centralized Announcement Center. Stay tuned for real-time feature releases, platform optimizations, developer tooling improvements, and product roadmap previews.",
    category: "feature",
    version: "v2.4.0",
    badge_label: "Major Update",
    is_featured: true,
    is_published: true,
    published_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    is_read: false,
  },
  {
    id: "ann-2",
    created_by_id: "usr-admin-1",
    created_by: {
      id: "usr-admin-1",
      username: "alex_dev",
      first_name: "Alex",
      last_name: "Rivera",
    },
    title: "AI Recommendation Engine v2 & Builder Matches",
    summary:
      "Enhanced matching algorithms with granular skill score breakdowns, missing skills analysis, and actionable collaborator invitations.",
    content:
      "### Smarter Team & Builder Matchmaking\n\n- Improved Jaccard skill weighting.\n- Direct match invitations from dashboard cards.\n- Missing skill recommendations for rapid upskilling.",
    category: "release_notes",
    version: "v2.3.2",
    badge_label: "AI Update",
    is_featured: true,
    is_published: true,
    published_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    is_read: false,
  },
  {
    id: "ann-3",
    created_by_id: "usr-admin-1",
    created_by: {
      id: "usr-admin-1",
      username: "alex_dev",
      first_name: "Alex",
      last_name: "Rivera",
    },
    title: "Changelog: Dark Mode Refinements & Compact Chat Widget",
    summary:
      "Streamlined dashboard cards, refined typography hierarchy, and new compact real-time messaging preview widget.",
    content:
      "### What's Changed\n\n- Modernized dashboard project cards with progress bars and team sizes.\n- Added live typing indicators to chat previews.\n- Performance improvements across client-side bundle size.",
    category: "changelog",
    version: "v2.3.0",
    badge_label: "Changelog",
    is_featured: false,
    is_published: true,
    published_at: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    created_at: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
    is_read: true,
  },
  {
    id: "ann-4",
    created_by_id: "usr-admin-1",
    created_by: {
      id: "usr-admin-1",
      username: "alex_dev",
      first_name: "Alex",
      last_name: "Rivera",
    },
    title: "Q3 2026 Platform Roadmap: Webhooks & Video Profiles",
    summary:
      "Upcoming features including GitHub webhook automation, custom organization domains, and video developer introductions.",
    content:
      "### Strategic Roadmap Preview\n\n1. Native Webhook Triggers for Git Events\n2. Real-time Audio/Video Collaboration Rooms\n3. Enterprise Single Sign-On (SSO) Support",
    category: "roadmap",
    version: "Roadmap",
    badge_label: "Upcoming",
    is_featured: false,
    is_published: true,
    published_at: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    created_at: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
    is_read: true,
  },
];

const localAnnouncementsStore = [...mockFeatureAnnouncements];

export const featureAnnouncementsApi = {
  list: async (params?: {
    category?: string;
    q?: string;
    is_featured?: boolean;
    page?: number;
    limit?: number;
  }): Promise<FeatureAnnouncementListResponse> => {
    if (!isBackendConfigured()) {
      let filtered = [...localAnnouncementsStore];
      if (params?.category && params.category !== "all") {
        filtered = filtered.filter((a) => a.category === params.category);
      }
      if (params?.q) {
        const q = params.q.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            (a.version && a.version.toLowerCase().includes(q)),
        );
      }
      if (params?.is_featured !== undefined) {
        filtered = filtered.filter((a) => a.is_featured === params.is_featured);
      }
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const total = filtered.length;
      const items = filtered.slice((page - 1) * limit, page * limit);
      const unread_count = filtered.filter((a) => !a.is_read).length;
      return {
        items,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
        unread_count,
      };
    }
    return api.get<FeatureAnnouncementListResponse>("/api/feature-announcements", {
      query: params as Record<string, string | number | boolean | null | undefined>,
    });
  },

  get: async (id: string): Promise<FeatureAnnouncement> => {
    if (!isBackendConfigured()) {
      const item = localAnnouncementsStore.find((a) => a.id === id);
      if (!item) throw new Error("Announcement not found");
      item.is_read = true;
      return item;
    }
    return api.get<FeatureAnnouncement>(`/api/feature-announcements/${id}`);
  },

  markAsRead: async (id: string): Promise<{ message: string }> => {
    if (!isBackendConfigured()) {
      const item = localAnnouncementsStore.find((a) => a.id === id);
      if (item) item.is_read = true;
      return { message: "Announcement marked as read" };
    }
    return api.post<{ message: string }>(`/api/feature-announcements/${id}/read`, {});
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    if (!isBackendConfigured()) {
      localAnnouncementsStore.forEach((a) => (a.is_read = true));
      return { message: "All announcements marked as read" };
    }
    return api.post<{ message: string }>("/api/feature-announcements/read-all", {});
  },

  create: async (body: CreateAnnouncementInput): Promise<FeatureAnnouncement> => {
    if (!isBackendConfigured()) {
      const newAnn: FeatureAnnouncement = {
        id: `ann-${Date.now()}`,
        created_by_id: "usr-admin-1",
        title: body.title,
        summary: body.summary,
        content: body.content,
        category: body.category,
        version: body.version,
        badge_label: body.badge_label,
        is_featured: body.is_featured || false,
        is_published: body.is_published !== false,
        published_at: body.published_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
      };
      localAnnouncementsStore.unshift(newAnn);
      return newAnn;
    }
    return api.post<FeatureAnnouncement>("/api/feature-announcements/admin", body);
  },
};
