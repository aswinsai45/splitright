import { signInWithGoogle } from "../lib/supabase";

export default function Login() {
  async function handleLogin() {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-md flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold text-gray-800">SplitRight</h1>
        <p className="text-gray-500 text-sm">Split expenses. Settle smarter.</p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition text-sm font-medium text-gray-700"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-4 h-4"
          />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
