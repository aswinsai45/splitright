import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";

export default function JoinGroup() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        // already logged in — auto trigger join check
        fetchGroupInfo();
      } else {
        fetchGroupInfo();
      }
    });
  }, [token]);

  async function fetchGroupInfo() {
    try {
      const { data } = await api.get(`/groups/join/${token}`);
      setGroup(data);

      // if already logged in, auto join
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const res = await api.post(`/groups/join/${token}`);
        navigate(`/group/${res.data.group_id}`);
      }
    } catch (err) {
      if (err.response?.data?.detail === "Already a member of this group") {
        const { data } = await api.get(`/groups/join/${token}`);
        navigate(`/group/${data.id}`);
      } else {
        setError("This invite link is invalid or has expired.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/join/${token}`,
        },
      });
      return;
    }
    setJoining(true);
    try {
      const { data } = await api.post(`/groups/join/${token}`);
      navigate(`/group/${data.group_id}`);
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (msg === "Already a member of this group") {
        navigate(`/group/${group.id}`);
      } else {
        setError(msg || "Something went wrong.");
      }
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading invite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            SplitRight
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
          {error ? (
            <div className="text-center">
              <span className="text-4xl">❌</span>
              <p className="text-gray-900 dark:text-white font-semibold mt-4">
                Invalid invite
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {error}
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                You've been invited to join
              </p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {group?.name}
              </h2>
              {group?.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  {group.description}
                </p>
              )}

              {!session && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
                  You need to sign in first. We'll bring you back here after.
                </p>
              )}

              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
              >
                {joining
                  ? "Joining..."
                  : session
                    ? `Join ${group?.name}`
                    : "Sign in to join"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
