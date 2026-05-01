import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import Navbar from "../components/Navbar";

export default function EditExpense() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [groupGuests, setGroupGuests] = useState([]);
  // guestMembers: synthetic guests created locally during edit (or from NLP-like flows)
  const [guestMembers, setGuestMembers] = useState([]);
  const [guestInputVisible, setGuestInputVisible] = useState(false);
  const [guestInputName, setGuestInputName] = useState("");
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
      const [groupRes, guestsRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/groups/${groupId}/guests`),
      ]);
      setMembers(groupRes.data.group_members || []);
      setGroupGuests(guestsRes.data || []);
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
          (data.expense_splits || []).map((s) => [
            s.user_id || s.guest_id,
            s.amount.toString(),
          ]),
        );
      } else if (data.split_type === "percentage") {
        // Back-convert absolute amounts → percentages for the input fields
        const total = parseFloat(data.amount) || 1;
        custom_splits = Object.fromEntries(
          (data.expense_splits || []).map((s) => [
            s.user_id || s.guest_id,
            ((s.amount / total) * 100).toFixed(2),
          ]),
        );
      }

      const participantIds = (data.expense_splits || [])
        .map((s) => s.user_id || s.guest_id)
        .filter(Boolean);

      setForm({
        paid_by: data.paid_by_guest?.id
          ? `guest_uuid:${data.paid_by_guest.id}`
          : data.paid_by,
        amount: data.amount.toString(),
        description: data.description,
        category: data.category,
        split_type: data.split_type,
        participants: participantIds,
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

  // Submit update
  async function handleSubmit() {
    if (!form.paid_by || !form.amount) return;
    if (!isSplitValid()) return;

    setLoading(true);

    try {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Identify guest participants (either existing DB guests or locally-created guests)
      const guestParticipantIds = form.participants.filter(
        (pid) =>
          guestMembers.some((g) => g.user_id === pid) ||
          groupGuests.some((g) => g.id === pid),
      );
      const realParticipantIds = form.participants.filter(
        (pid) => !guestParticipantIds.includes(pid),
      );

      // Create guest records in DB for any locally-created guests that don't yet have a real UUID
      const guestIdMap = {}; // placeholder ID → real DB UUID
      for (const pid of guestParticipantIds) {
        if (groupGuests.some((g) => g.id === pid)) {
          guestIdMap[pid] = pid;
          continue;
        }

        if (uuidRegex.test(pid)) {
          guestIdMap[pid] = pid;
          continue;
        }

        const guestMember = guestMembers.find((g) => g.user_id === pid);
        const name = guestMember?.profiles?.display_name || "Guest";
        const { data: newGuest } = await api.post(`/groups/${groupId}/guests`, {
          display_name: name,
        });
        guestIdMap[pid] = newGuest.id;
        setGuestMembers((prev) =>
          prev.map((g) =>
            g.user_id === pid ? { ...g, user_id: newGuest.id } : g,
          ),
        );
      }

      const resolvedGuestUUIDs = guestParticipantIds.map(
        (pid) => guestIdMap[pid] || pid,
      );

      const payload = {
        paid_by: form.paid_by,
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category,
        split_type: form.split_type,
        participants: realParticipantIds,
        guest_participants: resolvedGuestUUIDs,
      };

      if (form.split_type !== "equal") {
        payload.splits = form.participants.map((id) => {
          const isGuest = guestParticipantIds.includes(id);
          const realGuestId = isGuest ? guestIdMap[id] || id : null;
          return {
            user_id: isGuest ? `guest_uuid:${realGuestId}` : id,
            amount:
              form.split_type === "exact"
                ? parseFloat(form.custom_splits[id] || 0)
                : (parseFloat(form.custom_splits[id] || 0) / 100) *
                  parseFloat(form.amount),
          };
        });
      }

      await api.put(`/expenses/${groupId}/${expenseId}`, payload);
      navigate(`/group/${groupId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      canRemove: true,
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
        Object.entries(f.custom_splits).filter(([k]) => k !== guestId),
      ),
    }));
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
              {groupGuests.length > 0 && (
                <optgroup label="Guests">
                  {groupGuests.map((g) => (
                    <option key={g.id} value={`guest_uuid:${g.id}`}>
                      {g.display_name}
                      {g.assigned_to ? " (assigned)" : " (guest)"}
                    </option>
                  ))}
                </optgroup>
              )}
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
              <option value="other">Other</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="accommodation">Accommodation</option>
              <option value="utilities">Utilities</option>
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
                    ? "Equal"
                    : type === "exact"
                      ? "Exact"
                      : "Percent"}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className={labelClass}>Split between</label>

            <div className="flex flex-wrap gap-2 mb-3">
              {[
                ...members,
                ...groupGuests.map((g) => ({
                  user_id: g.id,
                  profiles: {
                    display_name: g.display_name,
                    avatar_url: g.profiles?.avatar_url || null,
                  },
                  isGuest: true,
                  canRemove: false,
                })),
                ...guestMembers.map((g) => ({ ...g, canRemove: true })),
              ].map((m) => (
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
                  {m.isGuest && (
                    <span className="ml-1 text-xs opacity-70">(guest)</span>
                  )}
                  {m.isGuest && m.canRemove && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGuest(m.user_id);
                      }}
                      className="ml-2 w-4 h-4 rounded-full bg-red-500 text-white text-xs leading-none flex items-center justify-center"
                      role="button"
                      aria-label="Remove guest"
                    >
                      ×
                    </span>
                  )}
                </button>
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
                    onClick={() => {
                      setGuestInputVisible(false);
                      setGuestInputName("");
                    }}
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

            {/* Custom splits */}
            {form.participants.length > 0 && form.split_type !== "equal" && (
              <div className="space-y-2 mt-3">
                {form.participants.map((uid) => {
                  const allMembers = [
                    ...members,
                    ...groupGuests.map((g) => ({
                      user_id: g.id,
                      profiles: {
                        display_name: g.display_name,
                        avatar_url: g.profiles?.avatar_url || null,
                      },
                      isGuest: true,
                    })),
                    ...guestMembers,
                  ];
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
                        : `₹${Math.abs(diff)
                            .toFixed(2)
                            .toFixed(2)} ${
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
                  {(parseFloat(form.amount) / form.participants.length)
                    .toFixed(2)
                    .toFixed(2)}{" "}
                  each
                </p>
              )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              loading || !form.paid_by || !form.amount || !isSplitValid()
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
