import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/portal/settings/drive-connections
 * Returns all connected Google Drive folders.
 */
export async function GET() {
  const connections = await db.driveConnection.findMany({
    orderBy: { connectedAt: "desc" },
  });
  return NextResponse.json({ connections });
}

/**
 * POST /api/portal/settings/drive-connections
 * Body: { folderUrl, folderName? }
 * Adds a new Google Drive folder connection (by shared link).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { folderUrl, folderName } = body as { folderUrl: string; folderName?: string };

  if (!folderUrl) {
    return NextResponse.json({ error: "folderUrl is required" }, { status: 400 });
  }

  // Basic validation — must be a Google Drive URL
  if (!folderUrl.includes("drive.google.com") && !folderUrl.includes("docs.google.com")) {
    return NextResponse.json({ error: "Please provide a valid Google Drive link" }, { status: 400 });
  }

  const created = await db.driveConnection.create({
    data: {
      folderUrl,
      folderName: folderName || extractFolderName(folderUrl),
    },
  });

  await db.auditLog.create({
    data: {
      action: "drive_connection.added",
      entity: "drive_connection",
      entityId: created.id,
      metadataJson: JSON.stringify({ folderUrl }),
    },
  });

  return NextResponse.json({ connection: created });
}

/**
 * DELETE /api/portal/settings/drive-connections?id=X
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await db.driveConnection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function extractFolderName(url: string): string {
  // Try to extract a folder name from the URL
  const match = url.match(/\/folders\/([^?/]+)/);
  if (match) return `Drive folder ${match[1].slice(0, 8)}`;
  return "Google Drive folder";
}
