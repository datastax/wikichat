import { useState } from "react";
import {forwardRef, JSXElementConstructor, RefObject} from "react";
import { Link as LinkIcon } from "react-bootstrap-icons";
import Markdown from "react-markdown";
import Link from "next/link";
import remarkGfm from "remark-gfm";

const Bubble:JSXElementConstructor<any> = forwardRef(function Bubble({ content, category }, ref) {
  const { role } = content;
  const isUser = role === "user"
  const [hasSource, setHasSource] = useState(false);

  return (
    <div ref={ref  as RefObject<HTMLDivElement>} className={`block mt-4 md:mt-6 pb-[7px] clear-both ${isUser ? 'float-right' : 'float-left'}`}>
      <div className={`flex justify-end ${hasSource ? 'mb-4' : ''}`}>
        <div className={`talk-bubble${isUser ? ' user' : ''} border p-2 md:p-4`}>
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              a({ href, children }) {
                setHasSource(true);
                return (
                  <Link
                    className={`source-link ${category} border no-wrap`}
                    href={href}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    <LinkIcon />
                    {children}
                  </Link>
                )
              }, 
              code({ node, children, ...props }) {
                return (
                  <code {...props}>
                      {children}
                  </code>
                  )
              }
            }}
          >
            {content?.content}
          </Markdown>
        </div>
      </div>
    </div>
  )
})

export default Bubble;