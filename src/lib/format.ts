export function formatRWF(amount: number): string {
  const value = new Intl.NumberFormat("en-RW", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `RWF ${value}`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `INK-${stamp}${rand}`;
}
