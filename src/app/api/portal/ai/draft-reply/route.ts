import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * AI reply draft.
 * POST { clientId, instruction?, channel? } → { draft }
 * Uses the thread context + an optional instruction (e.g. "confirm the meeting",
 * "ask about the addendum") to draft a reply the staff member can review+send.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, instruction, channel } = body as {
      clientId?: string;
      instruction?: string;
      channel?: string;
    };
    if (!clientId) {
      return NextResponse.json({ error: "clientId required" }, { status: 400 });
    }

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { name: true, company: true, notes: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const comms = await db.communication.findMany({
      where: { clientId, channel: { in: ["email", "sms", "portal", "note"] } },
      orderBy: { occurredAt: "desc" },
      take: 10,
      select: { channel: true, direction: true, bodyText: true, subject: true, fromValue: true },
    });

    const recentThread = comms
      .slice()
      .reverse()
      .map((c) => {
        const who = c.direction === "inbound" ? "Client" : "Us";
        return `${who} (${c.channel}): ${c.bodyText.slice(0, 300)}`;
      })
      .join("\n");

    const channelLabel = channel === "sms" ? "SMS (keep under 160 chars, casual but professional)" : channel === "portal" ? "Portal message (friendly, brief)" : "Email (professional, with greeting and sign-off)";

    const systemPrompt = `You are a writing assistant for a client management team. Draft a ${channelLabel} reply to the client based on the thread context${instruction ? ` and this instruction: "${instruction}"` : ""}. Write only the reply body (no subject line unless email). Be warm, clear, and concise. Do not include placeholders like [name] — use the actual client name.`;

    const userPrompt = `Client: ${client.name}\nCompany: ${client.company || "—"}\nClient notes: ${client.notes || "—"}\n\nRecent thread:\n${recentThread || "(no prior messages)"}`;

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const draft = completion.choices[0]?.message?.content ?? "Unable to generate draft.";
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[ai/draft-reply] error", err);
    return NextResponse.json(
      { error: "Failed to generate draft", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
