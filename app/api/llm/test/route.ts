import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { llm, llmKey } = await req.json();

    if (!llmKey) {
      return NextResponse.json({ success: false, error: 'Missing API Key' }, { status: 400 });
    }

    if (llm === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${llmKey}` }
      });
      if (response.ok) return NextResponse.json({ success: true });
      return NextResponse.json({ success: false, error: 'Invalid GROQ Key' }, { status: 401 });
    }

    if (llm === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${llmKey}` }
      });
      if (response.ok) return NextResponse.json({ success: true });
      return NextResponse.json({ success: false, error: 'Invalid OpenAI Key' }, { status: 401 });
    }

    if (llm === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${llmKey}` }
      });
      if (response.ok) return NextResponse.json({ success: true });
      return NextResponse.json({ success: false, error: 'Invalid OpenRouter Key' }, { status: 401 });
    }

    if (llm === 'llama') {
      try {
        const cleanUrl = llmKey.endsWith('/') ? llmKey.slice(0, -1) : llmKey;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${cleanUrl}/api/tags`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) return NextResponse.json({ success: true });
        return NextResponse.json({ success: false, error: 'Ollama is not reachable at this URL' }, { status: 401 });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: `Local Connection Error: ${err.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
