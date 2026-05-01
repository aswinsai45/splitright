import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import { IconUsers, IconHandCoins } from "../components/icons";
import Footer from "../components/Footer";

export default function JoinGroup() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  // Guest claim state — shown after joining
  const [joinedGroupId, setJoinedGroupId] = useState(null);
  const [unassignedGuests, setUnassignedGuests] = useState([]);
  const [claimingGuest, setClaimingGuest] = useState(null);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      fetchGroupInfo();
    });
  }, [token]);

  async function fetchGroupInfo() {
    try {
      const { data } = await api.get(`/groups/join/${token}`);
      setGroup(data);

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const res = await api.post(`/groups/join/${token}`);
        await afterJoin(res.data.group_id);
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

  async function afterJoin(groupId) {
    // Fetch unassigned guests for this group — offer to claim one
    try {
      const { data: guests } = await api.get(`/groups/${groupId}/guests`);
      const unassigned = (guests || []).filter((g) => !g.assigned_to);
      if (unassigned.length > 0) {
        setJoinedGroupId(groupId);
        setUnassignedGuests(unassigned);
        setShowGuestPrompt(true);
      } else {
        navigate(`/group/${groupId}`);
      }
    } catch {
      navigate(`/group/${groupId}`);
    }
  }

  async function handleJoin() {
    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/join/${token}` },
      });
      return;
    }
    setJoining(true);
    try {
      const { data } = await api.post(`/groups/join/${token}`);
      await afterJoin(data.group_id);
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

  async function claimGuest(guestId) {
    setClaimingGuest(guestId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      await api.put(`/groups/${joinedGroupId}/guests/${guestId}/assign`, {
        user_id: userId,
      });
      navigate(`/group/${joinedGroupId}`);
    } catch {
      navigate(`/group/${joinedGroupId}`);
    } finally {
      setClaimingGuest(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading invite...</p>
      </div>
    );
  }

  // Guest claim prompt — shown after joining if unassigned guests exist
  if (showGuestPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center px-4 transition-colors duration-200">
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-4 text-amber-700 dark:text-amber-200">
              <IconHandCoins className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Are you one of these guests?
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Some expenses were split with placeholder guests. Claim yourself
              to have your share tracked.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-3">
            {unassignedGuests.map((guest) => (
              <button
                key={guest.id}
                onClick={() => claimGuest(guest.id)}
                disabled={!!claimingGuest}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                    {(guest.display_name || "G").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {guest.display_name}
                  </span>
                </div>
                <span className="text-xs text-indigo-500 font-medium">
                  {claimingGuest === guest.id ? "Claiming…" : "That's me →"}
                </span>
              </button>
            ))}

            <button
              onClick={() => navigate(`/group/${joinedGroupId}`)}
              className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2 transition-colors"
            >
              None of these — skip
            </button>
          </div>
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center px-4 transition-colors duration-200">
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <IconHandCoins className="w-14 h-14 mx-auto mb-4 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              SplitRight
            </h1>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
            {error ? (
              <div className="text-center">
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
      <Footer />
    </div>
  );
}
