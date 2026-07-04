(function () {
  const config = window.SITE_CONFIG || {};
  const supabase = config.supabase || {};

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(iso));
    } catch (e) {
      return '';
    }
  }

  function apiHeaders() {
    return {
      apikey: supabase.anonKey,
      Authorization: 'Bearer ' + supabase.anonKey,
      'Content-Type': 'application/json'
    };
  }

  function isConfigured() {
    return Boolean(supabase.url && supabase.anonKey);
  }

  function renderComments(comments, listEl) {
    if (!listEl) return;

    if (!comments.length) {
      listEl.innerHTML = '<p class="guestbook-empty">No visitor notes yet — be the first to share what you saw in the garden.</p>';
      return;
    }

    listEl.innerHTML = comments.map(function (comment) {
      return (
        '<article class="guestbook-entry">' +
          '<header class="guestbook-entry-header">' +
            '<strong class="guestbook-entry-name">' + escapeHtml(comment.name) + '</strong>' +
            '<time class="guestbook-entry-date" datetime="' + escapeHtml(comment.created_at) + '">' +
              escapeHtml(formatDate(comment.created_at)) +
            '</time>' +
          '</header>' +
          '<p class="guestbook-entry-message">' + escapeHtml(comment.message) + '</p>' +
        '</article>'
      );
    }).join('');
  }

  async function loadComments() {
    const listEl = document.getElementById('guestbook-list');
    const loadingEl = document.getElementById('guestbook-loading');
    if (!listEl || !isConfigured()) return;

    try {
      const response = await fetch(
        supabase.url + '/rest/v1/guestbook_comments?select=name,message,created_at&order=created_at.desc&limit=50',
        { headers: apiHeaders() }
      );

      if (!response.ok) throw new Error('Could not load comments');

      const comments = await response.json();
      if (loadingEl) loadingEl.remove();
      renderComments(comments, listEl);
    } catch (err) {
      if (loadingEl) loadingEl.textContent = 'Could not load visitor notes right now.';
    }
  }

  async function submitComment(event) {
    event.preventDefault();

    const form = event.target;
    const status = document.getElementById('guestbook-status');
    const honeypot = form.querySelector('[name="website"]');

    if (honeypot && honeypot.value) return;

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name || !message) return;

    if (status) {
      status.textContent = 'Posting your note…';
      status.hidden = false;
    }

    try {
      const response = await fetch(
        supabase.url + '/rest/v1/guestbook_comments',
        {
          method: 'POST',
          headers: Object.assign({}, apiHeaders(), { Prefer: 'return=representation' }),
          body: JSON.stringify({ name: name, message: message })
        }
      );

      if (!response.ok) throw new Error('Could not post comment');

      const posted = await response.json();
      form.reset();

      if (status) {
        status.textContent = 'Thank you — your note was added to the guestbook.';
        status.hidden = false;
      }

      const listEl = document.getElementById('guestbook-list');
      const loadingEl = document.getElementById('guestbook-loading');
      if (loadingEl) loadingEl.remove();

      if (listEl && posted.length) {
        const empty = listEl.querySelector('.guestbook-empty');
        if (empty) empty.remove();

        const entry = document.createElement('article');
        entry.className = 'guestbook-entry guestbook-entry-new';
        entry.innerHTML =
          '<header class="guestbook-entry-header">' +
            '<strong class="guestbook-entry-name">' + escapeHtml(posted[0].name) + '</strong>' +
            '<time class="guestbook-entry-date" datetime="' + escapeHtml(posted[0].created_at) + '">' +
              escapeHtml(formatDate(posted[0].created_at)) +
            '</time>' +
          '</header>' +
          '<p class="guestbook-entry-message">' + escapeHtml(posted[0].message) + '</p>';
        listEl.prepend(entry);
      }
    } catch (err) {
      if (status) {
        status.textContent = 'Sorry — something went wrong. Please try again or use the contact form.';
        status.hidden = false;
      }
    }
  }

  function initGuestbook() {
    const setupNote = document.getElementById('guestbook-setup');
    const form = document.getElementById('guestbook-form');
    const panel = document.getElementById('guestbook-panel');

    if (!isConfigured()) {
      if (setupNote) setupNote.hidden = false;
      if (panel) panel.hidden = true;
      return;
    }

    if (setupNote) setupNote.hidden = true;
    if (panel) panel.hidden = false;
    if (form) form.addEventListener('submit', submitComment);

    loadComments();
  }

  document.addEventListener('DOMContentLoaded', initGuestbook);
})();
