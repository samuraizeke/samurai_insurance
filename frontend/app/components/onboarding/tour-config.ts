import type { DriveStep } from "driver.js";

/**
 * Product tour steps configuration
 * Each step targets elements with data-tour attributes
 */
export const tourSteps: DriveStep[] = [
  {
    element: "[data-tour='chat-input']",
    popover: {
      title: "Ask Sam Anything",
      description:
        "Type your insurance questions here. Sam can help you understand your coverage, compare policies, and answer any insurance-related questions.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='add-attachment']",
    popover: {
      title: "Upload Documents",
      description:
        "Click here to upload your insurance documents. Sam can analyze your policy, ID cards, or declarations pages to give you personalized advice.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='policy-selector']",
    popover: {
      title: "Select a Policy",
      description:
        "Once you've uploaded policies, select one here to give Sam context. This helps Sam provide more accurate answers about your specific coverage.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "[data-tour='new-chat']",
    popover: {
      title: "Start Fresh",
      description:
        "Click here anytime to start a new conversation. Your chat history is saved so you can always come back to previous discussions.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='chat-history']",
    popover: {
      title: "Your Conversations",
      description:
        "Access all your past conversations here. Click on any chat to continue where you left off.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='feedback-button']",
    popover: {
      title: "Share Your Feedback",
      description:
        "Have a suggestion or found an issue? Click here to send us feedback. We'd love to hear from you!",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='replay-tour']",
    popover: {
      title: "Replay This Tour",
      description:
        "Want to see this tour again? You can replay it anytime by clicking here.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='profile-menu']",
    popover: {
      title: "Your Profile",
      description:
        "Access your profile settings, manage your account, or sign out from here.",
      side: "top",
      align: "center",
    },
  },
];

/**
 * Mobile-optimized tour steps (fewer steps, adjusted positioning)
 */
export const mobileTourSteps: DriveStep[] = [
  {
    element: "[data-tour='chat-input']",
    popover: {
      title: "Ask Sam Anything",
      description:
        "Type your insurance questions here. Sam can help you understand your coverage and answer any questions.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='add-attachment']",
    popover: {
      title: "Upload Documents",
      description:
        "Upload your insurance documents here for personalized advice from Sam.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='policy-selector']",
    popover: {
      title: "Select a Policy",
      description:
        "Choose a policy here to give Sam context for more accurate answers.",
      side: "top",
      align: "center",
    },
  },
  {
    element: "[data-tour='sidebar-trigger']",
    popover: {
      title: "Menu & History",
      description:
        "Tap here to access the menu, start new chats, and view your conversation history.",
      side: "bottom",
      align: "start",
    },
  },
];

/**
 * Get appropriate tour steps based on viewport
 */
export function getTourSteps(): DriveStep[] {
  if (typeof window === "undefined") return tourSteps;
  return window.innerWidth < 768 ? mobileTourSteps : tourSteps;
}
