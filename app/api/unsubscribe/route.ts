import { createServiceRoleClient } from '@/lib/supabase-server';

function htmlPage(title: string, body: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | BetAutopsy</title>
<style>body{margin:0;padding:0;background:#0D1117;color:#F0F0F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.c{max-width:400px;padding:40px 20px}a{color:#00C9A7;text-decoration:none}a:hover{text-decoration:underline}.f{margin-top:40px;font-size:11px;color:#5A5C6F;line-height:1.6}</style>
</head><body><div class="c">${body}</div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return htmlPage('Error', `
      <h1 style="font-size:24px;font-weight:700;margin-bottom:12px">Missing token</h1>
      <p style="color:#A0A3B1;font-size:14px">This unsubscribe link appears to be invalid.</p>
    `);
  }

  const supabase = createServiceRoleClient();

  const { data: tokenData } = await supabase
    .from('email_unsubscribe_tokens')
    .select('user_id')
    .eq('id', token)
    .single();

  if (!tokenData) {
    return htmlPage('Not Found', `
      <h1 style="font-size:24px;font-weight:700;margin-bottom:12px">Token not found</h1>
      <p style="color:#A0A3B1;font-size:14px">This unsubscribe link may have expired or is invalid.</p>
    `);
  }

  await supabase
    .from('profiles')
    .update({ email_digest_enabled: false })
    .eq('id', tokenData.user_id);

  return htmlPage('Unsubscribed', `
    <div style="font-size:18px;font-weight:700;margin-bottom:24px"><span style="font-weight:900">BET</span><span style="font-weight:300;color:#00C9A7">AUTOPSY</span></div>
    <h1 style="font-size:24px;font-weight:700;margin-bottom:12px">You've been unsubscribed.</h1>
    <p style="color:#A0A3B1;font-size:14px;margin-bottom:24px">You won't receive weekly digests anymore.<br>Re-enable anytime in <a href="/settings">Settings</a>.</p>
    <a href="/" style="font-size:14px">← Back to BetAutopsy</a>
    <div class="f">BetAutopsy provides behavioral analysis and educational insights — not gambling or financial advice. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.</div>
  `);
}
