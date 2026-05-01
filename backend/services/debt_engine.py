import heapq
from typing import Dict, List, Optional


def compute_net_balances(
    expenses: List[Dict],
    guest_assignments: Optional[Dict[str, str]] = None,
) -> Dict[str, float]:
    """
    Compute net balances from a list of expenses with their expense_splits.

    guest_assignments: mapping of group_guest.id -> real user_id (profiles.id)
    Splits belonging to unassigned guests are counted under a synthetic key
    "guest:<uuid>" so guests can participate in balances before assignment.
    """
    if guest_assignments is None:
        guest_assignments = {}

    def guest_key(guest_id: str) -> str:
        return f"guest:{guest_id}"

    balances = {}
    for expense in expenses:
        paid_by_guest_id = expense.get("paid_by_guest_id")
        if paid_by_guest_id:
            payer = guest_assignments.get(paid_by_guest_id) or guest_key(paid_by_guest_id)
        else:
            payer = expense.get("paid_by")

        if payer is None:
            continue

        for split in expense["expense_splits"]:
            if split.get("is_settled", False):
                continue

            # Determine the effective debtor
            guest_id = split.get("guest_id")
            if guest_id:
                uid = guest_assignments.get(guest_id) or guest_key(guest_id)
            else:
                uid = split.get("user_id")
                if uid is None:
                    continue  # malformed split

            amount = float(split["amount"])
            balances.setdefault(uid, 0.0)
            balances.setdefault(payer, 0.0)
            if uid != payer:
                balances[uid] -= amount
                balances[payer] += amount

    return balances


def simplify_debts(balances: Dict[str, float]) -> List[Dict]:
    creditors = []
    debtors = []

    for user_id, balance in balances.items():
        if balance > 0.01:
            heapq.heappush(creditors, (-balance, user_id))
        elif balance < -0.01:
            heapq.heappush(debtors, (balance, user_id))

    transactions = []

    while creditors and debtors:
        credit_amt, creditor = heapq.heappop(creditors)
        credit_amt = -credit_amt

        debt_amt, debtor = heapq.heappop(debtors)
        debt_amt = -debt_amt

        settled = min(credit_amt, debt_amt)
        transactions.append({
            "from": debtor,
            "to": creditor,
            "amount": round(settled, 2),
        })

        remaining_credit = credit_amt - settled
        remaining_debt = debt_amt - settled

        if remaining_credit > 0.01:
            heapq.heappush(creditors, (-remaining_credit, creditor))
        if remaining_debt > 0.01:
            heapq.heappush(debtors, (-remaining_debt, debtor))

    return transactions
