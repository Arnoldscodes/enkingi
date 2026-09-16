export interface HeroSlide {
  id: string;
  image_url: string | null;
  headline: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: boolean;
  updated_at: string;
}
