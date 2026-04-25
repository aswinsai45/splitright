import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function EditExpense() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingExpense, setFetchingExpense] = useState(true);

  const [form, setForm] = useState({
    paid_by: "",
    amount: "",
    description: "",
    category: "other",
    split_type: "equal",
    participants: [],
    custom_splits: {},
  });

  useEffect(() => {
    fetchMembers();
    fetchExpense();
  }, [groupId, expenseId]);

  // Fetch group members
  async function fetchMembers() {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setMembers(data.group_members || []);
    } catch (err) {
      console.error(err);
    }
  }

  // Fetch existing expense
  async function fetchExpense() {
    try {
      const { data } = await api.get(`/expenses/${groupId}/${expenseId}`);

      let custom_splits = {};
      if (data.split_type === "exact") {
        custom_splits = Object.fromEntries(
          data.expense_splits.map((s) => [s.user_id, s.amount.toString()]),
        );
      } else if (data.split_type === "percentage") {
        // Back-convert absolute amounts → percentages for the input fields
        const total = parseFloat(data.amount) || 1;
        custom_splits = Object.fromEntries(
          data.expense_splits.map((s) => [
            s.user_id,
            ((s.amount / total) * 100).toFixed(2),
          ]),
        );
      }

      setForm({
        paid_by: data.paid_by,
        amount: data.amount.toString(),
        description: data.description,
        category: data.category,
        split_type: data.split_type,
        participants: data.expense_splits.map((s) => s.user_id),
        custom_splits,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingExpense(false);
    }
  }

  // Validation
  const isSplitValid = () => {
    if (form.split_type === "equal") return form.participants.length > 0;

    if (form.split_type === "exact") {
      const total = form.participants.reduce((sum, id) => {
        return sum + parseFloat(form.custom_splits[id] || 0);
      }, 0);
      return Math.abs(total - parseFloat(form.amount || 0)) < 0.01;
    }

    if (form.split_type === "percentage") {
      const total = form.participants.reduce((sum, id) => {
        return sum + parseFloat(form.custom_splits[id] || 0);
      }, 0);
      return Math.abs(total - 100) < 0.01;
    }

    return false;
  };

  // Toggle participants
  function toggleParticipant(userId) {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(userId)
        ? f.participants.filter((id) => id !== userId)
        : [...f.participants, userId],
    }));
  }

  // Split preview (equal only; exact/percentage use custom_splits directly)
  function getSplitPreview() {
    if (!form.amount || form.participants.length === 0) return {};
    const amount = parseFloat(form.amount);
    if (form.split_type === "equal") {
      const share = amount / form.participants.length;
      return Object.fromEntries(
        form.participants.map((id) => [id, share.toFixed(2)]),
      );
    }
    if (form.split_type === "exact") return form.custom_splits;
    if (form.split_type === "percentage") {
      const preview = {};
      for (const id of form.participants) {
        const pct = parseFloat(form.custom_splits[id] || 0);
        preview[id] = ((pct / 100) * amount).toFixed(2);
      }
      return preview;
    }
    return {};
  }

  // Submit update
  async function handleSubmit() {
    if (!form.paid_by || !form.amount) return;
    if (!isSplitValid()) return;

    setLoading(true);

    try {
      const payload = {
        paid_by: form.paid_by,
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category,
        split_type: form.split_type,
        participants: form.participants,
      };

      if (form.split_type !== "equal") {
        payload.splits = form.participants.map((id) => ({
          user_id: id,
          amount:
            form.split_type === "exact"
              ? parseFloat(form.custom_splits[id] || 0)
              : (parseFloat(form.custom_splits[id] || 0) / 100) *
                parseFloat(form.amount),
        }));
      }

      await api.put(`/expenses/${groupId}/${expenseId}`, payload);
      navigate(`/group/${groupId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (fetchingExpense) {
    return <div className="p-6 text-center">Loading expense...</div>;
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const labelClass =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit expense
          </h1>
        </div>

        <div className="space-y-5">
          {/* Description — read-only */}
          <div>
            <label className={labelClass}>Description</label>
            <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2 select-none cursor-default">
              <span>🔒</span>
              <span>{form.description}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className={labelClass}>Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          {/* Paid by */}
          <div>
            <label className={labelClass}>Paid by</label>
            <select
              value={form.paid_by}
              onChange={(e) =>
                setForm((f) => ({ ...f, paid_by: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Select who paid</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.display_name || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className={inputClass}
            >
              <option value="other">Other 💸</option>
              <option value="food">Food 🍕</option>
              <option value="travel">Travel ✈️</option>
              <option value="accommodation">Accommodation 🏠</option>
              <option value="utilities">Utilities 💡</option>
            </select>
          </div>

          {/* Split Type */}
          <div>
            <label className={labelClass}>Split type</label>
            <div className="flex gap-2">
              {["equal", "exact", "percentage"].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      split_type: type,
                      custom_splits: {},
                    }))
                  }
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                    form.split_type === type
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {type === "equal"
                    ? "⚖️ Equal"
                    : type === "exact"
                      ? "💰 Exact"
                      : "% Percent"}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className={labelClass}>Split between</label>

            <div className="flex flex-wrap gap-2 mb-3">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => toggleParticipant(m.user_id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    form.participants.includes(m.user_id)
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <img
                    src={
                      m.profiles?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${m.profiles?.display_name || "U"}`
                    }
                    className="w-4 h-4 rounded-full"
                  />
                  {m.profiles?.display_name || "Unknown"}
                </button>
              ))}
            </div>

            {/* Custom splits */}
            {form.participants.length > 0 && form.split_type !== "equal" && (
              <div className="space-y-2 mt-3">
                {form.participants.map((uid) => {
                  const member = members.find((m) => m.user_id === uid);
                  return (
                    <div key={uid} className="flex items-center gap-3">
                      <img
                        src={
                          member?.profiles?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${member?.profiles?.display_name || "U"}`
                        }
                        className="w-7 h-7 rounded-full"
                      />
                      <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {member?.profiles?.display_name || "Unknown"}
                      </p>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="0"
                          value={form.custom_splits[uid] || ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              custom_splits: {
                                ...f.custom_splits,
                                [uid]: e.target.value,
                              },
                            }))
                          }
                          className="w-24 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                        />
                        <span className="text-sm text-gray-400">
                          {form.split_type === "percentage" ? "%" : "₹"}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Validation hint — exact */}
                {form.split_type === "exact" && form.amount && (
                  <div
                    className={`text-xs mt-2 ${
                      isSplitValid() ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {(() => {
                      const total = form.participants.reduce(
                        (sum, id) =>
                          sum + parseFloat(form.custom_splits[id] || 0),
                        0,
                      );
                      const diff = parseFloat(form.amount) - total;
                      return isSplitValid()
                        ? "✓ Splits add up correctly"
                        : `₹${Math.abs(diff).toFixed(2)} ${
                            diff > 0 ? "remaining" : "over total"
                          }`;
                    })()}
                  </div>
                )}

                {/* Validation hint — percentage */}
                {form.split_type === "percentage" && (
                  <div
                    className={`text-xs mt-2 ${
                      isSplitValid() ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {(() => {
                      const total = form.participants.reduce(
                        (sum, id) =>
                          sum + parseFloat(form.custom_splits[id] || 0),
                        0,
                      );
                      return isSplitValid()
                        ? "✓ Percentages add up to 100%"
                        : `${total.toFixed(1)}% of 100% assigned`;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Equal split preview */}
            {form.split_type === "equal" &&
              form.participants.length > 0 &&
              form.amount && (
                <p className="text-xs text-gray-400 mt-2">
                  ₹
                  {(
                    parseFloat(form.amount) / form.participants.length
                  ).toFixed(2)}{" "}
                  each
                </p>
              )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              !form.paid_by ||
              !form.amount ||
              !isSplitValid()
            }
            className="w-full py-3 bg-indigo-600 text-white rounded-xl disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
