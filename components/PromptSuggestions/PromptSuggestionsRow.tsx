import { CategoryType } from "../../utils/consts";
import PromptSuggestionButton from "./PromptSuggestionButton";

export interface PromptSuggestion {
  category: CategoryType;
  question: string;
}
interface Props {
  prompts: PromptSuggestion[];
  onPromptClick: (prompt: string) => void;
  setCategory: (category: CategoryType | 'custom') => void;
}

const PromptSuggestionRow = ({ prompts, onPromptClick, setCategory }: Props) => {
  return (
    <div className="flex flex-col md:flex-row justify-center items-center py-4 gap-2">
      {prompts && prompts?.map((prompt, index) => (
        <PromptSuggestionButton 
          key={`suggestion-${index}`}
          category={prompt.category}
          question={prompt.question}
          onClick={() => {
            setCategory(prompt.category)
            onPromptClick(prompt.question)
          }}
        />
      ))}
    </div>
  );
};

export default PromptSuggestionRow;
