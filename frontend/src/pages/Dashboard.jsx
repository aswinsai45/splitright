import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import Navbar from "../components/Navbar";
import { IconRupeeBadge, IconUsers, IconTrash } from "../components/icons";
import Footer from "../components/Footer";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/");
      } else {
        setUser(data.session.user);
        fetchGroups();
      }
    });
  }, []);

  async function fetchGroups() {
    try {
      const [groupsRes, summaryRes] = await Promise.all([
        api.get("/groups/"),
        api.get("/balances/"),
      ]);
      setGroups(groupsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await api.post("/groups/", {
        name: newGroupName,
        description: newGroupDesc,
      });
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }
  async function deleteGroup(groupId) {
    if (!window.confirm("Delete this group? This cannot be undone.")) return;
    try {
      await api.delete(`/groups/${groupId}`);
      fetchGroups();
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Your groups
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <span className="text-lg leading-none">+</span>
            New group
          </button>
        </div>

        {/* Create group modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create a group
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Group name e.g. Goa Trip"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={createGroup}
                  disabled={creating || !newGroupName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                You are owed
              </p>
              <p className="text-2xl font-bold text-green-500">
                ₹{Number(summary.total_owed || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                across all groups
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                You owe
              </p>
              <p className="text-2xl font-bold text-red-500">
                ₹{Number(summary.total_owing || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                across all groups
              </p>
            </div>

            <div
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-5
      ${
        summary.net >= 0
          ? "border-green-200 dark:border-green-800"
          : "border-red-200 dark:border-red-800"
      }`}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Net balance
              </p>
              <p
                className={`text-2xl font-bold
        ${summary.net >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {Number(summary.net || 0) >= 0 ? "+" : ""}₹{Number(summary.net || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                {summary.net >= 0 ? "overall you are owed" : "overall you owe"}
              </p>
            </div>
          </div>
        )}

        {/* Per group breakdown */}
        {summary?.groups?.length > 0 && (
          <div className="mb-8 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Breakdown by group
            </p>
            {summary.groups.map((g) => (
              <div
                key={g.group_id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {g.group_name}
                </p>
                <div className="flex items-center gap-3">
                  {g.owed > 0 && (
                    <span className="text-xs text-green-500 font-medium">
                      +₹{g.owed.toFixed(2)}
                    </span>
                  )}
                  {g.owing > 0 && (
                    <span className="text-xs text-red-500 font-medium">
                      -₹{g.owing.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groups list */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Loading...
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-300">
              <IconUsers className="w-7 h-7" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No groups yet. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((item) => {
              const group = item.groups;
              if (!group) return null;
              // determine if current user is admin for this group
              const isAdmin = (() => {
                // Be defensive: the API may return roles under different keys/shapes.
                const userId = user?.id;
                if (!userId) return false;

                // 1) Check explicit membership list on the group
                if (group && Array.isArray(group.group_members)) {
                  const me = group.group_members.find(
                    (m) => m.user_id === userId || m.id === userId,
                  );
                  if (me && me.role) {
                    const r = String(me.role).toLowerCase();
                    if (
                      r === "admin" ||
                      r === "owner" ||
                      r === "creator" ||
                      r === "administrator"
                    )
                      return true;
                  }
                }

                // 2) Some endpoints return the membership on the item wrapper
                if (item && (item.role || item.my_role || item.user_role)) {
                  const candidate = item.role || item.my_role || item.user_role;
                  if (String(candidate).toLowerCase() === "admin") return true;
                }

                // 3) Some group objects include flags or owner fields
                if (group) {
                  if (group.owner_id && group.owner_id === userId) return true;
                  if (group.created_by && group.created_by === userId)
                    return true;
                  if (group.is_admin || group.isOwner) return true;
                  if (
                    group.my_role &&
                    String(group.my_role).toLowerCase() === "admin"
                  )
                    return true;
                }

                // 4) Some APIs include an `admins` array
                if (group && Array.isArray(group.admins)) {
                  if (
                    group.admins.includes(userId) ||
                    group.admins.includes(String(userId))
                  )
                    return true;
                }

                return false;
              })();
              return (
                <div
                  key={item.group_id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() => navigate(`/group/${group.id}`)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-300">
                        <IconRupeeBadge className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                          {group.description}
                        </p>
                      )}
                    </div>

                    {/* Delete button (only visible to admins) */}
                    {isAdmin && (
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        aria-label="Delete group"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">
                    {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
