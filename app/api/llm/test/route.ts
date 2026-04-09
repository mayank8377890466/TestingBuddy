import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { llm, llmKey } = await req.json();

    if (!llmKey) {
      return NextResponse.json({ success: false, error: 'Missing API Key' }, { status: 400 });
    }

    if (llm === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${llmKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: 'Invalid GROQ Key' }, { status: 401 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
