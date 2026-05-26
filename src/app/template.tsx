"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="animate-page-fade flex flex-1 flex-col min-h-0 min-w-0"
    >
      {children}
    </div>
  );
}
