"use client";

import { getImageCandidates, SrcRoot } from "@/app/utils/functions";
import Image, { ImageProps } from "next/image";
import { useMemo, useState } from "react";

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "alt"> {
  srcRoot: SrcRoot;
  alt: string;
  fallback?: string;
  setLoaded?: (loaded: boolean) => void;
}

export default function ImageWithFallback({
  srcRoot,
  alt,
  fallback,
  setLoaded,
  ...imgProps
}: ImageWithFallbackProps) {
  const candidates = useMemo(() => {
    const list = getImageCandidates(srcRoot);
    if (fallback) list.push(fallback);
    return list;
  }, [srcRoot, fallback]);

  const [idx, setIdx] = useState(0);
  const currentSrc = candidates[idx];

  return (
    <Image
      {...imgProps}
      src={currentSrc}
      alt={alt}
      onLoadingComplete={() => setLoaded?.(true)}
      onError={() => {
        setIdx((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
