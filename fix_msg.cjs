const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Fix: msg.content in useEffect deps is invalid outside .map() - replace with messages
cc = cc.replace(
  '  }, [typed, typeDone, msg.content]);',
  '  }, [typed, typeDone, messages]);'
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Fixed - msg.content -> messages in useEffect deps');
