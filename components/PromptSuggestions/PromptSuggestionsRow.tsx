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
    <div className="grid grid-flow-row auto-cols-fr auto-rows-fr md:grid-flow-col gap-2">
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
