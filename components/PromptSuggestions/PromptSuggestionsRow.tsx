import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow = ({ onPromptClick }) => {
  const prompts = [
    { id: 1, text: 'How do I generate a token?' },
    { id: 2, text: 'What is a secure connect bundle?' },
    { id: 3, text: 'Overview of Astra DB security features' },
    // Add more prompts as needed
  ];

  return (
    <div className="flex flex-row justify-start items-center p-4">
      {prompts.map((prompt) => (
        <PromptSuggestionButton key={prompt.id} text={prompt.text} onClick={() => onPromptClick(prompt.text)} />
      ))}
    </div>
  );
};

export default PromptSuggestionRow;