import type { Seller } from "@/lib/types";

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "casual", label: "Casual / daily" },
] as const;

export function employmentLabel(value: string): string {
  return EMPLOYMENT_TYPES.find((type) => type.value === value)?.label ?? value;
}

export interface Job {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  salary: string | null;
  employment_type: string;
  openings: number;
  deadline: string | null;
  location: string;
  status: string;
  is_filled: boolean;
  created_at: string;
  sellers?: Pick<Seller, "business_name" | "slug" | "logo_url" | "location" | "email" | "phone" | "status"> | null;
}
