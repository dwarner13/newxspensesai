/**
 * TB-1 — universal chat header (owner GO): ChatIdentity + ChatToolbar, rendered in jsdom.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { logoSize, artworkSize, controlSize, visibleDisplayModes, CHAT_HEADER } from '../chatToolbar';

let React: typeof import('react');
let createRoot: typeof import('react-dom/client').createRoot;
let act: typeof import('react-dom/test-utils').act;
let ChatToolbar: typeof import('../../components/chat/ChatHeader').ChatToolbar;
let ChatIdentity: typeof import('../../components/chat/ChatHeader').ChatIdentity;

beforeAll(async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  const g = globalThis as unknown as Record<string, unknown>;
  for (const k of ['window', 'document', 'HTMLElement', 'Node', 'Element', 'MouseEvent', 'KeyboardEvent', 'requestAnimationFrame']) g[k] = (dom.window as unknown as Record<string, unknown>)[k];
  g.IS_REACT_ACT_ENVIRONMENT = true;
  React = await import('react');
  ({ createRoot } = await import('react-dom/client'));
  ({ act } = await import('react-dom/test-utils'));
  ({ ChatToolbar, ChatIdentity } = await import('../../components/chat/ChatHeader'));
});

function render(el: React.ReactElement) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => { root.render(el); });
  return { host, root };
}

describe('sizing rules', () => {
  it('logo 48 desktop / 44 mobile; artwork ~85%; controls 38 / 44', () => {
    expect(logoSize(false)).toBe(48);
    expect(logoSize(true)).toBe(44);
    expect(artworkSize(false)).toBe(41);
    expect(artworkSize(true)).toBe(37);
    expect(controlSize(false)).toBeGreaterThanOrEqual(36);
    expect(controlSize(false)).toBeLessThanOrEqual(40);
    expect(controlSize(true)).toBe(44);
    expect(CHAT_HEADER.artworkRatio).toBe(0.85);
  });
  it('display modes: only supported ones, never on phones, none for single-mode employees', () => {
    expect(visibleDisplayModes(['quick', 'expanded', 'workspace'], false)).toEqual(['quick', 'expanded', 'workspace']);
    expect(visibleDisplayModes(['quick', 'expanded', 'workspace'], true)).toEqual([]);
    expect(visibleDisplayModes(['quick'], false)).toEqual([]);
    expect(visibleDisplayModes(undefined, false)).toEqual([]);
  });
});

describe('ChatToolbar', () => {
  it('desktop Prime: new, history, three modes, close, all labelled', () => {
    const onSelect = vi.fn();
    const { host } = render(React.createElement(ChatToolbar, {
      employeeName: 'Prime', accent: '#c8a64e', isMobile: false,
      onNew: vi.fn(), history: { open: false, onToggle: vi.fn() },
      modes: { current: 'quick', supported: ['quick', 'expanded', 'workspace'], onSelect }, onClose: vi.fn(),
    }));
    const tb = host.querySelector('[role="toolbar"]')!;
    expect(tb.getAttribute('aria-label')).toBe('Prime conversation controls');
    const labels = [...tb.querySelectorAll('button')].map(b => b.getAttribute('aria-label'));
    expect(labels).toEqual(['New conversation', 'Conversation history', 'Quick Assist', 'Expanded', 'Full Workspace', 'Close Prime']);
    for (const b of tb.querySelectorAll('button')) expect(b.getAttribute('title')).toBeTruthy();
    const full = [...tb.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === 'Full Workspace')!;
    expect([...tb.querySelectorAll('[aria-pressed="true"]')].map(b => b.getAttribute('aria-label'))).toEqual(['Quick Assist']);
    act(() => { full.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(onSelect).toHaveBeenCalledWith('workspace');
  });

  it('mobile: no display modes; 44px buttons', () => {
    const { host } = render(React.createElement(ChatToolbar, {
      employeeName: 'Tag', accent: '#22d3ee', isMobile: true,
      onNew: vi.fn(), history: { open: true, onToggle: vi.fn() },
      modes: { current: 'quick', supported: ['quick', 'expanded', 'workspace'], onSelect: vi.fn() }, onClose: vi.fn(),
    }));
    const btns = [...host.querySelectorAll('[role="toolbar"] button')] as HTMLElement[];
    expect(btns.map(b => b.getAttribute('aria-label'))).toEqual(['New conversation', 'Conversation history', 'Close Tag']);
    for (const b of btns) { expect(b.style.width).toBe('44px'); expect(b.style.height).toBe('44px'); }
    expect(btns[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('only exposes supported functions (e.g. no New / History when not provided)', () => {
    const { host } = render(React.createElement(ChatToolbar, { employeeName: 'Byte', accent: '#34d399', isMobile: false, onClose: vi.fn() }));
    expect([...host.querySelectorAll('[role="toolbar"] button')].map(b => b.getAttribute('aria-label'))).toEqual(['Close Byte']);
  });

  it('More options: an accessible menu that runs the item and closes', () => {
    const run = vi.fn();
    const { host } = render(React.createElement(ChatToolbar, { employeeName: 'Tag', accent: '#22d3ee', isMobile: false, more: [{ label: 'Tag rules', onSelect: run }] }));
    const moreBtn = host.querySelector('[aria-label="More options"]') as HTMLElement;
    expect(moreBtn.getAttribute('aria-haspopup')).toBe('menu');
    act(() => { moreBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const item = host.querySelector('[role="menuitem"]') as HTMLElement;
    expect(item.textContent).toBe('Tag rules');
    act(() => { item.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(run).toHaveBeenCalled();
    expect(host.querySelector('[role="menu"]')).toBeNull();
  });
});

describe('ChatIdentity', () => {
  it('logo box never shrinks; artwork rendered at ~85%; one-line name and subtitle', () => {
    const renderLogo = vi.fn((px: number) => React.createElement('i', { 'data-px': px }));
    const { host } = render(React.createElement(ChatIdentity, { isMobile: false, name: 'Prime', subtitle: 'Your Financial Assistant', renderLogo }));
    expect(renderLogo).toHaveBeenCalledWith(41);
    const box = host.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(box.style.width).toBe('48px');
    expect(box.style.minWidth).toBe('48px');
    expect(box.style.flexShrink).toBe('0');
    const sub = [...host.querySelectorAll('span')].find(s => s.textContent === 'Your Financial Assistant') as HTMLElement;
    expect(sub.style.whiteSpace).toBe('nowrap');
    expect(sub.style.textOverflow).toBe('ellipsis');
  });
});
