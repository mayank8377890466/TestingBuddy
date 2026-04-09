import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();

    let extractedText = '';

    if (fileName.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text;
      await parser.destroy();
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Please upload PDF, DOCX, TXT, or MD.' }, { status: 400 });
    }

    return NextResponse.json({ text: extractedText.trim() });
  } catch (error: any) {
    console.error('Parsing error:', error);
    return NextResponse.json({ error: `Failed to parse document: ${error.message}` }, { status: 500 });
  }
}
