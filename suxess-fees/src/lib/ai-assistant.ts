/** Default questions per admin per calendar day (Africa/Lagos-style local day on server = UTC date is fine for v1) */
export const AI_DAILY_CAP = 50;

export type SchoolSnapshot = {
  today: string;
  studentsActive: number;
  collectedToday: number;
  collectedMonth: number;
  expensesToday: number;
  expensesMonth: number;
  outstandingTotal: number;
  outstandingCount: number;
  profitMonth: number;
  scholarshipsActive: number;
  buses?: number;
  busStudents?: number;
};

export function buildSnapshotAnswer(
  question: string,
  s: SchoolSnapshot
): string {
  const q = question.toLowerCase();
  const lines: string[] = [];

  const wantsToday =
    q.includes("today") || q.includes("collected today") || q.includes("today's");
  const wantsMonth =
    q.includes("month") || q.includes("this month") || q.includes("profit");
  const wantsOut =
    q.includes("outstanding") ||
    q.includes("owe") ||
    q.includes("debt") ||
    q.includes("balance");
  const wantsStudents =
    q.includes("student") || q.includes("enrol") || q.includes("how many");
  const wantsExpense =
    q.includes("expense") || q.includes("spent") || q.includes("spending");
  const wantsSummary =
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("how are we") ||
    q.includes("dashboard") ||
    q.includes("status");

  if (wantsToday || wantsSummary) {
    lines.push(
      `Today (${s.today}): collected ₦${s.collectedToday.toLocaleString()}, expenses ₦${s.expensesToday.toLocaleString()}.`
    );
  }
  if (wantsMonth || wantsSummary || q.includes("profit")) {
    lines.push(
      `This month: money in ₦${s.collectedMonth.toLocaleString()}, expenses ₦${s.expensesMonth.toLocaleString()}, net ~₦${s.profitMonth.toLocaleString()}.`
    );
  }
  if (wantsOut || wantsSummary) {
    lines.push(
      `Outstanding: ₦${s.outstandingTotal.toLocaleString()} across ${s.outstandingCount} fee line(s). Open Outstanding or Fees Tracker for names.`
    );
  }
  if (wantsStudents || wantsSummary) {
    lines.push(`Active students on record: ${s.studentsActive}.`);
  }
  if (wantsExpense && !wantsMonth && !wantsToday) {
    lines.push(
      `Expenses today ₦${s.expensesToday.toLocaleString()}, this month ₦${s.expensesMonth.toLocaleString()}.`
    );
  }
  if (q.includes("scholarship")) {
    lines.push(`Active scholarships: ${s.scholarshipsActive}.`);
  }
  if (q.includes("bus") && s.buses != null) {
    lines.push(
      `School buses: ${s.buses}, students assigned: ${s.busStudents ?? 0}.`
    );
  }

  if (lines.length === 0) {
    lines.push(
      "I can help with: collections today/month, expenses, outstanding balances, student count, profit this month, scholarships, and school bus numbers.",
      `Quick snapshot — Today collected: ₦${s.collectedToday.toLocaleString()} · Outstanding: ₦${s.outstandingTotal.toLocaleString()} · Active students: ${s.studentsActive}.`
    );
  }

  lines.push(
    "",
    "_Answers use live school data. For full lists, open the matching menu section._"
  );
  return lines.join("\n");
}
