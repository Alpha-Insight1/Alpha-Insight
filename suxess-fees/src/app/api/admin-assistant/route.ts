import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  AI_DAILY_CAP,
  buildSnapshotAnswer,
  type SchoolSnapshot,
} from "@/lib/ai-assistant";

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

async function loadSnapshot(supabase: Awaited<ReturnType<typeof createClient>>) {
  const today = isoToday();
  const mStart = monthStart();

  const [
    studentsRes,
    payTodayRes,
    payMonthRes,
    expTodayRes,
    expMonthRes,
    outstandingRes,
    scholarshipsRes,
    busesRes,
    busAssignRes,
  ] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("payments")
      .select("amount")
      .eq("payment_date", today)
      .is("deleted_at", null),
    supabase
      .from("payments")
      .select("amount")
      .gte("payment_date", mStart)
      .is("deleted_at", null),
    supabase.from("expenses").select("amount").eq("expense_date", today),
    supabase.from("expenses").select("amount").gte("expense_date", mStart),
    supabase
      .from("student_fees")
      .select("balance")
      .gt("balance", 0),
    supabase
      .from("scholarships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("school_buses")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("student_bus_assignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const sum = (rows: { amount?: number }[] | null) =>
    (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const outRows = outstandingRes.data || [];
  const collectedMonth = sum(payMonthRes.data);
  const expensesMonth = sum(expMonthRes.data);

  const snapshot: SchoolSnapshot = {
    today,
    studentsActive: studentsRes.count ?? 0,
    collectedToday: sum(payTodayRes.data),
    collectedMonth,
    expensesToday: sum(expTodayRes.data),
    expensesMonth,
    outstandingTotal: outRows.reduce((s, r) => s + Number(r.balance || 0), 0),
    outstandingCount: outRows.length,
    profitMonth: collectedMonth - expensesMonth,
    scholarshipsActive: scholarshipsRes.count ?? 0,
    buses: busesRes.count ?? 0,
    busStudents: busAssignRes.count ?? 0,
  };
  return snapshot;
}

async function checkAndIncrementUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const today = isoToday();
  const { data: row } = await supabase
    .from("ai_assistant_usage")
    .select("id, question_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  const current = row?.question_count ?? 0;
  if (current >= AI_DAILY_CAP) {
    return { allowed: false as const, used: current, remaining: 0 };
  }

  if (row?.id) {
    await supabase
      .from("ai_assistant_usage")
      .update({
        question_count: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  } else {
    await supabase.from("ai_assistant_usage").insert({
      user_id: userId,
      usage_date: today,
      question_count: 1,
    });
  }

  return {
    allowed: true as const,
    used: current + 1,
    remaining: Math.max(0, AI_DAILY_CAP - current - 1),
  };
}

/** Optional LLM — uses XAI_API_KEY or OPENAI_API_KEY if set */
async function maybeLlmAnswer(
  question: string,
  snapshot: SchoolSnapshot
): Promise<string | null> {
  const xai = process.env.XAI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (!xai && !openai) return null;

  const system = `You are Alpha Insight Admin Assistant for a Nigerian school fees system.
Answer briefly in plain English using ONLY the snapshot numbers below.
Currency is Naira (₦). If the question needs a student name list, say which menu to open.
Do not invent figures. Snapshot JSON:
${JSON.stringify(snapshot)}`;

  try {
    if (xai) {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${xai}`,
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            { role: "system", content: system },
            { role: "user", content: question },
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "";
    if (role !== "admin" && role !== "director") {
      return NextResponse.json(
        { error: "Only admin can use the assistant" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body.question || "").trim().slice(0, 500);
    if (!question) {
      return NextResponse.json({ error: "Enter a question" }, { status: 400 });
    }

    // Cap check (if table missing, still answer but note)
    let usage = { allowed: true, used: 0, remaining: AI_DAILY_CAP };
    try {
      usage = await checkAndIncrementUsage(supabase, user.id);
    } catch {
      // Table may not exist yet — allow with warning in answer
    }

    if (!usage.allowed) {
      return NextResponse.json({
        error: `Daily limit reached (${AI_DAILY_CAP} questions). Try again tomorrow.`,
        cap: AI_DAILY_CAP,
        used: usage.used,
        remaining: 0,
      }, { status: 429 });
    }

    const snapshot = await loadSnapshot(supabase);
    const llm = await maybeLlmAnswer(question, snapshot);
    const answer =
      llm ||
      buildSnapshotAnswer(question, snapshot);

    return NextResponse.json({
      answer,
      cap: AI_DAILY_CAP,
      used: usage.used,
      remaining: usage.remaining,
      mode: llm ? "llm" : "data",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Assistant error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const today = isoToday();
    let used = 0;
    try {
      const { data } = await supabase
        .from("ai_assistant_usage")
        .select("question_count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();
      used = data?.question_count ?? 0;
    } catch {
      used = 0;
    }

    return NextResponse.json({
      cap: AI_DAILY_CAP,
      used,
      remaining: Math.max(0, AI_DAILY_CAP - used),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error" },
      { status: 500 }
    );
  }
}
