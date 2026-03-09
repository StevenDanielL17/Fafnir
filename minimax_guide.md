You can integrate the **MiniMax models (like M2.1 / M2.5)** into **VS Code** in a few ways. The easiest way is using a coding extension (like **Cline**, **Roo Code**, or **OpenCode**) and connecting it with your **MiniMax API key**. Below is the simplest method most developers use.

---

# 1️⃣ Get a MiniMax API key

1. Go to the MiniMax developer platform
2. Create an account
3. Generate an **API key** from the dashboard

You’ll use this key inside VS Code. ([MiniMax API Docs][1])

---

# 2️⃣ Install a VS Code AI coding extension

The MiniMax docs recommend using **Cline**.

### Install Cline

1. Open **VS Code**
2. Go to **Extensions**
3. Search **Cline**
4. Install it
5. Restart VS Code if needed ([MiniMax API Docs][2])

---

# 3️⃣ Configure MiniMax inside Cline

Open the extension settings.

Set:

* **API Provider:** `MiniMax`
* **Endpoint:**

  * Global users → `https://api.minimax.io`
* **API Key:** your key

Then select the model:

```
MiniMax-M2.1
or
MiniMax-M2.5
```

Save the configuration. ([MiniMax API Docs][2])

---

# 4️⃣ Use it in VS Code

After setup:

1. Open the **Cline sidebar**
2. Ask coding prompts
3. It will use the **MiniMax model API**

Example prompt:

```
Refactor this Node.js API for better performance
```

---

# 5️⃣ Alternative (OpenAI-compatible API)

MiniMax also supports **OpenAI-style API**, so you can plug it into many tools.

Install OpenAI SDK:

```bash
pip install openai
```

Set environment variables:

```bash
export OPENAI_BASE_URL=https://api.minimax.io/v1
export OPENAI_API_KEY=YOUR_MINIMAX_KEY
```

Example Python call:

```python
from openai import OpenAI

client = OpenAI()

resp = client.chat.completions.create(
    model="MiniMax-M2.5",
    messages=[
        {"role":"user","content":"Write a Python API server"}
    ]
)

print(resp.choices[0].message.content)
```

MiniMax intentionally made the API **OpenAI-compatible** so existing tools work without major changes. ([MiniMax API Docs][3])

---

# 6️⃣ If you want **full VS Code Copilot-style experience**

Use one of these:

| Tool             | Works well with MiniMax   |
| ---------------- | ------------------------- |
| **Cline**        | best agent coding         |
| **Roo Code**     | simple VS Code AI         |
| **OpenCode CLI** | terminal coding assistant |

All support selecting **MiniMax provider** with your API key. ([MiniMax API Docs][2])

---

💡 **Pro tip:**
MiniMax models output reasoning in `<think>...</think>` blocks, so tools must keep those tokens in history for best results. ([GitHub][4])

---

✅ If you want, I can also show you:

* **How to use MiniMax as a VS Code Copilot replacement (best setup)**
* **How to run the MiniMax model locally with vLLM**
* **How to connect MiniMax to Cursor / Continue.dev** (most powerful setup).

[1]: https://platform.minimax.io/docs/solutions/eigent?utm_source=chatgpt.com "Multi-Agent Cowork for Complex Tasks - MiniMax API Docs"
[2]: https://platform.minimax.io/docs/guides/text-ai-coding-tools?utm_source=chatgpt.com "M2.5 for AI Coding Tools - MiniMax API Docs"
[3]: https://platform.minimax.io/docs/api-reference/text-openai-api?utm_source=chatgpt.com "Compatible OpenAI API - MiniMax API Docs"
[4]: https://github.com/MiniMax-AI/MiniMax-M2?utm_source=chatgpt.com "GitHub - MiniMax-AI/MiniMax-M2: MiniMax-M2, a model built for Max coding & agentic workflows."
