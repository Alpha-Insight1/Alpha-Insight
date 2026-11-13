"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export function StudentSearch({
  initialQuery,
  campusId,
  status,
  className,
}: {
  initialQuery: string;
  campusId?: string;
  status?: string;
  className?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const buildUrl = (query: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (campusId) params.set("campus", campusId);
    if (status && status !== "active") params.set("status", status);
    if (className) params.set("class", className);
    const qs = params.toString();
    return qs ? `/students?${qs}` : "/students";
  };

  const go = (query: string) => {
    router.push(buildUrl(query));
  };

  // Debounced live search while typing (faster for secretaries)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      go(q);
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    go(q);
  };

  const clear = () => {
    setQ("");
    router.push(buildUrl(""));
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, admission no, parent phone, class…"
          className="w-full pl-10 pr-28 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 bg-white shadow-sm"
          autoComplete="off"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {q && (
            <button
              type="button"
              onClick={clear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Search
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        Results update as you type · name, admission number, phone, parent, class
      </p>
    </form>
  );
}
