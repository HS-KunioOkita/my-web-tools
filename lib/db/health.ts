import { Pool } from "pg";

export interface DbHealth {
  status: "ok" | "unreachable";
  latency?: number;
  error?: string;
}

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 2_000,
      max: 1,
    });
    // pg は idle 中の client がサーバ切断などで失敗した場合に Pool 経由でエラーを投げる。
    // ハンドラがないと Node の uncaughtException として伝搬しサーバ全体が不安定になるため、
    // ここでログだけ残して飲み込む (ヘルスチェック自体の try/catch とは別経路)。
    pool.on("error", (err) => {
      console.error("[db/health] idle client error:", err.message);
    });
  }
  return pool;
}

export async function getDbHealth(): Promise<DbHealth> {
  const start = Date.now();
  try {
    await getPool().query("SELECT 1");
    return { status: "ok", latency: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[db/health] SELECT 1 failed:", message);
    return { status: "unreachable", error: short(message) };
  }
}

function short(message: string): string {
  const firstLine = message.split("\n")[0] ?? "";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}
