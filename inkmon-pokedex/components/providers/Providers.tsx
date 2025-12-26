"use client";

import { DataProvider } from "@/contexts";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}
