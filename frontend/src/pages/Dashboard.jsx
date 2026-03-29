import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [creating, setCreating] = useState(false);
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
      const { data } = await api.get("/groups/");
      console.log("GROUPS DATA:", data); //debug
      setGroups(data);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
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

        {/* Groups list */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            Loading...
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👥</span>
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
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center mb-3">
                        <span className="text-lg">✈️</span>
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

                    {/* Delete button */}
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      🗑️
                    </button>
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
    </div>
  );
}
