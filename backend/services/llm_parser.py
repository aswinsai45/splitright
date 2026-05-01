import os
from groq import Groq
from pydantic import BaseModel
from typing import Optional, List
import json
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are an expense parser for a bill-splitting app.

Extract structured data from a natural language expense description.
Return ONLY valid JSON — no markdown, no explanation, no backticks.

Output schema:
{
  "payer_name": string,           // who paid — use "I" if the speaker paid
  "amount": number,               // total bill amount
  "description": string,          // what was purchased (concise noun phrase)
  "category": "food" | "travel" | "accommodation" | "utilities" | "other",
  "split_type": "equal" | "percentage",
  "participant_count": number | null,    // total number of people including payer, if stated as a count
  "participant_names": [string] | null   // list of all participant names if mentioned by name (include payer); null if only a count was given
}

Category rules:
- food: meals, drinks, groceries, restaurant, dinner, lunch, breakfast, pizza, coffee, snacks
- travel: uber, cab, taxi, flight, train, bus, fuel, petrol, toll, ticket
- accommodation: hotel, airbnb, rent, hostel, room, stay
- utilities: electricity, wifi, internet, water, bill, recharge, subscription
- other: anything else

Split type rules:
- "equal": split equally / split N ways / divide equally / among N people / "3 ways"
- "percentage": mentions % or percentage splits

Examples:

Input: "Rahul paid 800 for dinner split 4 ways"
Output: {"payer_name":"Rahul","amount":800,"description":"dinner","category":"food","split_type":"equal","participant_count":4,"participant_names":null}

Input: "I paid 1200 for Airbnb between me, Priya and Aakash"
Output: {"payer_name":"I","amount":1200,"description":"Airbnb","category":"accommodation","split_type":"equal","participant_count":null,"participant_names":["I","Priya","Aakash"]}

Input: "i paid 400 in 3 ways"
Output: {"payer_name":"I","amount":400,"description":"expense","category":"other","split_type":"equal","participant_count":3,"participant_names":null}

Input: "i split 400 across 3"
Output: {"payer_name":"I","amount":400,"description":"expense","category":"other","split_type":"equal","participant_count":3,"participant_names":null}

Input: "paid 600 for uber with Sam and Riya"
Output: {"payer_name":"I","amount":600,"description":"Uber","category":"travel","split_type":"equal","participant_count":null,"participant_names":["I","Sam","Riya"]}

Input: "I paid 900 for groceries split 60% me and 40% Priya"
Output: {"payer_name":"I","amount":900,"description":"groceries","category":"food","split_type":"percentage","participant_count":null,"participant_names":["I","Priya"]}

If you cannot parse the input return:
{ "error": "reason why parsing failed" }
"""


class ParsedExpense(BaseModel):
    payer_name: Optional[str]
    amount: Optional[float]
    description: Optional[str]
    category: Optional[str] = "other"
    split_type: Optional[str] = "equal"
    participant_count: Optional[int] = None
    participant_names: Optional[List[str]] = None


class ParseError(BaseModel):
    error: str


def parse_expense_text(text: str):
    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        model="llama-3.1-8b-instant",
        temperature=0,
    )

    raw = chat_completion.choices[0].message.content.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return ParseError(error="Model returned non-JSON response")

    if "error" in parsed:
        return ParseError(error=parsed["error"])

    try:
        return ParsedExpense(**parsed)
    except Exception as e:
        return ParseError(error=f"Schema validation failed: {str(e)}")


BILL_PROMPT = """You are a receipt/bill OCR parser for a bill-splitting app.

Analyze this bill or receipt image carefully and extract:
1. The GRAND TOTAL (the final amount the customer must pay — look for words like "Total", "Grand Total", "Amount Due", "Net Payable", "Total Amount")
2. The merchant/establishment name (restaurant, store, hotel, etc.)
3. A short description of what was purchased
4. The category based on the merchant type

Return ONLY valid JSON — no markdown, no explanation, no backticks:
{
  "amount": number,
  "merchant_name": string,
  "description": string,
  "category": "food" | "travel" | "accommodation" | "utilities" | "other"
}

Category rules:
- food: restaurant, cafe, bar, bakery, food court, grocery, supermarket, dining, swiggy, zomato
- travel: uber, ola, cab, taxi, airport, airline, bus, train, fuel, petrol, toll, metro
- accommodation: hotel, resort, airbnb, hostel, pg, rent, lodge
- utilities: electricity, water, wifi, internet, phone bill, recharge, gas, subscription, netflix, spotify
- other: anything else

If you cannot find the total amount clearly, return:
{ "error": "Cannot extract grand total from this bill" }
"""


class ParsedBill(BaseModel):
    amount: float
    merchant_name: Optional[str]
    description: Optional[str]
    category: Optional[str] = "other"


def parse_bill_image(image_base64: str, mime_type: str = "image/jpeg"):
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            },
                        },
                        {
                            "type": "text",
                            "text": BILL_PROMPT,
                        },
                    ],
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0,
        )
    except Exception as e:
        return ParseError(error=f"Vision model error: {str(e)}")

    raw = chat_completion.choices[0].message.content.strip()

    # Strip markdown code fences if model includes them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return ParseError(error="Model returned non-JSON response")

    if "error" in parsed:
        return ParseError(error=parsed["error"])

    try:
        return ParsedBill(**parsed)
    except Exception as e:
        return ParseError(error=f"Schema validation failed: {str(e)}")
