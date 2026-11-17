import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

export type PopupNotificationType = 'success' | 'error';

const SUCCESS_AUTO_CLOSE_MS = 1000;

export interface PopupNotificationProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    type?: PopupNotificationType;
    children?: React.ReactNode;
}

export function PopupNotification({ isOpen, onClose, title, description, type = 'success', children }: PopupNotificationProps) {
    const isSuccess = type === 'success';
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen || !isSuccess) return;

        const timer = window.setTimeout(() => {
            onCloseRef.current();
        }, SUCCESS_AUTO_CLOSE_MS);

        return () => window.clearTimeout(timer);
    }, [isOpen, isSuccess]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex flex-col items-center gap-2 pt-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full mb-2 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                        {isSuccess ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        )}
                    </div>
                    <DialogTitle className="text-xl text-center">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-center whitespace-pre-wrap">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                
                {children && (
                    <div className="flex justify-center py-6">
                        {children}
                    </div>
                )}
                
                {!isSuccess && (
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            className="px-8 font-bold text-white bg-red-600 hover:bg-red-700"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
