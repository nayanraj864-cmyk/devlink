import { api } from "../client";
import type { Conversation, Message } from "@/mocks/seed";

export interface SendMessagePayload {
  conversation_id?: string;
  receiver_id?: string;
  message?: string;
  content?: string;
  type?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  mime_type?: string;
  scheduled_for?: string | null;
}

export interface UpdateMessagePayload {
  content?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
}

export const messagesApi = {
  conversations: () => api.get<Conversation[]>("/api/messages"),
  thread: (conversationId: string) => api.get<Message[]>(`/api/messages/${conversationId}`),
  send: (body: SendMessagePayload) => {
    const payload = {
      ...body,
      content: body.content ?? body.message ?? "",
    };
    return api.post<Message>("/api/messages", payload);
  },
  markRead: (conversationId: string) => api.post<void>(`/api/messages/${conversationId}/read`),
  scheduled: () => api.get<Message[]>("/api/messages/scheduled"),
  cancelScheduled: (messageId: string) =>
    api.delete<Message>(`/api/messages/scheduled/${messageId}`),
  search: (q: string) => api.get<Message[]>(`/api/messages/search?q=${encodeURIComponent(q)}`),
  pinned: (conversationId: string) =>
    api.get<Message[]>(`/api/messages/conversation/${conversationId}/pinned`),
  update: (messageId: string, body: UpdateMessagePayload) =>
    api.put<Message>(`/api/messages/${messageId}`, body),
  remove: (messageId: string) => api.delete<Message>(`/api/messages/${messageId}`),
  pin: (messageId: string) => api.patch<Message>(`/api/messages/${messageId}/pin`),
  unpin: (messageId: string) => api.patch<Message>(`/api/messages/${messageId}/unpin`),
};
