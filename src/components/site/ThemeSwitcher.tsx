import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { useT } from "@/lib/i18n";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { lang } = useT();
  const label = lang === "rw" ? "Uburyo bwo kugaragaza" : "Theme";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} title={label}>
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => { if (value === "light" || value === "dark") setTheme(value); }}>
          <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" />{lang === "rw" ? "Urumuri" : "Light"}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" />{lang === "rw" ? "Umwijima" : "Dark"}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}