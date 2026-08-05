import { useState, useCallback } from 'react';
import { PopupNotification, type PopupNotificationType } from '@/components/shared/popup-notification';

export function usePopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [popupData, setPopupData] = useState<{ title: string; description: string; type: PopupNotificationType }>({
        title: '',
        description: '',
        type: 'success'
    });

    const triggerPopup = useCallback((title: string, description: string, type: PopupNotificationType = 'success') => {
        setPopupData({ title, description, type });
        setIsOpen(true);
    }, []);

    const PopupComponent = useCallback(() => (
        <PopupNotification
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title={popupData.title}
            description={popupData.description}
            type={popupData.type}
        />
    ), [isOpen, popupData]);

    return { triggerPopup, PopupComponent };
}
