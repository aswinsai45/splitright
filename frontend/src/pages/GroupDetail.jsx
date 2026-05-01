import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import Navbar from "../components/Navbar";
import {
  IconLink,
  IconCheckCircle,
  IconPencil,
  IconRupeeBadge,
  IconTrash,
  IconUsers,
} from "../components/icons";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [assigningGuest, setAssigningGuest] = useState(null); // guest id being assigned
  const [expandedExpenseIds, setExpandedExpenseIds] = useState(() => new Set());

  function toggleExpenseDetails(expenseId) {
    setExpandedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(expenseId)) next.delete(expenseId);
      else next.add(expenseId);
      return next;
    });
  }

  function displayNameForSplit(split) {
    const name =
      split?.profiles?.display_name ||
      split?.group_guest?.assigned_profile?.display_name ||
      split?.group_guest?.display_name ||
      "Unknown";
    const isUnassignedGuest =
      !!split?.group_guest && !split?.group_guest?.assigned_to;
    return isUnassignedGuest ? `${name} (unassigned guest)` : name;
  }

  function displayNameForPayer(expense) {
    const name =
      expense?.profiles?.display_name ||
      expense?.paid_by_guest?.assigned_profile?.display_name ||
      expense?.paid_by_guest?.display_name ||
      "Unknown";
    const isUnassignedGuest =
      !!expense?.paid_by_guest && !expense?.paid_by_guest?.assigned_to;
    return isUnassignedGuest ? `${name} (unassigned guest)` : name;
  }

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

      const [groupRes, expensesRes, balancesRes, guestsRes] = await Promise.all(
        [
          api.get(`/groups/${id}`),
          api.get(`/expenses/${id}`),
          api.get(`/balances/${id}`),
          api.get(`/groups/${id}/guests`),
        ],
      );

      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data);
      setGuests(guestsRes.data || []);

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

  async function assignGuest(guestId, userId) {
    setAssigningGuest(guestId);
    try {
      await api.put(`/groups/${id}/guests/${guestId}/assign`, {
        user_id: userId,
      });
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningGuest(null);
    }
  }

  async function deleteGuest(guestId) {
    if (!window.confirm("Remove this guest?")) return;
    try {
      await api.delete(`/groups/${id}/guests/${guestId}`);
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
              <IconLink className="w-4 h-4" />
              Invite
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
          {["expenses", "balances", "members", "guests"].map((tab) => (
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
              {tab === "guests" &&
                guests.filter((g) => !g.assigned_to).length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs bg-amber-400 text-white rounded-full">
                    {guests.filter((g) => !g.assigned_to).length}
                  </span>
                )}
            </button>
          ))}
        </div>

        {/* Expenses tab */}
        {activeTab === "expenses" && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-300">
                  <IconRupeeBadge className="w-7 h-7" />
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
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() =>
                        navigate(`/group/${id}/expense/${expense.id}`)
                      }
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-300">
                        <IconRupeeBadge className="w-5 h-5" />
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
                        onClick={() => toggleExpenseDetails(expense.id)}
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        {expandedExpenseIds.has(expense.id)
                          ? "Hide"
                          : "Details"}
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/group/${id}/expense/${expense.id}/edit`)
                        }
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-sm"
                        aria-label="Edit expense"
                      >
                        <IconPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        aria-label="Delete expense"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedExpenseIds.has(expense.id) && (
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Paid by{" "}
                        <span className="font-medium">
                          {displayNameForPayer(expense)}
                        </span>
                      </p>
                      <div className="space-y-1.5">
                        {(expense.expense_splits || []).map((s) => {
                          const debtor = displayNameForSplit(s);
                          const payer = displayNameForPayer(expense);
                          const amount = parseFloat(s.amount || 0)
                            .toFixed(2)
                            .toFixed(2);
                          const owes =
                            (s.user_id && s.user_id === expense.paid_by) ||
                            (s.guest_id &&
                              s.guest_id === expense.paid_by_guest_id);
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-gray-900 dark:text-white truncate">
                                  {debtor}
                                  {!owes && (
                                    <span className="text-gray-400">
                                      {" "}
                                      owes {payer}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  ₹{amount}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    s.is_settled
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400"
                                  }`}
                                >
                                  {s.is_settled ? "Settled" : "Pending"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                  <IconCheckCircle className="w-7 h-7" />
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
              <span className="inline-flex items-center justify-center gap-2">
                <IconLink className="w-4 h-4" />
                Copy invite link to add members
              </span>
            </button>
          </div>
        )}
        {/* Guests tab */}
        {activeTab === "guests" && (
          <div className="space-y-3">
            {guests.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-300">
                  <IconUsers className="w-6 h-6" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No guests added yet.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Guests are added when you split an expense with unnamed
                  people.
                </p>
              </div>
            ) : (
              guests.map((guest) => (
                <div
                  key={guest.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-xs font-semibold text-amber-700 dark:text-amber-200">
                        {(guest.display_name || "G").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {guest.display_name}
                        </p>
                        {guest.assigned_to ? (
                          <p className="text-xs text-green-500 mt-0.5">
                            ✓ Assigned to{" "}
                            {guest.profiles?.display_name || "a member"}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-500 mt-0.5">
                            ⏳ Unassigned — splits pending
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => deleteGuest(guest.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Assignment selector */}
                  {!guest.assigned_to && (
                    <div className="mt-3 flex gap-2">
                      <select
                        defaultValue=""
                        disabled={assigningGuest === guest.id}
                        onChange={(e) => {
                          if (e.target.value)
                            assignGuest(guest.id, e.target.value);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="" disabled>
                          {assigningGuest === guest.id
                            ? "Assigning…"
                            : "Assign to a group member…"}
                        </option>
                        {group?.group_members?.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.profiles?.display_name || "Unknown"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
