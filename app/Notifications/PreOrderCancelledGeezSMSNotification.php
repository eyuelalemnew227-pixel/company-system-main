<?php

namespace App\Notifications;

use App\Services\GeezSMSService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PreOrderCancelledGeezSMSNotification extends Notification
{
    use Queueable;

    protected $preOrder;
    protected $smsService;

    public function __construct($preOrder)
    {
        $this->preOrder = $preOrder;
        $this->smsService = app(GeezSMSService::class);
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return [];
    }

    /**
     * Send SMS directly to customer using GeezSMS
     */
    public function sendCustomerSMS(): bool
    {
        if (!$this->smsService->isConfigured()) {
            return false;
        }

        $message = $this->generateSMSMessage();
        
        return $this->smsService->sendMessage(
            $this->preOrder->phone_number,
            $message
        );
    }

    /**
     * Generate the SMS message (optimized for GeezSMS)
     */
    private function generateSMSMessage(): string
    {
        $message = "KALDIS - Order Cancelled\n";
        $message .= "Order #: {$this->preOrder->order_number}\n";
        $message .= "Hi {$this->preOrder->client_name},\n";
        $message .= "We're sorry, but your order has been CANCELLED.\n\n";
        
        $message .= "If you have questions, please contact the branch.\n";
        $message .= "Thank you for choosing KALDIS!";
        
        return $message;
    }
}
