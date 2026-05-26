import Link from "next/link";
import { getDbHealth } from "@/lib/db/health";
import { tools } from "@/lib/tools/registry";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dbHealth = await getDbHealth();

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>my-web-tools</h1>
        <p className="dashboard-subtitle">
          ローカル PC 上で動作する個人向け Web ツール群
        </p>
        <p
          className={`db-status db-status--${dbHealth.status}`}
          data-test="db-status"
        >
          DB: {dbHealth.status === "ok" ? `ok (${dbHealth.latency}ms)` : "unreachable"}
          {dbHealth.status === "unreachable" && dbHealth.error ? (
            <span className="db-status-detail"> — {dbHealth.error}</span>
          ) : null}
        </p>
      </header>

      {tools.length === 0 ? (
        <p className="empty-state" data-test="empty-state">
          現在利用可能なツールはありません
        </p>
      ) : (
        <ul className="tool-grid">
          {tools.map((tool) => (
            <li key={tool.id} className="tool-card" data-test="tool-card">
              <Link href={`/tools/${tool.slug}`}>
                <h2 className="tool-card-title">
                  {tool.name}
                  {tool.status === "coming-soon" ? (
                    <span className="tool-card-badge">準備中</span>
                  ) : null}
                </h2>
                <p className="tool-card-description">{tool.description}</p>
                {tool.category ? (
                  <span className="tool-card-category">{tool.category}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
