"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

export type StaffUser = {
  id: string;
  full_name: string | null;
  role: string;
};

export type ConversationRow = {
  id: string;
  subject: string | null;
  updated_at: string;
  other_name: string;
  other_id: string;
  last_body: string | null;
  unread: boolean;
};

export type MessageRow = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  sender_name?: string | null;
};

export function MessagesClient({
  currentUserId,
  isAdmin,
  staff,
  conversations,
  initialMessages,
  activeConversationId,
}: {
  currentUserId: string;
  isAdmin: boolean;
  staff: StaffUser[];
  conversations: ConversationRow[];
  initialMessages: MessageRow[];
  activeConversationId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTo, setNewTo] = useState(staff[0]?.id || "");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [starting, setStarting] = useState(false);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const openThread = (id: string) => {
    router.push(`/messages?c=${id}`);
    router.refresh();
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !body.trim()) return;
    setSending(true);
    setError(null);
    const text = body.trim();
    const { error: err } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_id: currentUserId,
      body: text,
    });
    if (err) {
      setError(err.message);
      setSending(false);
      return;
    }
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConversationId);
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeConversationId)
      .eq("user_id", currentUserId);
    setBody("");
    setSending(false);
    router.refresh();
  };

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTo || !newBody.trim()) {
      setError("Choose a person and write a message.");
      return;
    }
    setStarting(true);
    setError(null);

    const { data: conv, error: cErr } = await supabase
      .from("conversations")
      .insert({
        subject: newSubject.trim() || null,
        created_by: currentUserId,
      })
      .select("id")
      .single();

    if (cErr || !conv) {
      setError(cErr?.message || "Could not create conversation. Run migration-messages.sql");
      setStarting(false);
      return;
    }

    const members = [
      { conversation_id: conv.id, user_id: currentUserId, last_read_at: new Date().toISOString() },
      { conversation_id: conv.id, user_id: newTo, last_read_at: null },
    ];
    const { error: mErr } = await supabase.from("conversation_members").insert(members);
    if (mErr) {
      setError(mErr.message);
      setStarting(false);
      return;
    }

    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: currentUserId,
      body: newBody.trim(),
    });
    if (msgErr) {
      setError(msgErr.message);
      setStarting(false);
      return;
    }

    setNewBody("");
    setNewSubject("");
    setStarting(false);
    router.push(`/messages?c=${conv.id}`);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[70vh]">
      {/* List */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-white text-sm">
            Conversations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin ? "Message secretaries" : "Messages from director"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {conversations.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              No messages yet
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openThread(c.id)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition ${
                  activeConversationId === c.id
                    ? "bg-indigo-50 dark:bg-indigo-500/10"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                    {c.other_name}
                  </p>
                  {c.unread && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {c.last_body || c.subject || "—"}
                </p>
              </button>
            ))
          )}
        </div>

        {/* New message */}
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 bg-slate-50/80 dark:bg-slate-950/40">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            New message
          </p>
          <form onSubmit={startConversation} className="space-y-2">
            <select
              value={newTo}
              onChange={(e) => setNewTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              required
            >
              <option value="">Select person…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.id.slice(0, 8)} ({s.role})
                </option>
              ))}
            </select>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Subject (optional)"
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write message…"
              rows={3}
              required
              className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
            <button
              type="submit"
              disabled={starting || staff.length === 0}
              className="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {starting ? "Sending…" : "Send"}
            </button>
          </form>
          {staff.length === 0 && (
            <p className="text-[11px] text-amber-700 mt-2">
              No other users in profiles. Add a secretary profile in Supabase.
            </p>
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-[420px]">
        {active ? (
          <>
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-white">
                {active.other_name}
              </p>
              {active.subject && (
                <p className="text-xs text-slate-400">{active.subject}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {initialMessages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">
                  No messages in this thread
                </p>
              ) : (
                initialMessages.map((m) => {
                  const mine = m.sender_id === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                          mine
                            ? "bg-indigo-600 text-white rounded-br-md"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md"
                        }`}
                      >
                        {!mine && (
                          <p className="text-[10px] opacity-70 mb-0.5">
                            {m.sender_name || "Staff"}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            mine ? "text-indigo-200" : "text-slate-400"
                          }`}
                        >
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form
              onSubmit={sendReply}
              className="p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2"
            >
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a reply…"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="px-4 rounded-xl bg-indigo-600 text-white disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-sm">
            Select a conversation or start a new message
          </div>
        )}
        {error && (
          <p className="px-4 pb-3 text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
