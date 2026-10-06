function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. Add it in Vercel > Settings > Environment Variables.`);
  return v;
}
export const env = {
  get supabaseUrl() { return need('SUPABASE_URL'); },
  get supabaseKey() { return need('SUPABASE_SERVICE_ROLE_KEY'); },
  get paystackKey() { return need('PAYSTACK_SECRET_KEY'); },
  get resendKey() { return process.env.RESEND_API_KEY || ''; },
  get emailFrom() { return process.env.EMAIL_FROM || 'Tiada Marketplace <onboarding@resend.dev>'; },
  get adminAlert() { return process.env.ADMIN_ALERT_EMAIL || ''; },
  get siteUrl() { return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''); },
  get sessionSecret() {
    const s = need('SESSION_SECRET');
    if (s.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
    return s;
  },
  get setupToken() { return process.env.SETUP_TOKEN || ''; },
};
