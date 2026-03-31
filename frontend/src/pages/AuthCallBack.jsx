import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const pendingInvite = localStorage.getItem("pending_invite");
        if (pendingInvite) {
          localStorage.removeItem("pending_invite");
          navigate(`/join/${pendingInvite}`);
        } else {
          navigate("/dashboard");
        }
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <p className="text-gray-400 text-sm">Signing you in...</p>
    </div>
  );
}
