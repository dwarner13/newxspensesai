// Mock OpenAI for frontend builds
// This prevents the frontend from trying to import server-side OpenAI modules

export default {
  OpenAI: class MockOpenAI {
    constructor() {
      console.warn('OpenAI is not available in the frontend - this is expected');
    }
  }
};

export const OpenAI = class MockOpenAI {
  constructor() {
    console.warn('OpenAI is not available in the frontend - this is expected');
  }
};
