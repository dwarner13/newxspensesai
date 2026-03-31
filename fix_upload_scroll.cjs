const fs = require('fs');
const fp = 'src/pages/UploadV2/UploadPageV2.tsx';
let cc = fs.readFileSync(fp, 'utf8');

// Add mobile bottom padding so content clears the bottom nav
cc = cc.replace(
  'style={{ fontFamily: "\'Plus Jakarta Sans\'", color: T.text, padding: "28px 36px", maxWidth: 900, margin: "0 auto" }}',
  'style={{ fontFamily: "\'Plus Jakarta Sans\'", color: T.text, padding: "28px 36px", paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))", maxWidth: 900, margin: "0 auto" }}'
);

fs.writeFileSync(fp, cc, 'utf8');
console.log('Mobile bottom padding added');
