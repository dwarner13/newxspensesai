const fs = require('fs');
const fp = 'src/pages/PrimeChatV2/PrimeChatV2.tsx';
let pp = fs.readFileSync(fp, 'utf8');

// Fix the broken setTimeout block
pp = pp.replace(
  `    void sendMessage(prompt, { hidden: true });
    }, 800);`,
  `    setTimeout(() => {
      void sendMessage(prompt, { hidden: true });
    }, 800);`
);

fs.writeFileSync(fp, pp, 'utf8');
console.log('Fixed');
