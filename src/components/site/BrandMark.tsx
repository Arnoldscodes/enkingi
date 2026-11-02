import logoAsset from "@/assets/inkingi-logo.png.asset.json";

/**
 * The eNkingi brand mark, shown as a rounded tile so the artwork keeps its
 * own white ground and stays readable on both light and dark surfaces.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="eNkingi logo"
      className={`shrink-0 rounded-xl bg-white ring-1 ring-primary/15 ${className}`}
    />
  );
}
