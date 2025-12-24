import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon } from 'lucide-react';

interface StatusConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
}

export function StatusConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Status Change',
    description = 'Are you sure you want to change the status of this order? This action may trigger an automatic notification.',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
}: StatusConfirmationDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {variant === 'destructive' && (
                            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
                        )}
                        <DialogTitle>{title}</DialogTitle>
                    </div>
                </DialogHeader>
                <div className="py-4">
                    <DialogDescription className="text-base">
                        {description}
                    </DialogDescription>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button 
                        variant={variant} 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
