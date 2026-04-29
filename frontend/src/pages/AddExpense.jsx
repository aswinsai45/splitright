import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import Navbar from "../components/Navbar";
import NLPInput from "../components/NLPInput";
import { supabase } from "../lib/supabase";

export default function AddExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  // guestMembers: extra synthetic member rows added by NLP for non-group participants
  const [guestMembers, setGuestMembers] = useState([]);
  const [guestInputVisible, setGuestInputVisible] = useState(false);
  const [guestInputName, setGuestInputName] = useState("");
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCurrentUserId(data.session.user.id);
        setCurrentUserName(
          data.session.user.user_metadata?.full_name ||
            data.session.user.email ||
            "Me"
        );
      }
    });
    fetchMembers();
  }, [id]);

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

  async function fetchMembers() {
    try {
      const { data } = await api.get(`/groups/${id}`);
      const members = data.group_members || [];
      setMembers(members);
      setForm((f) => ({
        ...f,
        participants: members.map((m) => m.user_id),
      }));
    } catch (err) {
      console.error(err);
    }
  }

  function addGuest() {
    const rawName = guestInputName.trim();
    const name = rawName || `Guest ${guestMembers.length + 1}`;
    const guestId = `guest_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    const newGuest = {
      user_id: guestId,
      profiles: { display_name: name, avatar_url: null },
      isGuest: true,
    };
    setGuestMembers((g) => [...g, newGuest]);
    setForm((f) => ({
      ...f,
      participants: [...f.participants, guestId],
    }));
    setGuestInputName("");
    setGuestInputVisible(false);
  }

  function removeGuest(guestId) {
    setGuestMembers((g) => g.filter((m) => m.user_id !== guestId));
    setForm((f) => ({
      ...f,
      participants: f.participants.filter((id) => id !== guestId),
      custom_splits: Object.fromEntries(
        Object.entries(f.custom_splits).filter(([k]) => k !== guestId)
      ),
    }));
  }

  function handleNLPParsed(parsed) {
    // Merge guest participants into the display member list
    if (parsed.resolvedParticipants && parsed.resolvedParticipants.length > 0) {
      const newGuests = parsed.resolvedParticipants
        .filter((p) => p.isGuest)
        .filter((p) => !guestMembers.find((g) => g.user_id === p.id))
        .map((p) => ({
          user_id: p.id,
          profiles: { display_name: p.display_name, avatar_url: null },
          isGuest: true,
        }));
      if (newGuests.length > 0) setGuestMembers((g) => [...g, ...newGuests]);

      const participantIds = parsed.resolvedParticipants.map((p) => p.id);
      setForm((f) => ({
        ...f,
        paid_by: parsed.paid_by || f.paid_by,
        amount: parsed.amount || f.amount,
        description: parsed.description || f.description,
        category: parsed.category || f.category,
        split_type: parsed.split_type || f.split_type,
        participants: participantIds,
        custom_splits: {},
      }));
    } else {
      setForm((f) => ({
        ...f,
        paid_by: parsed.paid_by || f.paid_by,
        amount: parsed.amount || f.amount,
        description: parsed.description || f.description,
        category: parsed.category || f.category,
        split_type: parsed.split_type || f.split_type,
      }));
    }
  }

  function toggleParticipant(userId) {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(userId)
        ? f.participants.filter((id) => id !== userId)
        : [...f.participants, userId],
    }));
  }

  function getSplitPreview() {
    if (!form.amount || form.participants.length === 0) return {};
    const amount = parseFloat(form.amount);

    if (form.split_type === "equal") {
      const share = amount / form.participants.length;
      return Object.fromEntries(
        form.participants.map((id) => [id, share.toFixed(2)]),
      );
    }

    if (form.split_type === "exact") {
      return form.custom_splits;
    }

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

  async function handleSubmit() {
    if (!form.paid_by || !form.amount || !form.description) return;
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

      await api.post(`/expenses/${id}`, payload);
      navigate(`/group/${id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
            onClick={() => navigate(`/group/${id}`)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add expense
          </h1>
        </div>

        <div className="space-y-5">
          {/* NLP Input */}
          <NLPInput
            groupMembers={members}
            onParsed={handleNLPParsed}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400">or fill manually</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              placeholder="e.g. Dinner at beach shack"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          {/* Amount */}
          <div>
            <label className={labelClass}>Amount (₹)</label>
            <input
              type="number"
              placeholder="0.00"
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

          {/* Participants */}
          {/* Split type selector */}
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
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize
          ${
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

          {/* split-type */}
          <div>
            <label className={labelClass}>Split between</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[...members, ...guestMembers].map((m) => (
                <div key={m.user_id} className="relative group/chip">
                  <button
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
                    {m.isGuest && (
                      <span className="ml-1 text-xs opacity-70">(guest)</span>
                    )}
                  </button>
                  {/* Remove button only for guests */}
                  {m.isGuest && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGuest(m.user_id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              {/* Add guest button / inline input */}
              {guestInputVisible ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={guestInputName}
                    onChange={(e) => setGuestInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addGuest();
                      if (e.key === "Escape") {
                        setGuestInputVisible(false);
                        setGuestInputName("");
                      }
                    }}
                    placeholder="Guest name"
                    className="w-28 px-2 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addGuest}
                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setGuestInputVisible(false); setGuestInputName(""); }}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setGuestInputVisible(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-all"
                >
                  ＋ Add guest
                </button>
              )}
            </div>

            {/* Custom split inputs */}
            {form.participants.length > 0 && form.split_type !== "equal" && (
              <div className="space-y-2 mt-3">
                {form.participants.map((uid) => {
                  const allMembers = [...members, ...guestMembers];
                  const member = allMembers.find((m) => m.user_id === uid);
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

                {/* Validation hint */}
                {form.split_type === "exact" && form.amount && (
                  <div
                    className={`text-xs mt-2 ${isSplitValid() ? "text-green-500" : "text-red-500"}`}
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
                        : `₹${Math.abs(diff).toFixed(2)} ${diff > 0 ? "remaining" : "over total"}`;
                    })()}
                  </div>
                )}

                {form.split_type === "percentage" && (
                  <div
                    className={`text-xs mt-2 ${isSplitValid() ? "text-green-500" : "text-red-500"}`}
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
                  {(parseFloat(form.amount) / form.participants.length).toFixed(
                    2,
                  )}{" "}
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
              !form.description ||
              !isSplitValid()
            }
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 mt-2"
          >
            {loading ? "Adding..." : "Add expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
