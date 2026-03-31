const fs = require('fs');

// Force brighter text in the hero banner labels in CategoriesPageV2
const fp = 'src/pages/CategoriesV2/CategoriesPageV2.tsx';
let cp = fs.readFileSync(fp, 'utf8');
// The period label and excl. transfers text use THEME.textDim inline
// Bump all fontSize 10/11 labels to 12 and brighten
cp = cp.replace(/fontSize: 10, textTransform: "uppercase", letterSpacing: 1\.4, color: THEME\.textDim/g,
  'fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, color: "#94a3b8"');
cp = cp.replace(/fontSize: 11, color: THEME\.textDim/g, 'fontSize: 12, color: "#94a3b8"');
cp = cp.replace(/fontSize: 12, color: THEME\.textDim/g, 'fontSize: 13, color: "#94a3b8"');
fs.writeFileSync(fp, cp, 'utf8');
console.log('CategoriesPageV2 text brightened');

// StatCard
const fs2 = 'src/pages/CategoriesV2/StatCard.tsx';
if (require('fs').existsSync(fs2)) {
  let cs = fs.readFileSync(fs2, 'utf8');
  cs = cs.replace(/color: THEME\.textDim/g, 'color: "#94a3b8"');
  cs = cs.replace(/color: THEME\.textMuted/g, 'color: "#cbd5e1"');
  cs = cs.replace(/fontSize:?\s*["\s]?9["\s]?/g, 'fontSize: 11');
  cs = cs.replace(/fontSize:?\s*["\s]?10["\s]?/g, 'fontSize: 12');
  fs.writeFileSync(fs2, cs, 'utf8');
  console.log('StatCard text brightened');
}
