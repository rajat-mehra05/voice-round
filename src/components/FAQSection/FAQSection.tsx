import { Accordion } from '@base-ui/react/accordion';
import { ChevronRight, Plus } from 'lucide-react';
import { FAQ_ITEMS } from '@/constants/copy';

export function FAQSection() {
  return (
    <section aria-labelledby="faq-heading" className="space-y-8">
      <h2
        id="faq-heading"
        className="flex items-center gap-1 text-2xl font-black uppercase tracking-tight text-black sm:text-3xl"
      >
        <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" strokeWidth={3} />
        Frequently asked{' '}
        <span className="relative inline-block">
          <span className="relative z-10">questions</span>
          <span
            className="absolute bottom-1 left-0 -z-0 h-2 w-full -rotate-1 bg-neo-accent sm:h-2.5"
            aria-hidden="true"
          />
        </span>
      </h2>

      <Accordion.Root className="border-4 border-black bg-white px-6 sm:px-8">
        {FAQ_ITEMS.map((item, index) => (
          <Accordion.Item
            key={item.question}
            value={index}
            className="border-b-2 border-black last:border-b-0"
          >
            <Accordion.Header className="m-0">
              <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-4 py-6 text-left transition-colors hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
                <span className="text-base font-bold text-black sm:text-lg">{item.question}</span>
                <Plus
                  className="size-5 shrink-0 text-black transition-transform duration-200 ease-out group-data-[panel-open]:rotate-45"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden transition-[height,opacity] duration-200 ease-out data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0">
              <p className="pb-6 pr-9 text-sm font-medium leading-relaxed text-black/70 sm:text-base">
                {item.answer}
              </p>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
