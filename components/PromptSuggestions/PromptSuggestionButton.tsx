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
    case 'arts_and_culture':
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
      className={`${category} flex flex-col justify-center gap-2 text-sm rounded-lg w-64 h-44 px-8 focus:outline-none focus:shadow-outline`}
    >
      <span>{categoryIcon(category)}</span>
      {question}
      <span className='self-end'><ArrowRight /></span>
    </button>
  );
};

export default PromptSuggestionButton;
