import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { Name, WPM } = await req.json();

    if (!Name || !WPM) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabase.from('leaderboard').insert([{ Name, WPM }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Score submitted!' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error', err }, { status: 500 });
  }
}
