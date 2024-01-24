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
    <div ref={ref  as RefObject<HTMLDivElement>} className={`relative ${isUser ? 'ml-24 md:ml-52' : 'mr-24 md:mr-52'}`}>
      <Markdown
        className={`border p-3 max-w-fit rounded-t-xl ${isUser ? 'ml-auto bg-bg-2 rounded-bl-xl' : 'mr-auto rounded-br-xl'}${hasSource ? ' mb-8' : ''}`}
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            setHasSource(true);
            return (
              <Link
                className={`${category} absolute flex px-2 gap-1 items-center mt-5 rounded-b-lg rounded-tr-lg border no-wrap end-0`}
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
  )
})

export default Bubble;