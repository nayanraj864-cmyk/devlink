import { api } from "../client";
import type { Builder } from "@/mocks/seed";

export const buildersApi = {
  list: (query?: {
    page?: number;
    limit?: number;
    q?: string;
    skills?: string;
    availability?: boolean;
    location?: string;
    experience?: string;
    remote?: boolean;
    sort?: string;
  }) => api.get<Builder[]>("/api/builders", { query }),
  get: (id: string) => api.get<Builder>(`/api/builders/${id}`),
  trending: () => api.get<Builder[]>("/api/builders/trending"),
  matches: () => api.get<Builder[]>("/api/users/recommendations"),
};
