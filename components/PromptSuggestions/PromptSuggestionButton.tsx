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
    case 'arts_and_entertainment':
      return <Palette />;
    case 'sports_and_games':
      return <Joystick />;
    case 'geography':
      return <GlobeAmericas />
    case 'health_and_medicine':
      return <CapsulePill />;
    case 'society_and_politics':
      return <Bank />;
    case 'business_and_economics':
      return <Briefcase />;
    case 'philosophy_and_religion':
      return <YinYang />;
  }
}

const PromptSuggestionButton = ({ category, question, onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className={`${category} flex flex-col border justify-center gap-1 md:gap-2 text-sm rounded-lg w-full md:w-64 md:h-44 p-4 md:px-8 focus:outline-none focus:shadow-outline`}
    >
      <span className='hidden md:block'>{categoryIcon(category)}</span>
      {question}
      <span className='self-end'><ArrowRight /></span>
    </button>
  );
};

export default PromptSuggestionButton;
