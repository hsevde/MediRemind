import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const PANEL_BASE_URL = Deno.env.get('PANEL_BASE_URL') ?? 'http://localhost:3000/panel';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

type InviteBody = {
  email: string;
  token: string;
  patientName: string;
};

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status: 200, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as InviteBody;
    const { email, token, patientName } = body;

    if (!email || !token) {
      return ok({ success: false, emailSkipped: true, error: 'email ve token gerekli' });
    }

    const panelUrl = `${PANEL_BASE_URL}?token=${encodeURIComponent(token)}`;

    if (!RESEND_API_KEY) {
      return ok({ success: true, panelUrl, emailSkipped: true });
    }

    const subject = `${patientName || 'Hasta'}'ın ilaç takibi – MediRemind`;
    const html = `
      <p>Merhaba,</p>
      <p><strong>${patientName || 'Hasta'}</strong> sizi ilaç takip paneline davet etti.</p>
      <p>Panele erişmek için <a href="${panelUrl}">buraya tıklayın</a>.</p>
      <p>Link: ${panelUrl}</p>
      <p>MediRemind</p>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MediRemind <onboarding@resend.dev>',
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return ok({ success: false, panelUrl, emailSkipped: true, error: errText });
    }

    return ok({ success: true, panelUrl, emailSkipped: false });
  } catch (e) {
    return ok({ success: false, emailSkipped: true, error: String(e) });
  }
});
