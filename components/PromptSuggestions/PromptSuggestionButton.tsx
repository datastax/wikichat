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
      className={`${category} grid grid-rows-[min-content_auto] md:grid-rows-[min-content_auto_auto] border gap-2 text-sm rounded-xl p-4 text-left focus:outline-none focus:shadow-outline`}
    >
      <span className='hidden md:block'>{categoryIcon(category)}</span>
      {question}
      <span className='justify-self-end self-end'><ArrowRight size={20} /></span>
    </button>
  );
};

export default PromptSuggestionButton;
