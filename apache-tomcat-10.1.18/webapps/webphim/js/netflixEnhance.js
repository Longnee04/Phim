/* Netflix UX enhancements: focus trapping in modal, keyboard nav */
(function () {
  const modal = document.getElementById('modal');
  if (!modal) return;

  function getFocusable() {
    return Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.disabled && el.offsetParent !== null);
  }

  document.addEventListener('keydown', e => {
    if (modal.getAttribute('aria-hidden') !== 'false') return;

    if (e.key === 'Tab') {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  });

  // Auto-focus close button when modal opens
  const closeBtn = document.getElementById('modal-close');
  const observer = new MutationObserver(() => {
    if (modal.getAttribute('aria-hidden') === 'false' && closeBtn) {
      if (!modal.contains(document.activeElement)) closeBtn.focus();
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['aria-hidden'] });
})();
