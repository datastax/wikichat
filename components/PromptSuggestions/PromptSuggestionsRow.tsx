import { CategoryType } from "../../utils/consts";
import PromptSuggestionButton from "./PromptSuggestionButton";

export interface PromptSuggestion {
  category: CategoryType;
  question: string;
}
interface Props {
  prompts: PromptSuggestion[];
  onPromptClick: (prompt: string) => void;
}

const PromptSuggestionRow = ({ prompts, onPromptClick }: Props) => {
  return (
    <div className="flex flex-row justify-center items-center py-4 gap-2">
      {prompts && prompts?.map((prompt, index) => (
        <PromptSuggestionButton 
          key={`suggestion-${index}`}
          category={prompt.category}
          question={prompt.question}
          onClick={() => onPromptClick(prompt.question)}
        />
      ))}
    </div>
  );
};

export default PromptSuggestionRow;
