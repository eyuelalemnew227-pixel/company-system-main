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
        $orderTypeName = $this->preOrder->orderType?->name ?? 'Unknown';
        $orderMethod = (str_contains(strtolower($orderTypeName), 'walkin')) ? 'ከቅርንጫፍ ያዘዙት' : 'በስልክ ደውለው ያዘዙት';

        $template = \App\Models\SmsTemplate::where('name', 'Order Cancelled')->first();
        if (!$template) {
            return "ውድ ደንበኛችን\n\nበቅርቡ ከካልዲስ ኮፊ {$orderMethod} ቅድመ ትዕዛዝ፡ ክፍያውን ባለማጠናቀቅዎ ተሰርዟል";
        }

        $replacements = [
            '{client_name}' => $this->preOrder->client_name,
            '{first_name}' => $this->preOrder->client_name,
            '{last_name}' => '',
            '{order_method}' => $orderMethod,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template->content);
    }
}
