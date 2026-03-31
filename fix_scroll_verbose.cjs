const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Fix 1: ensure chat panel scrolls not the page - add scroll on message update
cc = cc.replace(
  '  }, [messages]);',
  `  }, [messages]);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);`
);

// Fix 2: make Tag concise - one question at a time
cc = cc.replace(
  '"You are Tag -- XspensesAI\'s categorization expert on the CATEGORIES PAGE.\\n\\nUSER\'S FINANCIAL DATA (real, current):\\n- Total spent: "',
  '"You are Tag — XspensesAI\'s categorization expert on the CATEGORIES PAGE.\\n\\nCRITICAL RULES:\\n- Max 3 sentences per reply\\n- Ask ONE question at a time, never a list of questions\\n- Be direct and conversational, not a report\\n- No bullet lists unless asked\\n- Wait for user response before asking another question\\n\\nUSER\'S FINANCIAL DATA (real, current):\\n- Total spent: "'
);

// Fix 3: prevent the panel from causing page scroll
cc = cc.replace(
  'zIndex: 999, display: "flex", flexDirection: "column" }}',
  'zIndex: 999, display: "flex", flexDirection: "column", overscrollBehavior: "contain" }}'
);

// Fix 4: ensure scroll container has proper overflow
cc = cc.replace(
  'ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}',
  'ref={scrollRef} style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "20px 24px 140px" }}'
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Scroll + verbosity fixed');
