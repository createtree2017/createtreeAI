import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md text-neutral-200 hover:text-white hover:bg-neutral-800">
          {theme === "light" ? (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          ) : theme === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Palette className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem] mt-1">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={`flex items-center ${theme === "light" ? "bg-neutral-100 dark:bg-neutral-700" : ""}`}
        >
          <Sun className="h-4 w-4 mr-2" />
          <span>라이트모드</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={`flex items-center ${theme === "dark" ? "bg-neutral-100 dark:bg-neutral-700" : ""}`}
        >
          <Moon className="h-4 w-4 mr-2" />
          <span>다크모드</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("pastel")}
          className={`flex items-center ${theme === "pastel" ? "bg-neutral-100 dark:bg-neutral-700" : ""}`}
        >
          <Palette className="h-4 w-4 mr-2" />
          <span>파스텔모드</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}