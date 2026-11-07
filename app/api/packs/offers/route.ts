import { NextResponse } from "next/server";
import { OPTIONAL_PACK_IDS, readPackPriceId } from "@/config/packCatalog";
import type { OptionalPackId } from "@/config/packFlags";

export const dynamic = "force-dynamic";

/** Whether each pack has a recurring price id configured. Price ids stay on the server. */
export async function GET() {
  const offers = Object.fromEntries(
    OPTIONAL_PACK_IDS.map((pack) => [pack, Boolean(readPackPriceId(pack))]),
  ) as Record<OptionalPackId, boolean>;

  return NextResponse.json({ offers });
}
