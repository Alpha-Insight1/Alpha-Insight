"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SESSIONS = ["2024/2025", "2025/2026", "2026/2027", "2027/2028"];
const TERMS = ["First Term", "Second Term", "Third Term"];

export function FeeTrackerFilters({
  session,
  term,
  classFilter,
  feeId,
  status,
  classes,
}: {
  session: string;
  term: string;
  classFilter: string;
  feeId: string;
  status: string;
  classes: string[];
}) {
  const router = useRouter();
  const [localSession, setLocalSession] = useState(session);
  const [localTerm, setLocalTerm] = useState(term);
  const [customSession, setCustomSession] = useState(
    SESSIONS.includes(session) ? "" : session
  );

  function go(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const s = overrides.session ?? localSession;
    const t = overrides.term ?? localTerm;
    const c = overrides.class ?? classFilter;
    const f = overrides.fee ?? feeId;
    const st = overrides.status ?? status;
    if (f) p.set("fee", f);
    if (s) p.set("session", s);
    if (t) p.set("term", t);
    if (st && st !== "all") p.set("status", st);
    if (c) p.set("class", c);
    router.push(`/fee-tracker?${p.toString()}`);
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Session
          </label>
          <select
            value={SESSIONS.includes(localSession) ? localSession : "__custom__"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__custom__") {
                setCustomSession(localSession);
                return;
              }
              setLocalSession(v);
              setCustomSession("");
              go({ session: v });
            }}
            className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white min-w-[140px]"
          >
            {SESSIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="__custom__">Other…</option>
          </select>
        </div>

        {(customSession !== "" || !SESSIONS.includes(localSession)) && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Custom session
            </label>
            <div className="flex gap-2">
              <input
                value={customSession || localSession}
                onChange={(e) => setCustomSession(e.target.value)}
                placeholder="e.g. 2025/2026"
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white w-36"
              />
              <button
                type="button"
                onClick={() => {
                  const s = (customSession || localSession).trim();
                  if (!s) return;
                  setLocalSession(s);
                  go({ session: s });
                }}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Term
          </label>
          <select
            value={localTerm}
            onChange={(e) => {
              setLocalTerm(e.target.value);
              go({ term: e.target.value });
            }}
            className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-white min-w-[140px]"
          >
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 pb-2">
          Filters apply to School Fees and any fee recorded with session/term
        </div>
      </div>

      {classes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Class</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => go({ class: "" })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                !classFilter
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600"
              }`}
            >
              All classes
            </button>
            {classes.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => go({ class: c })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  classFilter === c
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
