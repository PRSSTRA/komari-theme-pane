import { computePosition, flip, offset, shift } from '@floating-ui/dom';

export async function positionMenu(anchor, menu) {
  if (!anchor || !menu) return;
  const { x } = await computePosition(anchor, menu, {
    placement: 'bottom-end', middleware: [shift({ padding: 12 })],
  });
  menu.style.left = `${x}px`;
  menu.style.right = 'auto';
}

export function bindTooltips(tip) {
  let trigger;
  let timer;

  function hide() {
    clearTimeout(timer);
    if (trigger) trigger.removeAttribute('aria-describedby');
    trigger = undefined;
    tip.dataset.open = 'false';
    if (tip.matches(':popover-open')) tip.hidePopover();
  }

  function enter(event) {
    if (event.pointerType === 'touch') return;
    const next = event.target.closest('[title], [data-tooltip]');
    if (next === trigger) return;
    hide();
    if (!next || (event.type === 'focusin' && !next.matches(':focus-visible'))) return;
    const label = next.getAttribute('title') || next.dataset.tooltip;
    if (!label) return;
    next.dataset.tooltip = label;
    next.removeAttribute('title');
    trigger = next;
    timer = setTimeout(async () => {
      if (trigger !== next || !next.isConnected) return;
      tip.textContent = label;
      tip.showPopover();
      const { x, y, placement } = await computePosition(next, tip, {
        placement: 'top', strategy: 'fixed', middleware: [offset(8), flip(), shift({ padding: 8 })],
      });
      if (trigger !== next) return;
      Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
      tip.dataset.side = placement;
      tip.dataset.open = 'true';
      next.setAttribute('aria-describedby', tip.id);
    }, event.type === 'focusin' ? 0 : 160);
  }

  document.addEventListener('pointerover', enter);
  document.addEventListener('focusin', enter);
  document.addEventListener('pointerout', event => {
    if (trigger && !trigger.contains(event.relatedTarget)) hide();
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('pointerdown', hide);
  document.addEventListener('scroll', hide, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
}
