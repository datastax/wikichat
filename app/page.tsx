"use client";
import { useEffect, useRef, useState } from 'react';
import Bubble from '../components/Bubble'
import { useChat, useCompletion } from 'ai/react';
import Footer from '../components/Footer';
import useConfiguration from './hooks/useConfiguration';
import useTheme from './hooks/useTheme';
import PromptSuggestionRow, { PromptSuggestion } from '../components/PromptSuggestions/PromptSuggestionsRow';
import { Message } from 'ai';
import LoadingBubble from '../components/LoadingBubble';
import Navbar from '../components/Navbar';

export default function Home() {
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const { append, messages, isLoading, input, handleInputChange, handleSubmit } = useChat();
  const { complete } = useCompletion({
    onFinish: (prompt, completion) => {
      const parsed = JSON.parse(completion);
      const questions = parsed?.questions;
      const questionsArr: PromptSuggestion[] = [];
      questions.forEach(q => {
        questionsArr.push(q);
      });
      setSuggestions(questionsArr);
    }
  });
  const { category, setCategory, theme, setTheme } = useTheme();
  const { useRag, llm, similarityMetric, setConfiguration, collection } = useConfiguration();

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    complete('')
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    handleSubmit(e, { options: { body: { useRag, llm, similarityMetric}}});
  }

  const handlePrompt = (promptText) => {
    const msg: Message = { id: crypto.randomUUID(),  content: promptText, role: 'user' };
    append(msg, { options: { body: { collection, llm, similarityMetric}}});
  };

  return (
    <main className={`${category} flex h-screen flex-col items-center justify-center`}>
      <section className='flex flex-col bg-body origin:w-[1200px] w-full origin:h-[800px] h-full rounded-3xl border p-16'>
        <Navbar 
          useRag={useRag}
          llm={llm}
          similarityMetric={similarityMetric}
          setConfiguration={setConfiguration}
          theme={theme} 
          setTheme={setTheme} />
        <div className='flex-1 relative overflow-y-auto my-4 md:my-6'>
          <div className='absolute w-full h-full overflow-x-hidden'>
            {messages.map((message, index) => <Bubble ref={messagesEndRef} key={`message-${index}`} content={message} />)}
            {isLoading && messages?.length % 2 !== 0 && <LoadingBubble ref={messagesEndRef} />}
          </div>
        </div>
        {!messages || messages.length === 0 && (
          <PromptSuggestionRow prompts={suggestions} onPromptClick={handlePrompt} setCategory={setCategory} />
        )}
        <form className='flex h-[40px] gap-2' onSubmit={handleSend}>
          <input onChange={handleInputChange} value={input} className='chatbot-input flex-1 text-sm md:text-base outline-none bg-transparent rounded-full p-2' placeholder='Send a message...' />
          <button type="submit" className='chatbot-send-button flex rounded-full items-center justify-center px-2.5 origin:px-3'>
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path d="M2.925 5.025L9.18333 7.70833L2.91667 6.875L2.925 5.025ZM9.175 12.2917L2.91667 14.975V13.125L9.175 12.2917ZM1.25833 2.5L1.25 8.33333L13.75 10L1.25 11.6667L1.25833 17.5L18.75 10L1.25833 2.5Z" />
            </svg>
            <span className='hidden origin:block font-semibold text-sm ml-2'>Send</span>
          </button>
        </form>
        <Footer />
      </section>
    </main>
  )
}