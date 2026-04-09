import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), '.testingbuddy.config.json');

function readConfig() {
  if (!fs.existsSync(configPath)) {
    return {
      jira: { provider: 'jira', url: '', email: '', token: '' },
      llm: { llm: 'groq', llmKey: '' },
      testlink: { provider: 'testlink', devKey: '', url: '' }
    };
  }
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      jira: {}, llm: {}, testlink: {}
    };
  }
}

function writeConfig(data: any) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const config = readConfig();
    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;
    
    if (!type || !['jira', 'llm', 'testlink'].includes(type)) {
       return NextResponse.json({ error: 'Invalid config type' }, { status: 400 });
    }

    const currentConfig = readConfig();
    currentConfig[type] = { ...currentConfig[type], ...data };
    writeConfig(currentConfig);

    return NextResponse.json({ success: true, config: currentConfig });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
