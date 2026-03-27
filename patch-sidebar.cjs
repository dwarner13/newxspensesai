const fs = require('fs');
const path = 'C:\\dev\\project-bolt-fixed\\src\\components\\navigation\\DesktopSidebar.tsx';
let c = fs.readFileSync(path, 'utf8');

// Find the Upload CTA block and More toggle block, swap their order
const moreToggleStart = '        {/* More toggle */}';
const uploadCTAStart = '        {/* Upload CTA */}';

const moreToggleEnd = '        {/* Upload CTA */}';
const uploadCTAEnd = '        {isCollapsed && (';

const moreBlock = c.slice(c.indexOf(moreToggleStart), c.indexOf(moreToggleEnd));
const uploadBlock = c.slice(c.indexOf(uploadCTAStart), c.indexOf(uploadCTAEnd));

if (c.includes(moreToggleStart) && c.includes(uploadCTAStart)) {
  c = c.replace(moreBlock + uploadBlock, uploadBlock + moreBlock);
  fs.writeFileSync(path, c, 'utf8');
  console.log('Upload moved above More');
} else {
  console.log('NOT FOUND');
}
