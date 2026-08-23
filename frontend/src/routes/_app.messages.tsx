import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { messagesService } from "@/services";
import { Card, Avatar, EmptyState } from "@/components/shared/primitives";
import { MessageSquareDashed, Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { TypoCaption } from "@/components/shared/Typography";

export const Route = createFileRoute("/_app/messages")({
  head: () => ({
    meta: [
      { title: "Messages — DevLink" },
      { name: "description", content: "Chat with teammates and builders in real time." },
    ],
  }),
  component: MessagesIndex,
});

interface SearchResult {
  id: string;
  conversation_id: string;
  content: string;
  created_at?: string;
  sender_id?: string;
}

function MessagesIndex() {
  const { data = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: messagesService.conversations,
  });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = (await messagesService.search(q)) as unknown;
        const mapped = (Array.isArray(res) ? res : []).map((m: any) => ({
          id: String(m.id),
          conversation_id: String(m.conversation_id ?? ""),
          content: m.content ?? m.text ?? "",
          created_at: m.created_at,
          sender_id: m.sender_id,
        }));
        setResults(mapped);
      } catch (err) {
        console.error("Search failed", err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const isConversationActive = useMatch({
    from: "/_app/messages/$conversationId",
    shouldThrow: false,
  });

  const conversationName = (conversationId: string) => {
    const found = data.find((c) => String(c.id) === String(conversationId));
    if (found && "with" in found && found.with) {
      return found.with.name ?? "Conversation";
    }
    return "Conversation";
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="lg:h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[14px] font-semibold text-foreground">Conversations</p>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5">
            <Search size={13} className="text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages…"
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        {query.trim() ? (
          searching ? (
            <div className="px-4 py-3">
              <TypoCaption>Searching messages…</TypoCaption>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3">
              <EmptyState
                title="No matches"
                desc="No messages match your search across all conversations."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    to="/messages/$conversationId"
                    params={{ conversationId: r.conversation_id }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageSquareDashed size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-foreground">
                        {conversationName(r.conversation_id)}
                      </p>
                      <TypoCaption as="p" className="truncate">
                        {r.content}
                      </TypoCaption>
                    </div>
                    {r.created_at && (
                      <TypoCaption>
                        {new Date(r.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TypoCaption>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : data.length === 0 ? (
          <EmptyState title="No conversations" desc="You don't have any open conversations yet." />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((c) => (
              <li key={c.id}>
                <Link
                  to="/messages/$conversationId"
                  params={{ conversationId: c.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <Avatar src={c.with.avatar} alt={c.with.name} size={40} online={c.with.online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {c.with.name}
                    </p>
                    <TypoCaption as="p">{c.preview}</TypoCaption>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TypoCaption>{c.ago}</TypoCaption>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {isConversationActive ? (
        <Outlet />
      ) : (
        <Card className="flex items-center justify-center p-8">
          <EmptyState
            title="Select a conversation"
            desc="Choose a chat on the left or search builders to start a new conversation."
          />
        </Card>
      )}
    </div>
  );
}
