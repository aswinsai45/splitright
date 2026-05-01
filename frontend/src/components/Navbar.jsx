import { useTheme } from "../context/useTheme";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { IconMoon, IconSun, IconHandCoins } from "./icons";

export default function Navbar() {
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900">
            <IconHandCoins className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-sm tracking-tight">
            SplitRight
          </span>
        </div>
        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
              <IconSun className="w-5 h-5" />
            ) : (
              <IconMoon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
