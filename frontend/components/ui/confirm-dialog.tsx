"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
    variant?: "default" | "destructive";
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    variant = "default",
    isLoading = false,
}: ConfirmDialogProps) {
    const [isPending, setIsPending] = React.useState(false);

    const handleConfirm = async () => {
        setIsPending(true);
        try {
            await onConfirm();
        } finally {
            setIsPending(false);
        }
    };

    const loading = isLoading || isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg rounded-2xl font-[family-name:var(--font-work-sans)] p-8">
                <DialogHeader className="pb-4">
                    <DialogTitle className="font-[family-name:var(--font-alte-haas)] text-xl">{title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-base pt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-3 pt-4">
                    <button
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="px-5 py-2.5 text-base font-medium text-[#fffaf3] bg-[#333333] rounded-lg hover:bg-[#444444] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`px-5 py-2.5 text-base font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            variant === "destructive"
                                ? "text-[#fffaf3] bg-[#EF4444] hover:bg-[#DC2626]"
                                : "text-white bg-[#de5e48] hover:bg-[#c54d3a]"
                        }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg
                                    className="animate-spin h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Deleting...
                            </span>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
