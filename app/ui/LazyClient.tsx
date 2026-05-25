import dynamic from "next/dynamic";
import React from "react";

type Importer<T> = () => Promise<{ default: React.ComponentType<T> }>;

export function lazyClient<T = any>(
  importer: Importer<T>,
  opts?: { loading?: React.ReactNode },
) {
  return dynamic(importer as any, {
    ssr: false,
    loading: () => opts?.loading ?? <div>Loading...</div>,
  });
}

export default lazyClient;
