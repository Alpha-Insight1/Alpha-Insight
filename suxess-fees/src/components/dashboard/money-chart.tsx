"use client";

import { useMemo, useState } from "react";

type MonthPoint = {
  label: string;
  moneyIn: number;
  moneyOut: number;
  profit: number;
};

function formatNaira(val: number) {
  const abs = Math.abs(Math.round(val));
  const sign = val < 0 ? "-" : "";
  return `${sign}₦${abs.toLocaleString("en-NG")}`;
}

export function MoneyChart({ months }: { months: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showIn, setShowIn] = useState(true);
  const [showOut, setShowOut] = useState(true);
  const [showNet, setShowNet] = useState(true);

  const data = useMemo(() => {
    // oldest → newest for left-to-right
    const rows = [...months].reverse();
    return rows.map((m) => ({
      label: m.label.replace(/ \d{4}/, "").slice(0, 8),
      full: m.label,
      moneyIn: m.moneyIn || 0,
      moneyOut: m.moneyOut || 0,
      net: (m.moneyIn || 0) - (m.moneyOut || 0),
    }));
  }, [months]);

  const totals = useMemo(() => {
    const moneyIn = data.reduce((s, d) => s + d.moneyIn, 0);
    const moneyOut = data.reduce((s, d) => s + d.moneyOut, 0);
    return { moneyIn, moneyOut, net: moneyIn - moneyOut };
  }, [data]);

  const max = Math.max(
    1,
    ...data.map((d) =>
      Math.max(
        showIn ? d.moneyIn : 0,
        showOut ? d.moneyOut : 0,
        showNet ? Math.abs(d.net) : 0
      )
    )
  );

  // SVG net line points
  const chartH = 160;
  const chartPad = 8;
  const n = Math.max(data.length, 1);
  const netPoints = data.map((d, i) => {
    const x = (i / Math.max(n - 1, 1)) * 100;
    const y = chartH - (Math.abs(d.net) / max) * (chartH - chartPad * 2) - chartPad;
    // map signed net: positive from bottom, negative below mid — keep simple positive scale from bottom
    const yPos = chartH - (Math.max(d.net, 0) / max) * (chartH - chartPad * 2) - chartPad;
    return { x, y: yPos, net: d.net };
  });
  const netPath =
    netPoints.length > 0
      ? netPoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : "";

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-[#111827]/95 shadow-sm dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] p-5 h-full">
      <div className="pointer-events-none absolute -top-20 left-1/4 h-40 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -top-16 right-1/4 h-36 w-64 rounded-full bg-indigo-500/5 blur-3xl" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Cashflow &amp; Net Trend
            </h3>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Alpha Insight
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Money in vs out by month · based on payment / expense date
          </p>
        </div>
      </div>

      {/* Series pills */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 py-3">
        <button
          type="button"
          onClick={() => setShowIn((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border transition ${
            showIn
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500/40 text-slate-800 dark:text-slate-200"
              : "opacity-45 border-slate-200 dark:border-slate-700"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
          <span className="font-semibold">Money In</span>
          <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
            {formatNaira(totals.moneyIn)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowOut((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border transition ${
            showOut
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500/40 text-slate-800 dark:text-slate-200"
              : "opacity-45 border-slate-200 dark:border-slate-700"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
          <span className="font-semibold">Money Out</span>
          <span className="tabular-nums font-bold text-rose-600 dark:text-rose-400">
            {formatNaira(totals.moneyOut)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowNet((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border transition ${
            showNet
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500/40 text-slate-800 dark:text-slate-200"
              : "opacity-45 border-slate-200 dark:border-slate-700"
          }`}
        >
          <span className="w-3 h-0.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
          <span className="font-semibold">Net</span>
          <span
            className={`tabular-nums font-bold ${
              totals.net >= 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {totals.net > 0 ? "+" : ""}
            {formatNaira(totals.net)}
          </span>
        </button>
      </div>

      {/* Chart */}
      <div className="relative z-10 h-[220px] sm:h-[260px]">
        {data.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">
            No monthly data yet
          </p>
        ) : (
          <div className="flex items-end gap-1.5 sm:gap-2 h-[180px] sm:h-[210px] relative">
            {/* Net trend overlay */}
            {showNet && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 100 ${chartH}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {netPath && (
                  <>
                    <path
                      d={`${netPath} L 100 ${chartH} L 0 ${chartH} Z`}
                      fill="url(#netFill)"
                    />
                    <path
                      d={netPath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
            )}

            {data.map((d, i) => {
              const inH = showIn ? Math.max((d.moneyIn / max) * 100, d.moneyIn > 0 ? 4 : 0) : 0;
              const outH = showOut
                ? Math.max((d.moneyOut / max) * 100, d.moneyOut > 0 ? 4 : 0)
                : 0;
              const isHover = hover === i;
              return (
                <div
                  key={d.full + i}
                  className="flex-1 flex flex-col items-center min-w-0 h-full justify-end cursor-pointer"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                >
                  <div
                    className={`w-full flex items-end justify-center gap-0.5 sm:gap-1 flex-1 rounded-lg transition ${
                      isHover ? "bg-slate-50/80 dark:bg-white/5" : ""
                    }`}
                  >
                    {showIn && (
                      <div
                        className="w-[40%] max-w-[18px] sm:max-w-[22px] rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/20 min-h-[2px]"
                        style={{ height: `${inH}%` }}
                      />
                    )}
                    {showOut && (
                      <div
                        className="w-[40%] max-w-[18px] sm:max-w-[22px] rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 shadow-sm shadow-rose-500/20 min-h-[2px]"
                        style={{ height: `${outH}%` }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold mt-2 truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hover tooltip */}
        {active && (
          <div className="absolute top-2 right-2 z-20 min-w-[180px] rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-md p-3 shadow-xl text-xs">
            <p className="font-bold text-slate-900 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              {active.full}
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> In
                </span>
                <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNaira(active.moneyIn)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Out
                </span>
                <span className="tabular-nums font-bold text-rose-600 dark:text-rose-400">
                  {formatNaira(active.moneyOut)}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                <span className="text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Net
                </span>
                <span
                  className={`tabular-nums font-extrabold ${
                    active.net >= 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600"
                  }`}
                >
                  {active.net > 0 ? "+" : ""}
                  {formatNaira(active.net)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="relative z-10 text-[11px] text-slate-400 mt-2 flex items-start gap-1.5">
        <span className="text-indigo-400 mt-0.5">●</span>
        Uses the date on each payment or expense (including backdated entries).
      </p>
    </div>
  );
}
