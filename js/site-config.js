/**
 * Site-wide configuration for contact forms and the visitor guestbook.
 *
 * CONTACT FORM (Formspree — free at https://formspree.io):
 *   1. Create an account and a new form
 *   2. Paste your form URL below (looks like https://formspree.io/f/xxxxxxxx)
 *
 * GUESTBOOK (Supabase — free at https://supabase.com):
 *   Visitors only enter a name and message. No login required.
 *   1. Create a free Supabase project
 *   2. Run the SQL in supabase/guestbook-setup.sql (SQL Editor in dashboard)
 *   3. Project Settings → API → copy Project URL and anon public key below
 */
window.SITE_CONFIG = {
  contactEmail: 'hello@tended-wild.com',

  // Replace with your Formspree URL, or leave empty to use mailto fallback
  formspreeContactUrl: '',

  supabase: {
    url: '',
    anonKey: ''
  }
};
