# TestingBuddy: LLM Connections Guide

This guide helps you set up different AI providers to power your test case generation and escape rate limits.

## 1. Groq (Fast & Free Tier)
*   **API Key**: Get one at [console.groq.com](https://console.groq.com/keys)
*   **Recommended Models**: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`
*   **Pros**: Extremely fast, generous free tier.
*   **Cons**: Low TPD (Tokens Per Day) on the on-demand tier.

## 2. OpenRouter (Recommended for High Volume)
*   **API Key**: Get one at [openrouter.ai](https://openrouter.ai/keys)
*   **Base URL**: `https://openrouter.ai/api/v1`
*   **Recommended Models**: 
    - `meta-llama/llama-3.3-70b-instruct` (Great balance)
    - `anthropic/claude-3.5-sonnet` (Best for complex logic)
    - `google/gemini-pro-1.5` (Good alternative)
*   **Pros**: Access 100+ models with one key, no rate limits (pay-as-you-go).

## 3. OpenAI
*   **API Key**: Get one at [platform.openai.com](https://platform.openai.com/api-keys)
*   **Recommended Models**: `gpt-4o`, `gpt-4o-mini`
*   **Pros**: Very reliable, industry standard.

## 4. Ollama (Local & Private)
*   **Setup**: Install from [ollama.com](https://ollama.com)
*   **Connection URL**: `http://localhost:11434`
*   **Recommended Models**: `llama3`, `mistral`
*   **Pros**: 100% private, runs on your own hardware, no costs.
*   **Cons**: Performance depends on your GPU/RAM.

---

### How to Switch Providers
1. Go to **Settings** > **LLM Configuration**.
2. Select your provider from the dropdown.
3. Paste your **API Key**.
4. (Optional) Enter the specific **Model ID** you want to use.
5. Click **Test** and then **Save**.
