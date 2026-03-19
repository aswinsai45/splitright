import os
from groq import Groq
from pydantic import BaseModel
from typing import Optional, List
import json
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
SYSTEM_PROMPT = """You are an expense parser for a bill splitting app. 

Extract structured data from a natural language expense description.
Return ONLY valid JSON - no markdown, no explanation, no backticks.

Output schema:
{
  "payer_name": string,
  "amount": number,
  "description": string,
  "split_type": "equal",
  "participant_count": number or null,
  "participant_names": [string] or null
}

If you cannot parse the input return:
{ "error": "reason why parsing failed" }

Examples:
Input: "Rahul paid 800 for dinner split 4 ways"
Output: {"payer_name":"Rahul","amount":800,"description":"dinner","split_type":"equal","participant_count":4,"participant_names":null}

Input: "I paid 1200 for Airbnb between me, Priya and Aakash"
Output: {"payer_name":"I","amount":1200,"description":"Airbnb","split_type":"equal","participant_count":null,"participant_names":["I","Priya","Aakash"]}

Input: "pizza"
Output: {"error": "Cannot determine payer or amount"}
"""

class ParsedExpense(BaseModel):
    payer_name: Optional[str]
    amount: Optional[float]
    description: Optional[str]
    split_type: Optional[str]
    participant_count: Optional[int]=None
    participant_names: Optional[List[str]]=None

class ParseError(BaseModel):
    error: str

def parse_expense_text(text:str):
    chat_completion=client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        model="llama-3.1-8b-instant",
        temperature=0,
    )

    raw = chat_completion.choices[0].message.content.strip()
    print("LLM RAW OUTPUT:", raw)

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

