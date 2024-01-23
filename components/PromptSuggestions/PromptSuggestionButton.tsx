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
      return <HourglassSplit size={20} />;
    case 'science':
      return <Search size={20} />;
    case 'technology':
      return <Cpu size={20} />;
    case 'arts_and_entertainment':
      return <Palette size={20} />;
    case 'sports_and_games':
      return <Joystick size={20} />;
    case 'geography':
      return <GlobeAmericas size={20} />
    case 'health_and_medicine':
      return <CapsulePill size={20} />;
    case 'society_and_politics':
      return <Bank size={20} />;
    case 'business_and_economics':
      return <Briefcase size={20} />;
    case 'philosophy_and_religion':
      return <YinYang size={20} />;
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
      <span className='self-end'><ArrowRight size={20} /></span>
    </button>
  );
};

export default PromptSuggestionButton;
