"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "How much did we collect today?",
  "What is our outstanding balance?",
  "Profit this month?",
  "How many active students?",
  "School bus summary",
];

export function AdminAssistant({ docked = false }: { docked?: boolean }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi — I’m the Alpha Insight admin assistant. Ask about collections, expenses, outstanding, students, or buses.",
    },
  ]);
  const [cap, setCap] = useState(50);
  const [remaining, setRemaining] = useState(50);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin-assistant")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.cap === "number") setCap(d.cap);
        if (typeof d.remaining === "number") setRemaining(d.remaining);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/admin-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.cap === "number") setCap(data.cap);
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.error || "Could not answer." },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: data.answer || "No answer." },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Network error. Try again." },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          docked
            ? "flex items-center gap-2 rounded-full bg-slate-900 dark:bg-slate-800 text-white pl-3.5 pr-4 py-2.5 shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition text-[13px] font-semibold tracking-tight"
            : "fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-slate-900 text-white pl-3.5 pr-4 py-2.5 shadow-lg transition text-[13px] font-semibold"
        }
        title="Ask Alpha"
      >
        <Sparkles className="w-4 h-4" />
        Ask Alpha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:my-4 sm:mr-4 bg-white dark:bg-gray-900 rounded-none sm:rounded-2xl shadow-2xl flex flex-col border dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-brand-navy text-white sm:rounded-t-2xl">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <p className="font-semibold text-sm">Admin assistant</p>
                  <p className="text-[10px] text-blue-100">
                    {remaining} of {cap} questions left today
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-xl bg-brand-blue text-white px-3 py-2 text-sm whitespace-pre-wrap"
                      : "mr-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-3 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <p className="text-xs text-gray-400">Thinking…</p>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading || remaining <= 0}
                  onClick={() => ask(s)}
                  className="text-[10px] px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              className="p-3 border-t dark:border-gray-700 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  remaining <= 0
                    ? "Daily limit reached"
                    : "Ask about fees, outstanding…"
                }
                disabled={loading || remaining <= 0}
                className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || remaining <= 0 || !input.trim()}
                className="p-2.5 rounded-lg bg-brand-blue text-white disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
