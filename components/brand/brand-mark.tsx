import Image from "next/image";

export function BrandMark({ className }: { className: string }) {
  return <span className={className} aria-hidden="true"><Image src="/milo-mark.svg" alt="" width={64} height={64} unoptimized /></span>;
}
