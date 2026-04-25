import heapq
from typing import Dict, List

def compute_net_balances(expenses: List[Dict])->Dict[str, float]:
    balances = {}
    for expense in expenses:
        payer = expense["paid_by"]
        for split in expense["expense_splits"]:
            if split.get("is_settled", False):
                continue
            uid = split["user_id"]
            amount = split["amount"]
            if uid not in balances:
                balances[uid] = 0.0
            if payer not in balances:
                balances[payer] = 0.0
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