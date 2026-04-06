import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role — never exposed to client
);

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = 'XspensesAI Admin <noreply@xspensesai.com>';
const SITE_URL = process.env.URL || 'https://xspensesai.netlify.app';

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email || typeof email !== 'string') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email is required.' }) };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verify this is actually an active admin
    const { data: adminRecord } = await supabaseAdmin
      .from('admin_users')
      .select('is_active, role')
      .eq('email', normalizedEmail)
      .single();

    if (!adminRecord?.is_active) {
      // Return success anyway to prevent email enumeration
      console.log(`[admin-forgot-password] No active admin found for: ${normalizedEmail}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    }

    // 2. Generate password reset link via Supabase admin API
    const redirectTo = `${SITE_URL}/xai-admin/reset-password`;

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[admin-forgot-password] Supabase generateLink error:', linkError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate reset link.' }),
      };
    }

    const resetUrl = linkData.properties.action_link;
    const roleName = adminRecord.role === 'super_admin' ? 'Super Admin' : adminRecord.role;

    // 3. Send branded email via Resend
    const emailHtml = buildEmailHtml({ email: normalizedEmail, resetUrl, roleName });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: '\uD83D\uDD10 XspensesAI Admin \u2014 Password Reset',
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.text();
      console.error('[admin-forgot-password] Resend error:', resendErr);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send reset email.' }),
      };
    }

    console.log(`[admin-forgot-password] Reset email sent to ${normalizedEmail}`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true }),
    };

  } catch (err) {
    console.error('[admin-forgot-password] Unexpected error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error.' }),
    };
  }
};

// ─── Email Template ─────────────────────────────────────────────────────────
function buildEmailHtml({
  email,
  resetUrl,
  roleName,
}: {
  email: string;
  resetUrl: string;
  roleName: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XspensesAI Admin \u2014 Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#0b1220;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#111a2e;border:1px solid #1e2d4a;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#111a2e;border-bottom:1px solid #1e2d4a;padding:28px 36px;text-align:center;">
              <div style="font-size:32px;color:#c8a64e;line-height:1;margin-bottom:10px;">\u2655</div>
              <div style="font-size:20px;font-weight:700;color:#e8ecf4;letter-spacing:-0.3px;">XspensesAI</div>
              <div style="font-size:10px;letter-spacing:0.2em;color:#c8a64e;margin-top:4px;font-family:monospace;">ADMIN CONSOLE</div>
            </td>
          </tr>

          <!-- Warning bar -->
          <tr>
            <td style="background:#f59e0b11;border-bottom:1px solid #f59e0b22;padding:10px 36px;text-align:center;">
              <span style="font-size:10px;letter-spacing:0.15em;color:#f59e0b;font-family:monospace;">\u26A0 AUTHORIZED PERSONNEL ONLY</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="font-size:15px;color:#8899bb;margin:0 0 6px;">Password Reset Request</p>
              <h2 style="font-size:22px;font-weight:700;color:#e8ecf4;margin:0 0 20px;letter-spacing:-0.3px;">Reset Your Admin Password</h2>

              <p style="font-size:14px;color:#8899bb;line-height:1.7;margin:0 0 16px;">
                A password reset was requested for the <strong style="color:#c8a64e;">${roleName}</strong> account associated with:
              </p>
              <div style="background:#0b1220;border:1px solid #1e2d4a;border-radius:4px;padding:10px 14px;margin-bottom:24px;font-family:monospace;font-size:13px;color:#e8ecf4;">
                ${email}
              </div>

              <p style="font-size:14px;color:#8899bb;line-height:1.7;margin:0 0 24px;">
                Click the button below to set a new password. This link is valid for <strong style="color:#e8ecf4;">60 minutes</strong> and can only be used once.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a64e,#a8872e);color:#0b1220;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:4px;letter-spacing:0.02em;">
                      Reset Admin Password \u2192
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#2a3a5a;line-height:1.7;margin:24px 0 0;">
                If you did not request this reset, you can safely ignore this email. Your password will remain unchanged. If you believe your admin account has been compromised, contact your system administrator immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1e2d4a;padding:16px 36px;text-align:center;">
              <p style="font-size:10px;color:#2a3a5a;margin:0;letter-spacing:0.12em;font-family:monospace;">
                SECURED ADMIN CHANNEL \u00b7 XSPENSESAI \u00a9 ${new Date().getFullYear()} \u00b7 ROWNMI
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
