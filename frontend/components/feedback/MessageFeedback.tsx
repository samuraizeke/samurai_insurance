"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp, faThumbsDown } from "@fortawesome/free-solid-svg-icons";
import {
  faThumbsUp as faThumbsUpRegular,
  faThumbsDown as faThumbsDownRegular,
} from "@fortawesome/free-regular-svg-icons";
import { cn } from "@/lib/utils";
import { submitChatFeedback, getChatFeedback } from "@/lib/feedback";
import type { ChatVote } from "@/types/feedback";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageFeedbackProps {
  conversationId: number;
  className?: string;
}

export function MessageFeedback({ conversationId, className }: MessageFeedbackProps) {
  const [currentVote, setCurrentVote] = useState<ChatVote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load existing feedback on mount
  useEffect(() => {
    if (!hasLoaded && conversationId) {
      getChatFeedback(conversationId).then((vote) => {
        setCurrentVote(vote);
        setHasLoaded(true);
      });
    }
  }, [conversationId, hasLoaded]);

  const handleVote = async (vote: ChatVote) => {
    if (isLoading) return;

    setIsLoading(true);

    // Optimistic update
    const previousVote = currentVote;
    setCurrentVote(currentVote === vote ? null : vote);

    const result = await submitChatFeedback({
      conversation_id: conversationId,
      vote,
    });

    setIsLoading(false);

    if (!result.success) {
      // Revert on error
      setCurrentVote(previousVote);
      console.error("Failed to submit feedback:", result.error);
    } else {
      // Update with server response
      setCurrentVote(result.vote ?? null);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => handleVote(1)}
            disabled={isLoading}
            className={cn(
              "p-1.5 rounded-md transition-all hover:bg-[#de5e48]/10 focus:outline-none focus:ring-2 focus:ring-[#de5e48] focus:ring-offset-1",
              currentVote === 1 && "bg-[#de5e48]/20 hover:bg-[#de5e48]/30",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Thumbs up"
          >
            <FontAwesomeIcon
              icon={currentVote === 1 ? faThumbsUp : faThumbsUpRegular}
              className={cn(
                "size-3.5 transition-colors",
                currentVote === 1 ? "text-[#de5e48]" : "text-muted-foreground"
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-[#333333] text-[#f7f6f3] font-(family-name:--font-work-sans) text-xs"
        >
          {currentVote === 1 ? "Remove like" : "Good response"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => handleVote(-1)}
            disabled={isLoading}
            className={cn(
              "p-1.5 rounded-md transition-all hover:bg-[#de5e48]/10 focus:outline-none focus:ring-2 focus:ring-[#de5e48] focus:ring-offset-1",
              currentVote === -1 && "bg-[#de5e48]/20 hover:bg-[#de5e48]/30",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Thumbs down"
          >
            <FontAwesomeIcon
              icon={currentVote === -1 ? faThumbsDown : faThumbsDownRegular}
              className={cn(
                "size-3.5 transition-colors",
                currentVote === -1 ? "text-[#de5e48]" : "text-muted-foreground"
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="bg-[#333333] text-[#f7f6f3] font-(family-name:--font-work-sans) text-xs"
        >
          {currentVote === -1 ? "Remove dislike" : "Bad response"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
