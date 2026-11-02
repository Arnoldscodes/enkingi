const LOGO_SRC = "/enkingi-logo.png";

/**
 * The eNkingi brand mark, shown as a rounded tile so the artwork keeps its
 * own white ground and stays readable on both light and dark surfaces.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      src={LOGO_SRC}
      alt="eNkingi logo"
      className={`shrink-0 rounded-xl bg-white ring-1 ring-primary/15 ${className}`}
    />
  );
}
