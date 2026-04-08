<?php

namespace App\Notifications;

use App\Services\GeezSMSService;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PreOrderPaidGeezSMSNotification extends Notification
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
        // Since this is for customer SMS, we'll call this manually from the controller
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
     * Generate the SMS message (optimized for GeezSMS - max 335 characters)
     */
    private function generateSMSMessage(): string
    {
        // Format products list
        $products = $this->preOrder->items->map(function ($item) {
            return ($item->product->product_name ?? 'Unknown') . " (" . $item->quantity . ")";
        })->implode(', ');

        // Determine Discount/Order Type
        $orderTypeName = $this->preOrder->orderType?->name ?? 'Unknown';
        $isWalkin = str_contains(strtolower($orderTypeName), 'walkin');
        $discountType = $isWalkin ? 'ቅርንጫፍ ደንበኛ' : 'ሸገር ገበታ';
        $orderMethod = $isWalkin ? 'ከቅርንጫፍ ያዘዙት' : 'ደውለው ያዘዙት';

        $template = \App\Models\SmsTemplate::where('name', 'Order Paid')->first();
        if (!$template) {
            // Fallback just in case
            return "ውድ ደንበኛችን {$this->preOrder->client_name}\n\nከካልዲስ ኮፊ በቅድመ ትዕዛዝ {$orderMethod} የበዓል ቶርታ ተረጋግጧል።\n\n* የትዕዛዝ መለያ፥ {$this->preOrder->order_number}\n* ያዘዙት ቶርታ፥ {$products}\n* መውሰጃ ቀን፥ " . ($this->preOrder->collectionDay->name ?? '') . "\n* መውሰጃ ቅርንጫፍ፥ " . ($this->preOrder->collectionBranch->name ?? '') . "\n* ቅናሽ አይነት፥ {$discountType}\n\nመልካም ገና";
        }

        $replacements = [
            '{client_name}' => $this->preOrder->client_name,
            '{first_name}' => $this->preOrder->client_name,
            '{last_name}' => '',
            '{order_method}' => $orderMethod,
            '{order_number}' => $this->preOrder->order_number,
            '{products}' => $products,
            '{collection_day}' => $this->preOrder->collectionDay->name ?? '',
            '{collection_branch}' => $this->preOrder->collectionBranch->name ?? '',
            '{discount_type}' => $discountType,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template->content);
    }
}
