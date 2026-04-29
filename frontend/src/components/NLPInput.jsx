import { useState } from "react";
import api from "../lib/api";

/**
 * Resolve participant names returned by the LLM into structured participant objects.
 *
 * Rules:
 *  - "I" / "me" → current logged-in user
 *  - A name that fuzzy-matches a group member's display_name → that member
 *  - An unrecognised name → { id: "guest_<name>", display_name: <name>, isGuest: true }
 *  - If only participant_count was given (no names), generate guest slots for the
 *    missing people (current user fills slot 1, rest are guest_1, guest_2…)
 */
function resolveParticipants({ participantNames, participantCount, currentUserId, currentUserName, groupMembers }) {
  const resolved = [];

  function matchMember(name) {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    if (lower === "i" || lower === "me") {
      return { id: currentUserId, display_name: currentUserName, isGuest: false };
    }
    const found = groupMembers.find(
      (m) => m.profiles?.display_name?.toLowerCase() === lower
    );
    if (found) return { id: found.user_id, display_name: found.profiles.display_name, isGuest: false };
    // Unknown name → named guest
    return { id: `guest_${lower.replace(/\s+/g, "_")}`, display_name: name, isGuest: true };
  }

  if (participantNames && participantNames.length > 0) {
    for (const name of participantNames) {
      const r = matchMember(name);
      if (r && !resolved.find((x) => x.id === r.id)) resolved.push(r);
    }
  } else if (participantCount && participantCount > 0) {
    // Slot 0: current user
    resolved.push({ id: currentUserId, display_name: currentUserName, isGuest: false });
    // Remaining slots: guest_1, guest_2, ...
    for (let i = 1; i < participantCount; i++) {
      resolved.push({ id: `guest_${i}`, display_name: `Guest ${i}`, isGuest: true });
    }
  }

  return resolved;
}

export default function NLPInput({ groupMembers, onParsed, currentUserId, currentUserName }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post("/nlp/parse-expense", { text });

      // Resolve payer
      let payerId = "";
      if (data.payer_name) {
        const pn = data.payer_name.toLowerCase().trim();
        if (pn === "i" || pn === "me") {
          payerId = currentUserId || "";
        } else {
          const found = groupMembers.find(
            (m) => m.profiles?.display_name?.toLowerCase() === pn
          );
          payerId = found?.user_id || "";
        }
      }

      // Resolve participants
      const resolved = resolveParticipants({
        participantNames: data.participant_names,
        participantCount: data.participant_count,
        currentUserId,
        currentUserName,
        groupMembers,
      });

      onParsed({
        paid_by: payerId,
        amount: data.amount,
        description: data.description,
        category: data.category || "other",
        split_type: data.split_type || "equal",
        resolvedParticipants: resolved, // array of { id, display_name, isGuest }
      });

      setText("");
    } catch (err) {
      setError("Could not parse that. Try rephrasing or fill manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          Natural language input
        </p>
      </div>
      <p className="text-xs text-indigo-600 dark:text-indigo-400">
        Try: "I paid 400 for dinner in 3 ways" or "Rahul paid 800 for Uber with Sam and Priya"
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder="Describe the expense..."
          className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? "..." : "Parse"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
