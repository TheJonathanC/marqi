/* eslint-disable @next/next/no-img-element -- plain <img> on purpose: the CDNs
   already resize, and this keeps images free of client-side JavaScript. */
import { backdropSet, posterSet, tmdbBackdropSet } from "@/lib/images";

export function Poster({ template, alt, eager = false }: { template: string; alt: string; eager?: boolean }) {
  const { src, srcSet } = posterSet(template);
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes="(max-width: 720px) 32vw, (min-width: 1921px) 8.7vw, 166px"
      alt={alt}
      width={332}
      height={498}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

type BackdropProps = {
  template?: string | null;
  tmdbPath?: string | null;
  alt?: string;
  priority?: boolean;
  sizes?: string;
};

export function Backdrop({ template, tmdbPath, alt = "", priority = false, sizes = "100vw" }: BackdropProps) {
  const set = tmdbPath ? tmdbBackdropSet(tmdbPath) : template ? backdropSet(template) : null;
  if (!set) return null;
  return (
    <img
      src={set.src}
      srcSet={set.srcSet}
      sizes={sizes}
      alt={alt}
      width={1920}
      height={1080}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
    />
  );
}
