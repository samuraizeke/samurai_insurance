"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { cn } from "@/lib/utils";
import { submitGeneralFeedback } from "@/lib/feedback";
import type { FeedbackType } from "@/types/feedback";
import { toast } from "sonner";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: number | null;
}

const feedbackTypes: { value: FeedbackType; label: string }[] = [
  { value: "suggestion", label: "Suggestion" },
  { value: "bug", label: "Bug Report" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

export function FeedbackModal({ open, onOpenChange, sessionId }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | "">("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeConversation, setIncludeConversation] = useState(false);

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setFeedbackType("");
    setComment("");
    setIncludeConversation(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    const result = await submitGeneralFeedback({
      rating,
      comment: comment.trim() || undefined,
      feedback_type: feedbackType || undefined,
      // Include session_id if user opted in and there's an active session
      ...(includeConversation && sessionId ? { session_id: sessionId } : {}),
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(result.message || "Thank you for your feedback!");
      resetForm();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to submit feedback");
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl font-(family-name:--font-work-sans) p-6">
        <DialogHeader className="pb-2">
          <DialogTitle
            className="font-bold text-xl"
            style={{ fontFamily: 'var(--font-alte-haas)' }}
          >
            Share Your Feedback
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Help us improve Samurai Insurance by sharing your thoughts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              How would you rate your experience?
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#de5e48] focus:ring-offset-2 rounded"
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                >
                  <FontAwesomeIcon
                    icon={
                      (hoverRating || rating) >= star
                        ? faStarSolid
                        : faStarRegular
                    }
                    className={cn(
                      "size-7 transition-colors",
                      (hoverRating || rating) >= star
                        ? "text-[#de5e48]"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              What type of feedback is this?
            </label>
            <div className="flex flex-wrap gap-2">
              {feedbackTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFeedbackType(feedbackType === type.value ? "" : type.value)
                  }
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-colors",
                    feedbackType === type.value
                      ? "bg-[#de5e48] text-white border-[#de5e48]"
                      : "bg-white text-foreground border-gray-300 hover:border-[#de5e48] hover:text-[#de5e48]"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Tell us more (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share any additional thoughts, suggestions, or issues..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#de5e48] focus:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/2000
            </p>
          </div>

          {/* Include Conversation Option - only show if there's an active session */}
          {sessionId && (
            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="includeConversation"
                checked={includeConversation}
                onChange={(e) => setIncludeConversation(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#de5e48] focus:ring-[#de5e48] cursor-pointer"
              />
              <label
                htmlFor="includeConversation"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Include current conversation for reference
                <span className="block text-xs text-muted-foreground/70 mt-0.5">
                  This helps our team review the context of your feedback
                </span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-[#fffaf3] bg-[#333333] rounded-lg hover:bg-[#444444] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#de5e48] rounded-lg hover:bg-[#c54d3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
