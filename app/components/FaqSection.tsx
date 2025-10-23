import { useCallback, useState } from "react";
import { workSans } from "@/lib/fonts";

const faqItems = [
  {
    question: "Are you a marketplace?",
    answer: "No. We are your agent. We work for you from start to finish.",
  },
  {
    question: "Do I have to manage anything?",
    answer: "No. We handle the work and show you the choices. You approve.",
  },
  {
    question: "Will you make me switch carriers?",
    answer: "Only if it helps you. We explain why and you decide.",
  },
  {
    question: "Is my data sold?",
    answer:
      "No. We encrypt your documents in transit and at rest. We do not sell personal data.",
  },
  {
    question: "My renewal already started. Can you help?",
    answer: "Yes. We will flag what changed and give you a clear plan.",
  },
] as const;

export function FaqSection() {
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(() => new Set());

  const handleToggleFaq = useCallback((index: number) => {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <section className="w-full px-12 pb-16 pt-6 sm:px-16 sm:pb-36">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-20">
        <div className="lg:w-1/3">
          <h2 className="text-center text-[56px] font-bold tracking-tight text-[#f7f6f3] sm:text-[64px] lg:text-left">
            FAQ<span className="lowercase">s</span>
          </h2>
        </div>
        <div className="flex-1">
          <ul className="flex flex-col">
            {faqItems.map((faq, index) => {
              const isOpen = openFaqs.has(index);
              return (
                <li key={faq.question} className="border-b border-[#de5e48]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-xl font-bold text-[#f7f6f3] transition hover:text-[#ffb8a9] sm:text-2xl"
                    onClick={() => handleToggleFaq(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                  >
                    <span>{faq.question}</span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center text-2xl text-[#de5e48] transition-transform duration-300 ease-in-out origin-center ${isOpen ? "rotate-45" : "rotate-0"}`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    className={`${workSans.className} overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}
                    aria-hidden={!isOpen}
                  >
                    <p className="pb-6 pr-12 text-base text-[#f7f6f3]/90 sm:text-lg">
                      {faq.answer}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
