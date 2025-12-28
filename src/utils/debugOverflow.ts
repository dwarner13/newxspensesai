/**
 * Debug utility to identify elements causing horizontal overflow
 * Only runs in development mode
 */

export function logOverflowElements() {
  if (!import.meta.env.DEV) {
    return;
  }

  const doc = document.documentElement;
  const body = document.body;

  // Log document-level dimensions
  console.group('🔍 Overflow Debug - Document Dimensions');
  console.log('document.documentElement.scrollWidth:', doc.scrollWidth);
  console.log('document.documentElement.clientWidth:', doc.clientWidth);
  console.log('document.body.scrollWidth:', body.scrollWidth);
  console.log('document.body.clientWidth:', body.clientWidth);
  console.log('window.innerWidth:', window.innerWidth);
  console.groupEnd();

  // Find all overflowing elements
  const allElements = [...document.querySelectorAll('*')];
  const overflowing = allElements.filter(
    (el) => el.scrollWidth > el.clientWidth + 1
  );

  if (overflowing.length === 0) {
    console.log('✅ No overflowing elements found');
    return;
  }

  // Sort by overflow amount (largest first)
  overflowing.sort(
    (a, b) =>
      b.scrollWidth - b.clientWidth - (a.scrollWidth - a.clientWidth)
  );

  // Log top 20 offenders
  console.group('⚠️ Top Overflowing Elements (scrollWidth > clientWidth)');
  const topOffenders = overflowing.slice(0, 20).map((el) => {
    const overflow = el.scrollWidth - el.clientWidth;
    return {
      tag: el.tagName,
      class: el.className || '(no class)',
      id: el.id || '(no id)',
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflow: overflow,
      computedStyle: window.getComputedStyle(el).width,
    };
  });

  console.table(topOffenders);

  console.groupEnd();
}

