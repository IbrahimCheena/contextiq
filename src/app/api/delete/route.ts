import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  let filename: string;

  try {
    const body = (await request.json()) as { filename?: unknown };
    if (!body.filename || typeof body.filename !== 'string' || !body.filename.trim()) {
      return NextResponse.json({ error: 'filename is required.' }, { status: 400 });
    }
    filename = body.filename.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('filename', filename);

  if (error) {
    console.error('[delete] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, filename });
}
