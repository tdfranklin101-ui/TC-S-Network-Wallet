import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { pgTable, text, numeric, date, timestamp, sql as sqlFn } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import ws from "ws";

// Specify Node.js runtime for Vercel (required for ws package)
export const runtime = 'nodejs';

neonConfig.webSocketConstructor = ws;

const wallets = pgTable("wallets", {
  id: text("id").primaryKey(),
  solar: numeric("solar", { precision: 20, scale: 2 }).notNull().default("0"),
  rays: numeric("rays", { precision: 20, scale: 2 }).notNull().default("0"),
  lastMintDate: date("last_mint_date"),
  createdAt: timestamp("created_at").notNull(),
});

const RAYS_PER_SOLAR = 10000;

function daysBetween(d1: string, d2: string) {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function POST(req: Request, { params }: { params: { walletId: string } }) {
  const { walletId } = params;
  const today = new Date().toISOString().split("T")[0];

  if (!process.env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    let [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));

    if (!wallet) {
      [wallet] = await db
        .insert(wallets)
        .values({
          id: walletId,
          solar: "0",
          rays: "0",
          lastMintDate: null,
          createdAt: new Date(),
        })
        .returning();
    }

    const last = wallet.lastMintDate || today;
    const deltaDays = daysBetween(last, today);

    let mintedSolar = 0;
    if (!wallet.lastMintDate) {
      mintedSolar = 1;
    } else if (deltaDays > 0) {
      mintedSolar = deltaDays;
    }

    const newSolar = parseFloat(wallet.solar || "0") + mintedSolar;
    const newRays = parseFloat(wallet.rays || "0") + mintedSolar * RAYS_PER_SOLAR;

    const [updated] = await db
      .update(wallets)
      .set({
        solar: newSolar.toString(),
        rays: newRays.toString(),
        lastMintDate: today,
      })
      .where(eq(wallets.id, walletId))
      .returning();

    return new Response(
      JSON.stringify({
        walletId,
        mintedSolar,
        newSolarBalance: updated.solar,
        newRaysBalance: updated.rays,
        lastMintDate: updated.lastMintDate,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    await pool.end();
  }
}
