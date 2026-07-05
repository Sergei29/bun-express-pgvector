"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";

interface Props {
  [x: string]: unknown;
}

const Header = ({}: Props) => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center justify-between p-4 max-w-7xl mx-auto border-b">
      <h1 className="text-2xl font-bold">Books Club</h1>
      <nav></nav>
      <div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </div>
    </div>
  );
};

export default Header;
