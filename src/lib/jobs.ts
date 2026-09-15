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

export const APPLICATION_STATUSES = [
  { value: "submitted", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "interview", label: "Interview scheduled" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
] as const;

export function applicationStatusLabel(value: string): string {
  return APPLICATION_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export interface JobApplication {
  id: string;
  job_id: string;
  seller_id: string;
  applicant_id: string | null;
  applicant_name: string;
  phone: string;
  email: string;
  gender: string;
  date_of_birth: string;
  location: string;
  motivation: string;
  has_experience: boolean;
  experience: string | null;
  start_date: string | null;
  cv_url: string | null;
  status: string;
  interview_at: string | null;
  interview_note: string | null;
  created_at: string;
  jobs?: { title: string } | null;
}
