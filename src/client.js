const fontStack = '"BIZ UDPGothic", "Noto Sans JP", "Hiragino Sans", Meiryo, "Yu Gothic UI", system-ui, sans-serif';

export const inject = ['locale'];

export function apply(ctx) {
  if (typeof document === 'undefined') return;

  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.dshFontJa = '';
    // Override the theme default so an explicit text font still takes precedence.
    style.textContent = `:root:root { --dsh-font-family-text-default: ${fontStack}; }`;

    const sync = () => {
      const { active } = ctx.locale.getLocale();
      if (/^ja(?:-|$)/i.test(active)) {
        if (!style.isConnected) document.head.append(style);
      } else {
        style.remove();
      }
    };

    sync();
    const unsubscribe = ctx.locale.subscribe(sync);
    return () => {
      unsubscribe();
      style.remove();
    };
  });
}
