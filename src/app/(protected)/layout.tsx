import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import HelpChatWidget from "@/components/HelpChatWidget";
import type { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col app-bg">
      <Header />
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
      <Footer />
      <HelpChatWidget />
    </div>
  );
}
