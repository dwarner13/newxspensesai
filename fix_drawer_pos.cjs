const fs = require('fs');

// ── Fix 1: CategoryDetailDrawer — accept isTagOpen prop, shift left ──────────
const fd = 'src/pages/CategoriesV2/CategoryDetailDrawer.tsx';
let cd = fs.readFileSync(fd, 'utf8');

// Add isTagOpen to props interface
cd = cd.replace(
  'interface CategoryDetailDrawerProps {\n  category: CategoryData | null;\n  onClose: () => void;\n  subcategoryFilter?: { name: string; merchantNames: string[] } | null;\n  onAskTag?: (question: string) => void;\n}',
  'interface CategoryDetailDrawerProps {\n  category: CategoryData | null;\n  onClose: () => void;\n  subcategoryFilter?: { name: string; merchantNames: string[] } | null;\n  onAskTag?: (question: string) => void;\n  isTagOpen?: boolean;\n}'
);

// Add isTagOpen to destructured props
cd = cd.replace(
  'export function CategoryDetailDrawer({ category, onClose, subcategoryFilter, onAskTag }:',
  'export function CategoryDetailDrawer({ category, onClose, subcategoryFilter, onAskTag, isTagOpen = false }:'
);

// Shift drawer right edge when Tag is open (520px panel + 8px gap)
cd = cd.replace(
  'position: "fixed", top: 0, right: 0, zIndex: 1001, width: 420',
  'position: "fixed", top: 0, right: isTagOpen ? 528 : 0, zIndex: 1001, width: 420, transition: "right 0.3s cubic-bezier(0.16,1,0.3,1)"'
);

// Also shift the backdrop to only cover the non-Tag area
cd = cd.replace(
  'position: "fixed", inset: 0, zIndex: 1000,',
  'position: "fixed", top: 0, left: 0, right: isTagOpen ? 520 : 0, bottom: 0, zIndex: 1000,'
);

fs.writeFileSync(fd, cd, 'utf8');
console.log('Fix 1 done - drawer shifts left of Tag panel');

// ── Fix 2: CategoriesPageV2 — pass isTagOpen to drawer ──────────────────────
const fp = 'src/pages/CategoriesV2/CategoriesPageV2.tsx';
let cp = fs.readFileSync(fp, 'utf8');

cp = cp.replace(
  '        onAskTag={(question) => { setCopilotInitialMessage(question); setCopilotOpen(true); }}',
  '        isTagOpen={copilotOpen}\n        onAskTag={(question) => { setCopilotInitialMessage(question); setCopilotOpen(true); }}'
);

fs.writeFileSync(fp, cp, 'utf8');
console.log('Fix 2 done - isTagOpen wired');
