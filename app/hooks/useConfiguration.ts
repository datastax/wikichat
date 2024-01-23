"use client"

import { useState, useEffect } from 'react';

const useConfiguration = () => {
  // Safely get values from localStorage
  const getLocalStorageValue = (key: string, defaultValue: any, bannedValues?: string[]) => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null && bannedValues?.includes(storedValue) === false) {
        return storedValue;
      }
    }
    return defaultValue;
  };

  const [llm, setLlm] = useState<string>(() => getLocalStorageValue('llm', 'gpt-4', ['meta.llama2-13b-chat-v1', 'ai21.j2-mid-v1', 'ai21.j2-ultra-v1']));

  const setConfiguration = (llm: string) => {
    setLlm(llm);
  }

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('llm', llm);
    }
  }, [llm]);

  return {
    llm,
    setConfiguration,
  };
}

export default useConfiguration;
