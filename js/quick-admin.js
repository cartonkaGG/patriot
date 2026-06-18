/* Patriot Store — Quick admin access on storefront */

(function initQuickAdmin() {
  const ADMIN_URL = 'admin.html';
  let logoClicks = 0;
  let logoTimer = null;

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      window.location.href = ADMIN_URL;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('[data-admin-logo]');
    if (!logo) return;

    logo.addEventListener('click', () => {
      logoClicks += 1;
      clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { logoClicks = 0; }, 800);

      if (logoClicks >= 3) {
        logoClicks = 0;
        window.location.href = ADMIN_URL;
      }
    });
  });
})();
