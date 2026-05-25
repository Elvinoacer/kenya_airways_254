"use client";
import Image, { ImageProps } from "next/image";
import React from "react";

type Props = ImageProps & { className?: string };

export default function ImageOptimized(props: Props) {
  // sensible defaults for performance
  const { priority = false, sizes = "100vw", ...rest } = props as any;
  return (
    <Image
      {...(rest as ImageProps)}
      sizes={sizes}
      priority={priority}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
