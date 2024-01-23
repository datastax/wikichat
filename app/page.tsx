"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowCounterclockwise, Send } from 'react-bootstrap-icons';
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
  const { append, messages, isLoading, input, handleInputChange, handleSubmit, setMessages } = useChat();
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
  const { llm, setConfiguration } = useConfiguration();

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
    handleSubmit(e, { options: { body: { llm }}});
  }

  const handlePrompt = (promptText) => {
    const msg: Message = { id: crypto.randomUUID(),  content: promptText, role: 'user' };
    append(msg, { options: { body: { llm }}});
  };

  const handleReset = () => {
    complete('');
    setMessages([]);
    setCategory('custom');
  };

  return (
    <main className={`${category} flex h-screen flex-col items-center justify-center p-4`}>
      <section className='flex flex-col bg-body origin:w-[1200px] w-full origin:h-[800px] h-full rounded-3xl border p-6 md:p-16'>
        <Navbar 
          llm={llm}
          setConfiguration={setConfiguration}
          theme={theme} 
          setTheme={setTheme} />
        <div className='flex-1 relative overflow-y-auto my-4 md:my-6'>
          <div className='absolute w-full h-full overflow-x-hidden'>
            {messages.map((message, index) => (
              <Bubble ref={messagesEndRef} key={`message-${index}`} content={message} category={category} />
            ))}
            {isLoading && messages?.length % 2 !== 0 && <LoadingBubble ref={messagesEndRef} />}
          </div>
        </div>
        {!messages || messages.length === 0 && (
          <>
            <div className="mb-40 text-3xl text-center hidden md:block">What would you like to learn about today?</div>
            <PromptSuggestionRow prompts={suggestions} onPromptClick={handlePrompt} setCategory={setCategory} />
          </>
        )}
        <form className='flex h-[40px] gap-2' onSubmit={handleSend}>
          <div className='relative flex-1'>
            <input
              className='chatbot-input bg-transparent hover:border-primary focus:border-primary block border w-full text-sm md:text-base outline-none bg-transparent rounded-full py-2 px-4'
              onChange={handleInputChange}
              placeholder='Enter your question...'
              value={input}
            />
            <button type="submit" className='chatbot-input-icon absolute end-3 bottom-2.5'>
              <Send size={20} />
            </button>
          </div>
          <button onClick={handleReset}  className='chatbot-send-button hover:bg-primary-hover flex rounded-full items-center justify-center px-2.5 origin:px-3'>
            <ArrowCounterclockwise size={20} />
            <span className='hidden origin:block text-sm ml-2'>New chat</span>
          </button>
        </form>
        <Footer />
      </section>
    </main>
  )
}