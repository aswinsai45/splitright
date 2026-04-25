import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCurrentUserId(data.session.user.id);
      }
    });
    fetchAll();
  }, [id]);

  async function fetchAll() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      setCurrentUserId(userId);

      const [groupRes, expensesRes, balancesRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/expenses/${id}`),
        api.get(`/balances/${id}`),
      ]);

      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data);

      // find current user's role in this group
      const me = groupRes.data.group_members?.find((m) => m.user_id === userId);
      if (me) setMyRole(me.role);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  async function deleteExpense(expenseId) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  }

  async function copyInviteLink() {
    const inviteToken = group?.invite_token;
    if (!inviteToken) return;
    const link = `${window.location.origin}/join/${inviteToken}`;
    await navigator.clipboard.writeText(link);
    alert("Invite link copied! Share it with your friends.");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  async function removeMember(userId) {
    if (!window.confirm("Remove this member from the group?")) return;
    try {
      await api.delete(`/groups/${id}/members/${userId}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not remove member");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {group?.name}
              </h1>
              {group?.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {group.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              🔗 Invite
            </button>
            <button
              onClick={() => navigate(`/group/${id}/add`)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <span className="text-lg leading-none">+</span>
              Add expense
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
          {["expenses", "balances", "members"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all
                ${
                  activeTab === tab
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {activeTab === "expenses" && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🧾</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No expenses yet.
                </p>
                <button
                  onClick={() => navigate(`/group/${id}/add`)}
                  className="mt-4 text-indigo-500 text-sm hover:underline"
                >
                  Add the first expense
                </button>
              </div>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <button
                    onClick={() =>
                      navigate(`/group/${id}/expense/${expense.id}`)
                    }
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">
                        {expense.category === "food"
                          ? "🍕"
                          : expense.category === "travel"
                            ? "✈️"
                            : expense.category === "accommodation"
                              ? "🏠"
                              : "💸"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {expense.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(expense.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{expense.amount}
                    </p>
                    <button
                      onClick={() =>
                        navigate(`/group/${id}/expense/${expense.id}/edit`)
                      }
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Balances tab */}
        {activeTab === "balances" && (
          <div className="space-y-3">
            {!balances || balances.transactions.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✅</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  All settled up!
                </p>
              </div>
            ) : (
              balances.transactions.map((txn, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{txn.from}</span>
                    <span className="text-gray-400">owes</span>
                    <span className="font-medium">{txn.to}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-500">
                      ₹{txn.amount}
                    </span>
                    <button
                      onClick={() => navigate(`/group/${id}/settle`)}
                      className="text-xs text-indigo-500 hover:underline"
                    >
                      Settle
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Members tab */}
        {activeTab === "members" && (
          <div className="space-y-3">
            {group?.group_members?.map((member) => (
              <div
                key={member.user_id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      member.profiles?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${member.profiles?.display_name || "U"}`
                    }
                    alt="avatar"
                    className="w-9 h-9 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.profiles?.display_name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {member.role}
                    </p>
                  </div>
                </div>

                {/* only show remove button if current user is admin and not looking at themselves */}
                {myRole === "admin" && member.user_id !== currentUserId && (
                  <button
                    onClick={() => removeMember(member.user_id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            {/* invite button inside members tab too */}
            <button
              onClick={copyInviteLink}
              className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all"
            >
              🔗 Copy invite link to add members
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
