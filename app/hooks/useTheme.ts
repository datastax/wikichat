"use client"

import { useState, useEffect } from 'react';
import { CategoryType } from '../../utils/consts';

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [category, setCategory] = useState<CategoryType | 'custom'>('custom');

  useEffect(() => {
    const getLocalValue = (): 'light' | 'dark' => {
      const storedValue = localStorage.getItem('theme');
      if (storedValue !== null) {
        return storedValue === 'dark' ? 'dark' : 'light';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const initialTheme = getLocalValue();
    setTheme(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (theme !== null) {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  return {
    theme,
    setTheme,
    category,
    setCategory,
  };
}

export default useTheme;
