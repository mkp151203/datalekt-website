// Close the Log in and mobile menus on outside click, on choosing one of
// their links, or on Escape.
export function initMenus(): void {
  const menus = document.querySelectorAll<HTMLDetailsElement>('details[data-dismiss]');
  document.addEventListener('click', (event) => {
    const target = event.target as Element;
    menus.forEach((menu) => {
      if (menu.open && (!menu.contains(target) || target.closest('a'))) menu.open = false;
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
