/**
 * Layout Forensics - DEV-only diagnostic tool
 * 
 * Detects layout corruption vectors:
 * - Containing block issues (transform/filter/perspective breaking position:fixed)
 * - Overflow clipping
 * - Global style mutations
 * - Viewport width traps
 */

export interface LayoutForensicsReport {
  viewport: { width: number; height: number };
  header: BoundingBox | null;
  search: BoundingBox | null;
  title: BoundingBox | null;
  iconsCluster: BoundingBox | null;
  rail: BoundingBox | null;
  railFound: boolean;
  railParent: string | null;
  isPortalToBody: boolean;
  containingBlockIssues: ContainingBlockIssue[] | null;
  globalStyles: {
    bodyOverflow: string;
    bodyPaddingRight: string;
    htmlPaddingRight: string;
    bodyPosition: string;
    bodyWidth: string;
  };
}

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ContainingBlockIssue {
  element: string;
  property: string;
  value: string;
  node: HTMLElement;
}

function getBoundingBox(el: HTMLElement | null): BoundingBox | null {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function checkContainingBlock(el: HTMLElement | null): ContainingBlockIssue[] | null {
  if (!el) return null;
  const issues: ContainingBlockIssue[] = [];
  let current: HTMLElement | null = el.parentElement;
  
  while (current && current !== document.body) {
    const styles = window.getComputedStyle(current);
    const transform = styles.transform;
    const filter = styles.filter;
    const perspective = styles.perspective;
    const contain = styles.contain;
    const willChange = styles.willChange;
    const overflow = styles.overflow;
    const overflowX = styles.overflowX;
    const position = styles.position;
    
    // Check for containing block creators
    if (transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
      issues.push({
        element: `${current.tagName}${current.id ? `#${current.id}` : ''}${current.className ? `.${current.className.split(' ')[0]}` : ''}`,
        property: 'transform',
        value: transform,
        node: current,
      });
    }
    if (filter !== 'none') {
      issues.push({
        element: `${current.tagName}${current.id ? `#${current.id}` : ''}${current.className ? `.${current.className.split(' ')[0]}` : ''}`,
        property: 'filter',
        value: filter,
        node: current,
      });
    }
    if (perspective !== 'none') {
      issues.push({
        element: `${current.tagName}${current.id ? `#${current.id}` : ''}${current.className ? `.${current.className.split(' ')[0]}` : ''}`,
        property: 'perspective',
        value: perspective,
        node: current,
      });
    }
    if (contain !== 'none') {
      issues.push({
        element: `${current.tagName}${current.id ? `#${current.id}` : ''}${current.className ? `.${current.className.split(' ')[0]}` : ''}`,
        property: 'contain',
        value: contain,
        node: current,
      });
    }
    if (willChange.includes('transform')) {
      issues.push({
        element: `${current.tagName}${current.id ? `#${current.id}` : ''}${current.className ? `.${current.className.split(' ')[0]}` : ''}`,
        property: 'will-change',
        value: willChange,
        node: current,
      });
    }
    // Check for clipping
    if (overflow === 'hidden' || overflow === 'clip' || overflowX === 'hidden' || overflowX === 'clip') {
      issues.push({
        element: `${current.tagName}${current.id ? `#${current.id}` : ''}${current.className ? `.${current.className.split(' ')[0]}` : ''}`,
        property: 'overflow',
        value: overflow || overflowX,
        node: current,
      });
    }
    
    current = current.parentElement;
  }
  
  return issues.length > 0 ? issues : null;
}

export function runLayoutForensics(): LayoutForensicsReport {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const header = document.getElementById('dashboard-header');
  const search = header?.querySelector('input[type="text"]') as HTMLElement;
  const title = header?.querySelector('h1') as HTMLElement;
  const iconsCluster = header?.querySelector('.justify-self-end') as HTMLElement;
  const rail = document.querySelector('[data-floating-rail]') as HTMLElement;
  
  const railParent = rail?.parentElement;
  const isPortalToBody = railParent === document.body || railParent?.id === 'portal-root';
  
  const containingBlockIssues = checkContainingBlock(rail);
  
  const bodyStyles = window.getComputedStyle(document.body);
  const htmlStyles = window.getComputedStyle(document.documentElement);
  
  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    header: getBoundingBox(header),
    search: getBoundingBox(search),
    title: getBoundingBox(title),
    iconsCluster: getBoundingBox(iconsCluster),
    rail: getBoundingBox(rail),
    railFound: rail !== null,
    railParent: railParent ? `${railParent.tagName}${railParent.id ? `#${railParent.id}` : ''}${railParent.className ? `.${railParent.className.split(' ')[0]}` : ''}` : null,
    isPortalToBody,
    containingBlockIssues,
    globalStyles: {
      bodyOverflow: bodyStyles.overflow,
      bodyPaddingRight: bodyStyles.paddingRight,
      htmlPaddingRight: htmlStyles.paddingRight,
      bodyPosition: bodyStyles.position,
      bodyWidth: bodyStyles.width,
    },
  };
}




