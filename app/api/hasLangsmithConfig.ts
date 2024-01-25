const hasLangsmithConfig = (): boolean => {
  return !!process.env.LANGSMITH_API_KEY;
};

export default hasLangsmithConfig;
