import {forwardRef, JSXElementConstructor, RefObject} from "react";

const LoadingBubble:JSXElementConstructor<any> = forwardRef(function LoadingBubble({}, ref) {

  return (
    <div ref={ref  as RefObject<HTMLDivElement>} className={'block mt-4 md:mt-6 pb-[7px] clear-both float-left'}>
      <div className={'flex justify-end'}>
        <div className={'talk-bubble p-2 md:p-4'}>
          <div className="w-6 h-6 flex items-center justify-center">
            <div className="dot-flashing" />
          </div>
        </div>
      </div>
    </div>
  )
});

export default LoadingBubble;