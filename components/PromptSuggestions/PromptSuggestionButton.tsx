import {
  ArrowRight,
  Bank,
  Briefcase,
  CapsulePill,
  Cpu, 
  GlobeAmericas,
  HourglassSplit,
  Joystick,
  Palette,
  Search,
  YinYang
} from 'react-bootstrap-icons'
import { CategoryType } from '../../utils/consts';
interface Props {
  category: CategoryType;
  question: string;
  onClick: () => void;
}

const categoryIcon = (category: CategoryType) => {
  switch (category) {
    case 'history':
      return <HourglassSplit />;
    case 'science':
      return <Search />;
    case 'technology':
      return <Cpu />;
    case 'arts and culture':
      return <Palette />;
    case 'sports and games':
      return <Joystick />;
    case 'geography':
      return <GlobeAmericas />
    case 'health and medicine':
      return <CapsulePill />;
    case 'society and politics':
      return <Bank />;
    case 'business and economics':
      return <Briefcase />;
    case 'philosophy and religion':
      return <YinYang />;
  }
}

const PromptSuggestionButton = ({ category, question, onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="prompt-button flex flex-col justify-center gap-2 text-sm rounded-lg w-64 h-44 px-8 focus:outline-none focus:shadow-outline"
    >
      <span>{categoryIcon(category)}</span>
      {question}
      <span className='self-end'><ArrowRight /></span>
    </button>
  );
};

export default PromptSuggestionButton;
