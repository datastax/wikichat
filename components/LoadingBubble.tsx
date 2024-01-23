import {forwardRef, JSXElementConstructor, RefObject} from "react";

const LoadingBubble:JSXElementConstructor<any> = forwardRef(function LoadingBubble({}, ref) {

  return (
    <div ref={ref  as RefObject<HTMLDivElement>} className={'relative mr-24 md:mr-52'}>
      <div className="border p-3 max-w-fit rounded-t-xl mr-auto rounded-br-xl">
        <div className="w-6 h-6 flex items-center justify-center">
            <div className="dot-flashing" />
        </div>
      </div>
    </div>
  )
});

export default LoadingBubble;