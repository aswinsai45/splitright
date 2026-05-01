import React, { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

export default function HowItWorksModal({ isOpen, onClose }) {
  const [expandedSection, setExpandedSection] = useState("what");

  if (!isOpen) return null;

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">How SplitRight Works</h2>
          <button
            onClick={onClose}
            className="hover:bg-blue-500/30 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* What is SplitRight */}
          <Section
            title="💡 What is SplitRight?"
            expanded={expandedSection === "what"}
            onClick={() => toggleSection("what")}
          >
            <p className="text-slate-700 dark:text-slate-300 mb-3">
              <strong>SplitRight</strong> is an AI-powered expense management and
              bill-splitting app designed for groups, roommates, friends, and
              families. Instead of manually calculating who owes whom, SplitRight
              automates the entire process using intelligent algorithms.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Use Case:</strong> You and 3 friends go out for dinner.
                One person pays $120 for everyone. Later, someone buys groceries
                for $50 that benefits 2 people. SplitRight instantly calculates
                who owes what—no spreadsheets, no confusion.
              </p>
            </div>
          </Section>

          {/* Key Features */}
          <Section
            title="🚀 Key Features"
            expanded={expandedSection === "features"}
            onClick={() => toggleSection("features")}
          >
            <div className="space-y-3">
              <FeatureItem
                icon="🤖"
                title="AI-Powered Expense Parsing"
                desc='Type "3 pizzas, Alice paid $45, split 3 ways" and the AI understands it. No manual data entry.'
              />
              <FeatureItem
                icon="👥"
                title="Group Management"
                desc="Create groups for roommates, trips, events. Invite friends via unique join tokens."
              />
              <FeatureItem
                icon="💰"
                title="Smart Bill Splitting"
                desc="Split by equal amount, percentage, or custom amounts. Support for custom split types."
              />
              <FeatureItem
                icon="⚡"
                title="Debt Minimization"
                desc="Our algorithm minimizes the number of transactions needed to settle up. Fewer payments, less complexity."
              />
              <FeatureItem
                icon="📊"
                title="Real-Time Balances"
                desc="See who owes whom instantly. Know your balance in each group at a glance."
              />
              <FeatureItem
                icon="🔐"
                title="Secure Authentication"
                desc="Google OAuth login. Your data is safe in Supabase PostgreSQL."
              />
            </div>
          </Section>

          {/* Example Walkthrough */}
          <Section
            title="📖 Example: Friends' Road Trip"
            expanded={expandedSection === "example"}
            onClick={() => toggleSection("example")}
          >
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-3">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Step 1: Create Group
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Alice creates "Vegas Trip 2024" with 4 members: Alice, Bob,
                  Charlie, Diana
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Step 2: Add Expenses
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mt-1">
                  <li>
                    • Bob books hotel for $800, split equally among 4 people
                  </li>
                  <li>• Alice pays for dinner $120, split among 3 (not Diana)</li>
                  <li>
                    • Charlie buys gas $60, split equally among 4 people
                  </li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Step 3: View Balances
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  App calculates: Alice is owed $40, Bob is owed $20, Charlie
                  owes $50, Diana owes $10
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Step 4: Minimize Debt
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Instead of 4 separate payments, our algorithm finds 2 optimal
                  payments: Charlie → Alice ($40), Diana → Bob ($10)
                </p>
              </div>
            </div>
          </Section>

          {/* Debt Minimization Algorithm */}
          <Section
            title="⚙️ Debt Minimization Algorithm"
            expanded={expandedSection === "algo"}
            onClick={() => toggleSection("algo")}
          >
            <div className="space-y-4">
              <p className="text-slate-700 dark:text-slate-300 text-sm">
                SplitRight uses a <strong>two-heap greedy algorithm</strong> to
                minimize the number of transactions needed to settle all debts.
              </p>

              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg font-mono text-xs">
                <pre className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 overflow-x-auto">
{`Algorithm: Minimize Debt Transactions

Input: Dictionary of member balances
  {
    "Alice": 40,    // Owed $40
    "Bob": 20,      // Owed $20
    "Charlie": -50, // Owes $50
    "Diana": -10    // Owes $10
  }

Process:
1. Separate members into TWO heaps:
   - Debtors heap (negative): [Charlie(-50), Diana(-10)]
   - Creditors heap (positive): [Alice(40), Bob(20)]

2. While both heaps have members:
   - Get the largest debtor: Charlie (-50)
   - Get the largest creditor: Alice (40)
   - Create transaction: min(abs(-50), 40) = $40
     → Charlie pays Alice $40
   - Update balances:
     Charlie: -50 + 40 = -10
     Alice: 40 - 40 = 0 (remove)
   - Re-heap (heapify)

3. Continue:
   - Debtor: Charlie (-10), Creditor: Bob (20)
   - Transaction: Charlie pays Bob $10
   - Update: Charlie: 0 (remove), Bob: 10

4. Final: Diana (-10), Bob (10)
   - Transaction: Diana pays Bob $10
   - Done!

Result: 3 transactions instead of 6+
  ✓ Charlie → Alice: $40
  ✓ Charlie → Bob: $10
  ✓ Diana → Bob: $10

Time Complexity: O(N log N) where N = number of members
Space Complexity: O(N) for heaps
`}
                </pre>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>Why this matters:</strong> In a group of 100 people,
                  instead of potentially 1000s of individual settlements, our
                  algorithm reduces it to ~100 transactions. Fewer transactions
                  = faster, simpler settling up.
                </p>
              </div>
            </div>
          </Section>

          {/* Technical Stack */}
          <Section
            title="🛠️ Technical Stack"
            expanded={expandedSection === "tech"}
            onClick={() => toggleSection("tech")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Frontend
                </p>
                <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                  <li>⚛️ React + Vite</li>
                  <li>🎨 TailwindCSS</li>
                  <li>🌙 Dark/Light Mode</li>
                  <li>📱 Mobile Responsive</li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Backend
                </p>
                <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                  <li>⚡ FastAPI</li>
                  <li>🐘 PostgreSQL</li>
                  <li>🤖 Groq LLM (Llama 3.1)</li>
                  <li>🔐 JWT Auth</li>
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded md:col-span-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Infrastructure
                </p>
                <ul className="text-slate-600 dark:text-slate-400 space-y-1">
                  <li>
                    ☁️ Supabase (Auth + PostgreSQL + Real-time)
                  </li>
                  <li>🐳 Docker</li>
                  <li>🚀 Render (Backend)</li>
                  <li>📦 Netlify (Frontend)</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* Why SplitRight */}
          <Section
            title="✨ Why SplitRight?"
            expanded={expandedSection === "why"}
            onClick={() => toggleSection("why")}
          >
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>No Math Required:</strong> AI parses natural language.
                  Type how you'd explain it to a friend.
                </span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>Transparent:</strong> See exact calculations for every
                  expense and balance.
                </span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>Efficient:</strong> Debt minimization algorithm
                  reduces complexity dramatically.
                </span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>Scalable:</strong> Works for 2 people or 1000. Real-time updates.
                </span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span>
                  <strong>Secure:</strong> End-to-end encrypted auth. Your
                  financial data is yours alone.
                </span>
              </li>
            </ul>
          </Section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-100 dark:bg-slate-800 p-4 text-center border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
          >
            Got it, Let's Go! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable Section Component
function Section({ title, expanded, onClick, children }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onClick}
        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition font-semibold text-slate-800 dark:text-slate-200"
      >
        <span>{title}</span>
        {expanded ? (
          <ChevronUp size={20} className="text-blue-600" />
        ) : (
          <ChevronDown size={20} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {children}
        </div>
      )}
    </div>
  );
}

// Feature Item Component
function FeatureItem({ icon, title, desc }) {
  return (
    <div className="flex gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}