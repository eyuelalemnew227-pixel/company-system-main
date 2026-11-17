import { useState, useCallback } from 'react';
import { PopupNotification, type PopupNotificationType } from '@/components/shared/popup-notification';

export function usePopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [popupData, setPopupData] = useState<{ title: string; description: string; type: PopupNotificationType }>({
        title: '',
        description: '',
        type: 'success'
    });

    const closePopup = useCallback(() => setIsOpen(false), []);

    const triggerPopup = useCallback((title: string, description: string, type: PopupNotificationType = 'success') => {
        setPopupData({ title, description, type });
        setIsOpen(true);
    }, []);

    const PopupComponent = useCallback(() => (
        <PopupNotification
            isOpen={isOpen}
            onClose={closePopup}
            title={popupData.title}
            description={popupData.description}
            type={popupData.type}
        />
    ), [isOpen, popupData, closePopup]);

    return { triggerPopup, PopupComponent };
}
