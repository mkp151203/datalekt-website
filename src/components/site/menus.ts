// Close the Log in and mobile menus on outside click or Escape.
export function initMenus(): void {
  const menus = document.querySelectorAll<HTMLDetailsElement>('details[data-dismiss]');
  document.addEventListener('click', (event) => {
    menus.forEach((menu) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menus.forEach((menu) => {
      if (menu.open) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    });
  });
}
