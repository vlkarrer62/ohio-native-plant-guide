(function () {
  const config = window.SITE_CONFIG || {};

  function initContactForm() {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('contact-status');
    const mailtoLink = document.getElementById('contact-mailto');
    if (!form) return;

    if (mailtoLink && config.contactEmail) {
      mailtoLink.href = 'mailto:' + config.contactEmail;
      mailtoLink.textContent = config.contactEmail;
    }

    if (config.formspreeContactUrl) {
      form.action = config.formspreeContactUrl;
      form.method = 'POST';
    } else {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const data = new FormData(form);
        const name = data.get('name') || '';
        const email = data.get('email') || '';
        const subject = data.get('subject') || 'Message from Ohio Native Plant Guide';
        const message = data.get('message') || '';
        const body = 'From: ' + name + (email ? ' (' + email + ')' : '') + '\n\n' + message;
        window.location.href =
          'mailto:' + (config.contactEmail || '') +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
        if (status) {
          status.textContent = 'Opening your email app…';
          status.hidden = false;
        }
      });
    }

    form.addEventListener('submit', function () {
      if (!config.formspreeContactUrl || !status) return;
      status.textContent = 'Sending…';
      status.hidden = false;
    });

    if (window.location.search.includes('contact=sent') && status) {
      status.textContent = 'Thank you — your message was sent.';
      status.hidden = false;
      form.reset();
    }
  }

  function initReveal() {
    const sections = document.querySelectorAll('.contact-section');
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.08 }
    );
    sections.forEach(function (section) { observer.observe(section); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initContactForm();
    initReveal();
  });
})();
