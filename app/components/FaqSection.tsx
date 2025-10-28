import { ReactNode, useCallback, useState } from "react";
import { workSans } from "@/lib/fonts";

type FaqItem = {
  question: string;
  answer: ReactNode;
};

const faqItems: FaqItem[] = [
  {
    question: "Are you a marketplace?",
    answer: (
      <p>No. We are your agent. We work for you from start to finish.</p>
    ),
  },
  {
    question: "Do I have to manage anything?",
    answer: (
      <p>No. We handle the work and show you the choices. You approve.</p>
    ),
  },
  {
    question: "Will you make me switch carriers?",
    answer: (
      <p>Only if it helps you. We explain why and you decide.</p>
    ),
  },
  {
    question: "Is my data sold?",
    answer: (
      <p>
        No. We encrypt your documents in transit and at rest. We do not sell
        personal data.
      </p>
    ),
  },
  {
    question: "My renewal already started. Can you help?",
    answer: (
      <p>Yes. We will flag what changed and give you a clear plan.</p>
    ),
  },
  {
    question: "When will SamurAI be available?",
    answer: (
      <p>
        We're in private beta and opening state by state. Join the waitlist and
        we'll email you when we are live in your state. That way you are the
        first to know!
      </p>
    ),
  },
  {
    question: "What do I get for joining the waitlist?",
    answer: (
      <ul className="list-disc list-inside space-y-2">
        <li>An early-access invite when your state opens.</li>
        <li>Occasional rollout updates.</li>
        <li>
          Special access to suggest new features and influence the future of
          insurance!
        </li>
      </ul>
    ),
  },
  {
    question: "Is Samurai Insurance right for me?",
    answer: (
      <>
        <p>
          If your premiums are creeping up, you're short on time, and you want
          straight answers, you'll love Samurai Insurance. With Samurai, you'll
          get:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>Annual price checks with clear explanations.</li>
          <li>any quotes, changes, and paperwork handled for you.</li>
          <li>Answers on demand to all of your insurance questions.</li>
        </ul>
      </>
    ),
  },
];

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
                    <div className="space-y-4 pb-6 pr-12 text-base text-[#f7f6f3]/90 sm:text-lg">
                      {faq.answer}
                    </div>
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
