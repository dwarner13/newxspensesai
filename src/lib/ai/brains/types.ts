export type EmployeeKey =
  | 'prime'
  | 'prime-boss'
  | 'byte'
  | 'byte-docs'
  | 'crystal'
  | 'crystal-analytics'
  | 'goalie'
  | 'goalie-goals'
  | 'goalie-ai'
  | 'ledger'
  | 'custodian'
  | 'liberty'
  | string;

export type BrainTone = {
  vibe: string;
  do: string[];
  dont: string[];
};

export type BrainWorkflow = {
  whenToAskQuestions: string[];
  defaultPlanFormat: string[];
  handoffRules: string[];
};

export type BrainOutputFormat = {
  default: string;
  examples?: string[];
};

export type BrainPack = {
  employee_key: EmployeeKey;
  displayName: string;
  identity: string;
  mission: string;
  tone: BrainTone;
  workflow: BrainWorkflow;
  output: BrainOutputFormat;

  buildSystemPrompt: (args: {
    employee_key: string;
    ai_fluency_level?: string | null;
    preferredName?: string | null;
    currency?: string | null;
  }) => string;
};
