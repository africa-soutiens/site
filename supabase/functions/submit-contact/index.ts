const jsonResponse = (body: Record<string, unknown>, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
      'Vary': 'Origin',
    },
  });

Deno.serve(async (request) => {
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = request.headers.get('origin') ?? '';

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Vary': 'Origin',
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée.' }, 405, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required Supabase function secrets.');
    return jsonResponse({ error: 'Le service est momentanément indisponible.' }, 500, origin);
  }

  let messagesUrl: URL;
  try {
    messagesUrl = new URL('/rest/v1/contact_messages', supabaseUrl);
  } catch (error) {
    console.error('Invalid Supabase URL configured for contact function:', error);
    return jsonResponse({ error: 'Le service est momentanément indisponible.' }, 500, origin);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 7000) {
    return jsonResponse({ error: 'Le message dépasse la taille autorisée.' }, 413, origin);
  }

  let payload: Record<string, unknown>;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 7000) {
      return jsonResponse({ error: 'Le message dépasse la taille autorisée.' }, 413, origin);
    }
    const parsedPayload: unknown = JSON.parse(body);
    if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
      return jsonResponse({ error: 'Le formulaire contient des données invalides.' }, 400, origin);
    }
    payload = parsedPayload as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Le formulaire contient des données invalides.' }, 400, origin);
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const company = typeof payload.company === 'string' ? payload.company.trim() : '';
  const startedAt = Number(payload.startedAt);

  if (company) {
    return jsonResponse(
      { error: 'Le formulaire a été bloqué par la vérification anti-spam. Actualisez la page et réessayez.' },
      400,
      origin
    );
  }

  if (
    name.length < 2 ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    subject.length < 3 ||
    subject.length > 180 ||
    message.length < 10 ||
    message.length > 5000
  ) {
    return jsonResponse({ error: 'Veuillez vérifier les champs du formulaire.' }, 400, origin);
  }

  const now = Date.now();
  if (!Number.isFinite(startedAt) || startedAt > now || now - startedAt < 2500) {
    return jsonResponse({ error: 'Veuillez patienter un instant avant de renvoyer le formulaire.' }, 400, origin);
  }

  const clientIp =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const sourceHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp)))
  )
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const restHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  const recentMessagesUrl = new URL(messagesUrl);
  recentMessagesUrl.search = new URLSearchParams({
    select: 'id',
    source_hash: `eq.${sourceHash}`,
    created_at: `gte.${new Date(now - 15 * 60 * 1000).toISOString()}`,
    limit: '3',
  }).toString();

  let recentResponse: Response;
  try {
    recentResponse = await fetch(recentMessagesUrl, { headers: restHeaders });
  } catch (error) {
    console.error('Supabase contact rate-limit request failed:', error);
    return jsonResponse({ error: 'Impossible de vérifier votre demande. Veuillez réessayer.' }, 503, origin);
  }
  if (!recentResponse.ok) {
    console.error('Supabase contact rate-limit check failed:', recentResponse.status);
    return jsonResponse({ error: 'Impossible de vérifier votre demande. Veuillez réessayer.' }, 503, origin);
  }

  let recentMessages: unknown;
  try {
    recentMessages = await recentResponse.json();
  } catch (error) {
    console.error('Supabase contact rate-limit response could not be parsed:', error);
    return jsonResponse({ error: 'Impossible de vérifier votre demande. Veuillez réessayer.' }, 503, origin);
  }
  if (!Array.isArray(recentMessages)) {
    console.error('Supabase contact rate-limit returned an invalid response.');
    return jsonResponse({ error: 'Impossible de vérifier votre demande. Veuillez réessayer.' }, 503, origin);
  }
  if (recentMessages.length >= 3) {
    return jsonResponse({ error: 'Trop de messages ont été envoyés. Réessayez dans quelques minutes.' }, 429, origin);
  }

  let insertResponse: Response;
  try {
    insertResponse = await fetch(messagesUrl, {
      method: 'POST',
      headers: {
        ...restHeaders,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ name, email, subject, message, source_hash: sourceHash }),
    });
  } catch (error) {
    console.error('Supabase contact insert request failed:', error);
    return jsonResponse({ error: 'Votre message n’a pas pu être enregistré. Veuillez réessayer.' }, 503, origin);
  }

  if (!insertResponse.ok) {
    console.error('Supabase contact insert failed:', insertResponse.status);
    return jsonResponse({ error: 'Votre message n’a pas pu être enregistré. Veuillez réessayer.' }, 503, origin);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('Missing RESEND_API_KEY; the contact message was saved without an email notification.');
    return jsonResponse({ success: true, notificationSent: false }, 201, origin);
  }

  const notificationFrom =
    Deno.env.get('CONTACT_NOTIFICATION_FROM') ?? 'Africa Soutiens <onboarding@resend.dev>';
  const notificationTo = Deno.env.get('CONTACT_NOTIFICATION_TO') ?? 'africasoutiens@gmail.com';
  let notificationResponse: Response;
  try {
    notificationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from: notificationFrom,
        to: [notificationTo],
        reply_to: email,
        subject: `Nouveau message du site : ${subject}`,
        text: [
          `Nom : ${name}`,
          `E-mail : ${email}`,
          `Sujet : ${subject}`,
          '',
          message,
        ].join('\n'),
      }),
    });
  } catch (error) {
    console.error('Contact notification request failed after saving the message:', error);
    return jsonResponse({ success: true, notificationSent: false }, 201, origin);
  }

  if (!notificationResponse.ok) {
    console.error('Contact notification provider rejected the email:', notificationResponse.status);
    return jsonResponse({ success: true, notificationSent: false }, 201, origin);
  }

  return jsonResponse({ success: true, notificationSent: true }, 201, origin);
});
