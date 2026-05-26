import Link from "next/link";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools/registry";

export const dynamic = "force-dynamic";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  return (
    <main className="tool-placeholder">
      <p>
        <Link href="/" className="back-link">
          ← ダッシュボードに戻る
        </Link>
      </p>
      <h1 className="tool-placeholder-title">{tool.name}</h1>
      <p className="tool-placeholder-description">{tool.description}</p>
      <p className="tool-placeholder-message">このツールは現在準備中です</p>
    </main>
  );
}
