import { useEffect, useState } from "react";
import { supabase, signOut } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/");
      } else {
        setUser(data.session.user);
      }
    });
  }, [navigate]);

  async function testBackend() {
    try {
      const { data } = await api.get("/me");
      setBackendUser(data);
    } catch (err) {
      console.error("Backend error:", err.message);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        {user && (
          <p className="text-sm text-gray-500">Logged in as: {user.email}</p>
        )}
        <button
          onClick={testBackend}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Test backend /me
        </button>
        {backendUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            ✓ Backend says: {backendUser.email}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
