import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(req: { json: () => PromiseLike<{ Name: any; WPM: any; }> | { Name: any; WPM: any; }; }) {
  try {
    const { Name, WPM } = await req.json();

    if (!Name || !WPM) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const { error } = await supabase.from('leaderboard').insert([{ Name, WPM }]);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: 'Score submitted!'}), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
