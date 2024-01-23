import { Tooltip } from 'react-tooltip';
import { Listbox } from '@headlessui/react';
import { useState } from 'react';
import { ChevronDown } from 'react-bootstrap-icons';

interface Props {
  llm: string;
  setConfiguration: (llm: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const Navbar = ({ llm, setConfiguration, theme, setTheme }: Props): JSX.Element => {
    const llmOptions = [
      { label: 'GPT 3.5 Turbo', value: 'gpt-3.5-turbo' },
      { label: 'GPT 4', value: 'gpt-4' },
      { label: 'GPT 4 Turbo', value: 'gpt-4-1106-preview' },
    ];

    const [selectedLlm, setSelectedLlm] = useState(llmOptions.find(opt => opt.value === llm));
  
    const handleChange = (llm) => {
      setSelectedLlm(llm)
      setConfiguration(
          llm.value,
      );
    };

    const handleToggle = () => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    };

  
    return <nav className="flex flex-col md:flex-row gap-6 rounded-t-3xl bg-body items-center md:items-start sticky top-0 z-10 p-6 md:px-16 md:pt-16">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" width="225" height="33" viewBox="0 0 225 33">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M198.382 31.23 183.975 0l-14.407 31.23h28.814Zm-5.95-3.805h-16.913l8.456-18.354 8.457 18.354Z"
          clipRule="evenodd"
        />
        <path
          fill="currentColor"
          d="M127.375 1.657c-2.253 0-4.329.517-6.202 1.566-1.85 1.026-3.318 2.482-4.391 4.347l-.007.012c-1.055 1.882-1.567 4.012-1.567 6.357v5.582c0 2.379.541 4.531 1.657 6.419 1.101 1.864 2.596 3.318 4.471 4.34l.006.004c1.889 1.015 3.945 1.519 6.148 1.519 3.613 0 6.604-.998 8.818-3.124l.005-.006c2.223-2.164 3.256-5.12 3.229-8.702l-.009-1.186h-9.224v1.195c0 1.2-.292 1.88-.665 2.264-.368.378-1.009.67-2.154.67-.89 0-1.587-.268-2.165-.786-.498-.49-.808-1.205-.808-2.301v-6.232c0-1.12.31-1.819.783-2.276.518-.5 1.178-.773 2.075-.773 1.084 0 1.7.292 2.068.689l.008.008.008.008c.42.436.714 1.12.736 2.215l.023 1.17h9.257l-.009-1.203c-.028-3.596-1.084-6.539-3.311-8.652-2.191-2.128-5.17-3.124-8.78-3.124ZM3.928 2.23H0l7.791 29h1.433l.206.767.207-.768h1.477l3.06-11.386 3.06 11.386h1.477l.208.771.206-.77h1.433l7.79-29h-3.927l-5.51 20.563L13.37 2.231H9.443l2.768 10.293-2.773 10.272-5.51-20.565ZM52.271 2.23H32.678v9.119h7.914v10.762h-7.914v9.118H52.27v-9.118h-7.913V11.35h7.913V2.231ZM63.444 2.23H59.64v29h3.804v-7.315l6.568-6.567 9.936 13.881h4.618L72.719 14.643 85.174 2.231H79.8L63.444 18.553V2.23ZM108.91 2.23H89.278v3.805h7.914v21.39h-7.914v3.804h19.632v-3.804h-7.952V6.035h7.952V2.23ZM148.038 2.23h-3.804v29h3.804V18.612h15.274v12.616h3.804V2.231h-3.804v12.578h-15.274V2.23ZM224.213 2.23h-23.875v3.805h10.054v25.194h3.766V6.035h10.055V2.23Z"
        />
      </svg>

      <div className="flex gap-2 md:ml-auto">
        <Listbox value={selectedLlm} by="value" onChange={handleChange}>
          <div className="relative">
            <Listbox.Button className="h-10 px-4 rounded-full inline-flex justify-between gap-2 items-center bg-primary text-inverse hover:bg-primary-hover">
              {selectedLlm.label}
              <ChevronDown />
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 z-20 w-40 rounded-xl bg-body border p-2">
                {llmOptions.map((llm) => (
                <Listbox.Option
                  className={({ active, selected }) =>
                    `relative cursor-default select-none px-2 py-1 rounded-xl${active ? ' bg-bg-1' : ' bg-none'}${selected ? ' font-bold bg-bg-2' : ' font-normal'}`
                  }
                  key={llm.value}
                  value={llm}
                >
                    {llm.label}
                </Listbox.Option>
                ))}
            </Listbox.Options>
          </div>
        </Listbox>

        <button onClick={handleToggle} className="inline-flex border items-center justify-center rounded-full bg-body hover:bg-bg-1 w-10 h-10">
          {theme === 'dark' ? (
              <svg aria-label="Light Mode" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M12 7C9.24 7 7 9.24 7 12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12C17 9.24 14.76 7 12 7ZM2 13H4C4.55 13 5 12.55 5 12C5 11.45 4.55 11 4 11H2C1.45 11 1 11.45 1 12C1 12.55 1.45 13 2 13ZM20 13H22C22.55 13 23 12.55 23 12C23 11.45 22.55 11 22 11H20C19.45 11 19 11.45 19 12C19 12.55 19.45 13 20 13ZM11 2V4C11 4.55 11.45 5 12 5C12.55 5 13 4.55 13 4V2C13 1.45 12.55 1 12 1C11.45 1 11 1.45 11 2ZM11 20V22C11 22.55 11.45 23 12 23C12.55 23 13 22.55 13 22V20C13 19.45 12.55 19 12 19C11.45 19 11 19.45 11 20ZM5.99 4.58C5.6 4.19 4.96 4.19 4.58 4.58C4.19 4.97 4.19 5.61 4.58 5.99L5.64 7.05C6.03 7.44 6.67 7.44 7.05 7.05C7.43 6.66 7.44 6.02 7.05 5.64L5.99 4.58ZM18.36 16.95C17.97 16.56 17.33 16.56 16.95 16.95C16.56 17.34 16.56 17.98 16.95 18.36L18.01 19.42C18.4 19.81 19.04 19.81 19.42 19.42C19.81 19.03 19.81 18.39 19.42 18.01L18.36 16.95ZM19.42 5.99C19.81 5.6 19.81 4.96 19.42 4.58C19.03 4.19 18.39 4.19 18.01 4.58L16.95 5.64C16.56 6.03 16.56 6.67 16.95 7.05C17.34 7.43 17.98 7.44 18.36 7.05L19.42 5.99ZM7.05 18.36C7.44 17.97 7.44 17.33 7.05 16.95C6.66 16.56 6.02 16.56 5.64 16.95L4.58 18.01C4.19 18.4 4.19 19.04 4.58 19.42C4.97 19.8 5.61 19.81 5.99 19.42L7.05 18.36Z" />
              </svg>
            ): (
              <svg aria-label="Dark Mode" width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M12 3.46057C7.03 3.46057 3 7.49057 3 12.4606C3 17.4306 7.03 21.4606 12 21.4606C16.97 21.4606 21 17.4306 21 12.4606C21 12.0006 20.96 11.5406 20.9 11.1006C19.92 12.4706 18.32 13.3606 16.5 13.3606C13.52 13.3606 11.1 10.9406 11.1 7.96057C11.1 6.15057 11.99 4.54057 13.36 3.56057C12.92 3.50057 12.46 3.46057 12 3.46057Z" />
              </svg>
            )
          }
          </button>

        <button id="app-tooltip" className="peer border rounded-full bg-body hover:bg-bg-1 w-10 h-10">?</button>
        <Tooltip anchorSelect="#app-tooltip" place="bottom-end" clickable className="max-w-sm md:max-w-2xl rounded-2xl z-30">
          Chatting with WikiChat is a breeze!
          Simply type your questions or requests in a clear and concise manner.
          Responses are sourced from{' '}
          <a
              className='text-link'
              href="https://en.wikipedia.org/wiki/Wikipedia:Popular_pages#Top-100_list"
              rel="noreferrer noopener"
              target="_blank"
          >
              Wikipedia&apos;s most popular pages
          </a>
          {' '}and a link to further reading is provided.
        </Tooltip>
      </div>
  </nav>
}

export default Navbar