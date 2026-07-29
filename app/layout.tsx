import type { Metadata } from "next";
import { validateArticlesAtBuildTime } from "@/lib/content";
import { ensureSchema } from "@/lib/db";
import "./globals.css";

validateArticlesAtBuildTime();

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research Study",
  description: "Online research study",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.DATABASE_URL) {
    try {
      await ensureSchema();
    } catch {
      // DB unavailable during build preview
    }
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
