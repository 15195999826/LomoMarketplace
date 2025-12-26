"use client";

import { DataProvider, ItemsProvider, InkMonsProvider } from "@/contexts";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <InkMonsProvider>
        <ItemsProvider>{children}</ItemsProvider>
      </InkMonsProvider>
    </DataProvider>
  );
}
