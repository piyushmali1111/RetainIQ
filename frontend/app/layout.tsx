import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/SidebarNav";
export const metadata: Metadata = {
  title: "ChurnGuardAI — Customer Retention Workspace",
  description:
    "Understand customer risk, support every conversation, and turn insights into lasting loyalty.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
