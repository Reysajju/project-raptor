import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/tags
 * Returns all unique tags across all (non-deleted) clients, with counts and
 * the list of client IDs using each tag. Used by the tags management panel.
 */
export async function GET() {
  const clients = await db.client.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, company: true, tags: true, accentColor: true },
  });

  const tagMap = new Map<string, { count: number; clients: { id: string; name: string; company: string | null; accentColor: string }[] }>();

  for (const c of clients) {
    if (!c.tags) continue;
    const tags = c.tags.split(",").map((t) => t.trim()).filter(Boolean);
    for (const tag of tags) {
      const existing = tagMap.get(tag);
      const clientRef = { id: c.id, name: c.name, company: c.company, accentColor: c.accentColor };
      if (existing) {
        existing.count++;
        existing.clients.push(clientRef);
      } else {
        tagMap.set(tag, { count: 1, clients: [clientRef] });
      }
    }
  }

  const tags = Array.from(tagMap.entries())
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    tags,
    totalTags: tags.length,
    totalClients: clients.length,
  });
}

/**
 * POST /api/portal/tags
 * Rename or merge a tag across all clients.
 * Body: { from: string, to: string }
 *   - rename: changes "from" → "to" on all clients that have "from"
 *   - merge: if "to" already exists, both become "to"
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { action, from, to } = body as { action: "rename"; from: string; to: string };

  if (action !== "rename" || !from || !to) {
    return NextResponse.json({ error: "action, from, and to are required" }, { status: 400 });
  }

  const fromTrimmed = from.trim();
  const toTrimmed = to.trim();

  if (fromTrimmed === toTrimmed) {
    return NextResponse.json({ error: "from and to must be different" }, { status: 400 });
  }

  // Find all clients with the "from" tag
  const clients = await db.client.findMany({
    where: { deletedAt: null, tags: { contains: fromTrimmed } },
    select: { id: true, tags: true },
  });

  let updated = 0;
  for (const c of clients) {
    const currentTags = c.tags ? c.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    // Replace "from" with "to", dedupe
    const newTags = currentTags
      .map((t) => (t === fromTrimmed ? toTrimmed : t))
      .filter((t, i, arr) => arr.indexOf(t) === i); // dedupe
    if (newTags.join(",") !== currentTags.join(",")) {
      await db.client.update({
        where: { id: c.id },
        data: { tags: newTags.join(",") },
      });
      updated++;
    }
  }

  await db.auditLog.create({
    data: {
      action: "tags.rename",
      entity: "client",
      metadataJson: JSON.stringify({ from: fromTrimmed, to: toTrimmed, affected: updated }),
    },
  });

  return NextResponse.json({ renamed: true, from: fromTrimmed, to: toTrimmed, affected: updated });
}

/**
 * DELETE /api/portal/tags?name=X
 * Removes a tag from all clients.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name query param required" }, { status: 400 });
  }

  const clients = await db.client.findMany({
    where: { deletedAt: null, tags: { contains: name } },
    select: { id: true, tags: true },
  });

  let updated = 0;
  for (const c of clients) {
    const currentTags = c.tags ? c.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const newTags = currentTags.filter((t) => t !== name);
    if (newTags.length !== currentTags.length) {
      await db.client.update({
        where: { id: c.id },
        data: { tags: newTags.join(",") },
      });
      updated++;
    }
  }

  await db.auditLog.create({
    data: {
      action: "tags.delete",
      entity: "client",
      metadataJson: JSON.stringify({ name, affected: updated }),
    },
  });

  return NextResponse.json({ deleted: true, name, affected: updated });
}
