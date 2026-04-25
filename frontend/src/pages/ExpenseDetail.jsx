import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import Navbar from "../components/Navbar";

const CATEGORY_EMOJI = {
  food: "🍕",
  travel: "✈️",
  accommodation: "🏠",
  utilities: "💡",
  other: "💸",
};

const SPLIT_LABEL = {
  equal: "⚖️ Equal split",
  exact: "💰 Exact amounts",
  percentage: "% Percentage split",
};

export default function ExpenseDetail() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExpense();
  }, [groupId, expenseId]);

  async function fetchExpense() {
    try {
      const { data } = await api.get(`/expenses/${groupId}/${expenseId}`);
      setExpense(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${expenseId}`);
      navigate(`/group/${groupId}`);
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">Expense not found.</p>
        </div>
      </div>
    );
  }

  const totalSplits = expense.expense_splits?.reduce(
    (sum, s) => sum + parseFloat(s.amount),
    0
  ) ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Expense detail
          </h1>
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-4">
          {/* Icon + title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {CATEGORY_EMOJI[expense.category] ?? "💸"}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                {expense.description}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                {expense.category}
              </p>
            </div>
          </div>

          {/* Amount + meta */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Total amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ₹{parseFloat(expense.amount).toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Paid by</p>
              <div className="flex items-center gap-2">
                <img
                  src={
                    expense.profiles?.avatar_url ||
                    `https://ui-avatars.com/api/?name=${expense.profiles?.display_name || "U"}`
                  }
                  className="w-5 h-5 rounded-full"
                  alt="payer"
                />
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {expense.profiles?.display_name || "Unknown"}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Split type</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {SPLIT_LABEL[expense.split_type] ?? expense.split_type}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(expense.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Split breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Split between {expense.expense_splits?.length ?? 0} people
            </p>
            <div className="space-y-2">
              {expense.expense_splits?.map((split) => {
                const pct =
                  totalSplits > 0
                    ? ((parseFloat(split.amount) / parseFloat(expense.amount)) * 100).toFixed(1)
                    : "0.0";
                return (
                  <div
                    key={split.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800"
                  >
                    <img
                      src={
                        split.profiles?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${split.profiles?.display_name || "U"}`
                      }
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      alt="participant"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {split.profiles?.display_name || "Unknown"}
                      </p>
                      <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(split.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">{pct}%</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        split.is_settled
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                          : "bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400"
                      }`}
                    >
                      {split.is_settled ? "Settled" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() =>
              navigate(`/group/${groupId}/expense/${expenseId}/edit`)
            }
            className="flex-1 py-3 rounded-xl border border-indigo-500 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium text-sm transition-all"
          >
            ✏️ Edit expense
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl border border-red-400 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm transition-all disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "🗑️ Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
