"use client";

import { BookProvider } from "@/components/BookContext";
import { ReactNode } from "react";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <BookProvider>{children}</BookProvider>;
}
