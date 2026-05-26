"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

type PublicShellProps = {
  children: React.ReactNode;
};

export default function PublicShell({ children }: PublicShellProps) {
  const pathname = usePathname();
  const isInternalArea = pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

  if (isInternalArea) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#1c1b1b] antialiased">
      <Header />
      <div className="flex-1 pt-20">{children}</div>
      <Footer />
    </div>
  );
}
