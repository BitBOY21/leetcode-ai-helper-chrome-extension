from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import os
import re


# =========================================
# Load API key safely
# =========================================
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("❗ Missing GEMINI_API_KEY environment variable. Please define it in .env")

genai.configure(api_key=API_KEY)


# =========================================
# FastAPI server init
# =========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str
    language: str = "English"
    mode: str = "explain"
    codeLanguage: str = "Python"


def clean_text(text: str) -> str:
    if not text:
        return text

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n")]

    cleaned_lines = []
    last_empty = False

    for line in lines:
        if line == "":
            if not last_empty:
                cleaned_lines.append("")
            last_empty = True
        else:
            cleaned_lines.append(line)
            last_empty = False

    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned


def strip_inline_comments(code: str) -> str:
    return re.sub(r'#.*', '', code)


def build_prompt(req: TextRequest) -> str:

    if req.mode == "solution":
        task_block = f"""
Task:
- You MUST provide a FULL WORKING solution STRICTLY in {req.codeLanguage}.
- NEVER reply in any other language than {req.codeLanguage}.
- If the solution is initially produced in a different language — rewrite it into {req.codeLanguage} before sending the output.
- FIRST: provide 2–4 bullet points explaining the idea in short.
- THEN: output ONLY the final code in {req.codeLanguage}.
- DO NOT put comments inside the code.
- DO NOT explain every line.
- DO NOT restate the question.
- DO NOT add paragraphs or long text.

Output format MUST be:

<h2>Short Explanation</h2>
<ul>
<li>one short point</li>
<li>second point</li>
<li>third point</li>
</ul>

<h2>Code</h2>
<pre><code>
...
</code></pre>
"""
    else:
        task_block = """
Task:
- Explain the question briefly.
- Provide intuitive hints for solving.
- Do NOT provide the full solution code.
- Avoid repeating the problem text.

Rules:
- Max 6 short sentences.
- Provide 2–3 solving hints only.
"""


    language_block = f"""
Language:
- Write the answer in {req.language}.
"""

    html_block = """
IMPORTANT:
- Return as pure HTML only.
- Use <h2>, <h3>, <p>, <ul>, <li>, <pre>, <code>.
"""

    prompt = f"""
You are an expert clean-code competitive programming mentor.

{task_block}
{language_block}
{html_block}

User text:
{req.text}
"""
    return prompt


@app.post("/explain")
async def explain_text(req: TextRequest):

    model = genai.GenerativeModel("models/gemini-2.5-flash")
    prompt = build_prompt(req)
    result = model.generate_content(prompt)

    answer_text = getattr(result, "text", None)

    if not answer_text:
        try:
            answer_text = result.candidates[0].content.parts[0].text
        except Exception:
            answer_text = "Error: Could not extract response."

    answer_text = clean_text(answer_text)

    if req.mode == "solution":
        answer_text = strip_inline_comments(answer_text)

    return {"answer": answer_text}
