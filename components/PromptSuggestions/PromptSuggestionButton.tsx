
const PromptSuggestionButton = ({ text, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="prompt-button py-2 px-4 rounded-lg mr-2 overflow-hidden whitespace-nowrap focus:outline-none focus:shadow-outline"
    >
      {text}
    </button>
  );
};

export default PromptSuggestionButton;
