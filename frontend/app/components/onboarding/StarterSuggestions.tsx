"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faCircleDollarToSlot,
  faHouseChimney,
  faFileArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface Suggestion {
  id: string;
  icon: IconDefinition;
  title: string;
  prompt: string;
  /** If true, triggers upload modal instead of populating textarea */
  triggersUpload?: boolean;
}

const suggestions: Suggestion[] = [
  {
    id: "review-coverage",
    icon: faClipboardList,
    title: "Review my coverage",
    prompt:
      "Can you review my insurance coverage and tell me if I have any gaps or areas where I might be underinsured?",
  },
  {
    id: "understand-deductible",
    icon: faCircleDollarToSlot,
    title: "Understand my deductible",
    prompt:
      "Can you explain what my deductible is and when I would need to pay it? What happens if I have a claim?",
  },
  {
    id: "home-vs-renters",
    icon: faHouseChimney,
    title: "Home vs. renters insurance",
    prompt:
      "What's the difference between home insurance and renters insurance? Which one do I need?",
  },
  {
    id: "upload-policy",
    icon: faFileArrowUp,
    title: "Upload a policy",
    prompt: "",
    triggersUpload: true,
  },
];

interface StarterSuggestionsProps {
  /** Called when a suggestion is selected (populates textarea) */
  onSelectPrompt: (prompt: string) => void;
  /** Called when upload suggestion is clicked */
  onTriggerUpload: () => void;
  /** Additional className for the container */
  className?: string;
}

export function StarterSuggestions({
  onSelectPrompt,
  onTriggerUpload,
  className,
}: StarterSuggestionsProps) {
  const handleClick = (suggestion: Suggestion) => {
    if (suggestion.triggersUpload) {
      onTriggerUpload();
    } else {
      onSelectPrompt(suggestion.prompt);
    }
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto px-3 sm:px-4", className)}>
      <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4 font-(family-name:--font-work-sans)">
        Try asking Sam about...
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => handleClick(suggestion)}
            className={cn(
              "group flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl",
              "bg-white/60 backdrop-blur-sm border border-[#333333]/8",
              "hover:bg-white hover:border-[#de5e48]/30 hover:shadow-md",
              "active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#de5e48] focus-visible:ring-offset-2",
              "transition-all duration-200 cursor-pointer",
              "min-h-20 sm:min-h-25"
            )}
            type="button"
          >
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full",
                "bg-[#de5e48]/10 text-[#de5e48]",
                "group-hover:bg-[#de5e48]/20",
                "transition-colors duration-200"
              )}
            >
              <FontAwesomeIcon icon={suggestion.icon} className="size-3.5 sm:size-4" />
            </div>
            <span
              className={cn(
                "text-xs sm:text-sm font-medium text-center text-[#333333]",
                "font-(family-name:--font-work-sans)",
                "leading-tight"
              )}
            >
              {suggestion.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
