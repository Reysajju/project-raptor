import { GET as portalGET, POST as portalPOST } from "@/app/api/portal/clients/route";

/**
 * Direct /api/clients route handler.
 * Proxies to /api/portal/clients so both endpoints function seamlessly.
 */
export async function GET(req: Request) {
  return portalGET();
}

export async function POST(req: Request) {
  return portalPOST(req);
}
