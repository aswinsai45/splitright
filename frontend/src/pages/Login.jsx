import { signInWithGoogle } from "../lib/supabase";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { dark, toggleTheme } = useTheme();

  async function handleLogin() {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors duration-200">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
      >
        {dark ? "☀️" : "🌙"}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            SplitRight
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Split expenses. Settle smarter.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Welcome back
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Sign in to manage your group expenses
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-200 disabled:opacity-60 shadow-sm"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-4 h-4"
            />
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>

          <p className="text-center text-gray-400 dark:text-gray-600 text-xs mt-6">
            By signing in you agree to our terms of service
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 dark:text-gray-600 text-xs mt-6">
          Built by @aswinsaiii
        </p>
      </div>
    </div>
  );
}
