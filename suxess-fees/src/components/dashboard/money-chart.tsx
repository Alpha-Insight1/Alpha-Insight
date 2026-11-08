export function MoneyChart({
  months,
}: {
  months: { label: string; moneyIn: number; moneyOut: number; profit: number }[];
}) {
  const max = Math.max(
    1,
    ...months.map((m) => Math.max(m.moneyIn, m.moneyOut, Math.abs(m.profit)))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Cashflow</h3>
          <p className="text-xs text-slate-400 mt-0.5">Money in vs out by month</p>
        </div>
      </div>
      <div className="flex items-end gap-2 h-44">
        {months.map((m) => {
          const inH = Math.round((m.moneyIn / max) * 100);
          const outH = Math.round((m.moneyOut / max) * 100);
          return (
            <div
              key={m.label}
              className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
            >
              <div className="w-full flex items-end justify-center gap-1 h-32">
                <div
                  className="w-[42%] rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 min-h-[4px] shadow-sm"
                  style={{ height: `${Math.max(inH, 3)}%` }}
                  title={`In ₦${m.moneyIn.toLocaleString()}`}
                />
                <div
                  className="w-[42%] rounded-t-md bg-gradient-to-t from-rose-500 to-orange-300 min-h-[4px] shadow-sm"
                  style={{ height: `${Math.max(outH, 3)}%` }}
                  title={`Out ₦${m.moneyOut.toLocaleString()}`}
                />
              </div>
              <span className="text-[10px] text-slate-400 truncate w-full text-center font-medium">
                {m.label.replace(/ \d{4}/, "").slice(0, 6)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Out
        </span>
      </div>
    </div>
  );
}
