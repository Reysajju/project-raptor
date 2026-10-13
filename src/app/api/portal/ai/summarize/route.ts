import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * AI thread summary.
 * POST { clientId } → { summary }
 * Fetches the last 30 comms for a client, builds a context window, and asks
 * the LLM for a concise summary (key points, open items, next steps).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId } = body as { clientId?: string };
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
      where: { clientId },
      orderBy: { occurredAt: "desc" },
      take: 30,
      select: {
        channel: true,
        direction: true,
        subject: true,
        bodyText: true,
        fromValue: true,
        occurredAt: true,
        status: true,
      },
    });

    if (comms.length === 0) {
      return NextResponse.json({ summary: "No communications yet for this client." });
    }

    // Build a compact transcript
    const transcript = comms
      .slice()
      .reverse()
      .map((c, i) => {
        const dir = c.direction === "inbound" ? "from client" : c.direction === "outbound" ? "to client" : "internal";
        const body = c.bodyText.slice(0, 400);
        return `[${i + 1}] ${c.channel.toUpperCase()} (${dir}) ${c.subject ? "— " + c.subject : ""}\n${body}`;
      })
      .join("\n\n");

    const systemPrompt = `You are an assistant summarizing a client communication thread for a busy account manager. Be concise, factual, and structured. Use this format:

**Key topics:** (1-2 lines)
**Open items:** (bullet list of anything still open/awaiting action)
**Next steps:** (bullet list of recommended actions)
**Tone:** (one word: positive / neutral / concerned / urgent)

Do not invent facts. If something is unclear, say so. Keep it under 150 words.`;

    const userPrompt = `Client: ${client.name}${client.company ? ` (${client.company})` : ""}\nClient notes: ${client.notes || "—"}\n\nRecent communications (oldest first):\n\n${transcript}`;

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const summary = completion.choices[0]?.message?.content ?? "Unable to generate summary.";

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[ai/summarize] error", err);
    return NextResponse.json(
      { error: "Failed to generate summary", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
