<?php
$holidays = \App\Models\CollectionDay::where('status', 'Active')->orderBy('display_order')->get(['id', 'name', 'date'])->toArray();

$products = \App\Models\PreOrderProduct::where('status', 'Active')->orderBy('id')->get(['id', 'product_name', 'unit_price', 'walkin_price', 'image', 'description'])->toArray();
$baseUrl = config('app.url') . '/';
array_walk($products, function(&$p) use ($baseUrl) {
    if (!empty($p['image']) && strpos($p['image'], 'http') === false) {
        $p['image'] = $baseUrl . 'uploads/' . $p['image'];
    }
});

$branches = \App\Models\Branch::where('status', 'active')->where('is_pre_order_branch', true)->orderBy('name')->get(['id', 'branch_code', 'name', 'location', 'contact_phone'])->toArray();

$paymentMethods = \App\Models\PreOrderPaymentSetting::where('is_active', true)->get(['id', 'payment_method', 'account_name', 'account_number', 'instructions', 'example'])->map(function($p) {
    return [
        'id' => $p->id,
        'name' => $p->payment_method,
        'payment_method' => $p->payment_method,
        'account_name' => $p->account_name ?: "Kaldi's Coffee",
        'account_number' => $p->account_number ?: '',
        'instructions' => $p->instructions ?: '',
    ];
})->toArray();

$bot = \App\Models\TelegramBot::whereIn('slug', ['pre_order', 'pre-order', 'pre-order-bot'])->first();
$maintenanceMode = $bot ? !$bot->is_active : false;

$lang = request('lang', 'en');
$chatId = request('chat_id', '');

$translations = [
    'en' => [
        'title' => "Kaldi's Coffee", 'subtitle' => 'Holiday Torta Pre-Order',
        'step_1' => 'Details', 'step_2' => 'Tortas', 'step_3' => 'Branch', 'step_4' => 'Date', 'step_5' => 'Payment', 'step_6' => 'Proof', 'step_7' => 'Source', 'step_8' => 'Review',
        'fname_label' => 'First Name', 'lname_label' => 'Last Name', 'sname_label' => 'Surname (Optional)',
        'phone_label' => 'Active Phone Number', 'phone_hint' => 'Enter format: +251912345678 or 912345678',
        'select_tortas' => 'Select Your Favorite Tortas', 'select_branch' => 'Choose Collection Branch', 'search_branch' => 'Search branch...', 'select_date' => 'Select Collection Date', 'select_payment' => 'Select Payment Method',
        'order_summary' => 'Order Receipt', 'total' => 'Total', 'etb' => 'ETB',
        'next' => 'Continue', 'back' => 'Back', 'place_order' => 'Place Order',
        'payment_proof' => 'Payment Verification', 'upload_slip' => 'Screenshot or PDF (Required)', 'enter_reference' => 'Reference Number', 'reference_placeholder' => 'Transaction ID', 'or' => 'OR',
        'hear_about' => 'How did you hear about us?',
        'order_success' => 'Order Placed Successfully!', 'order_number' => 'Order Number', 'thank_you' => 'Thank you for choosing Kaldi\'s Coffee. We will get back to you with the confirmation message.', 'order_again' => 'Order Again',
        'pay_to' => 'Pay to', 'your_cart' => 'Cart', 'add' => 'Add',
        'terms_label' => 'I agree to the terms.', 'terms_link' => 'Read Terms',
        'read_terms' => 'Terms & Conditions',
        'terms_payment_title' => 'Payment Verification', 'terms_payment_desc' => 'Payment must be verified before the order is confirmed. Partial or sequential payments will result in order cancellation.',
        'terms_pickup_title' => 'Collection Policy', 'terms_pickup_desc' => 'Orders must be collected on the selected date and at the selected branch only. Orders not collected on time may be cancelled.',
        'terms_full_payment_title' => 'Full Payment Required', 'terms_full_payment_desc' => 'The order you placed will only be processed when you have made a valid and full payment for the product ordered. Orders without any payment history will not be accepted.',
        'error_terms' => 'Please accept the terms.', 'error_name' => 'Please fill in first and last name.', 'error_phone' => 'Phone must be +251 followed by 9 or 7, then 8 more digits.', 'error_fields' => 'Please complete all required fields.', 'error_order' => 'Order failed. Please try again.', 'processing' => 'Processing...',
        'error_select_branch' => 'Select a collection branch.', 'error_select_date' => 'Select a collection date.', 'error_select_payment' => 'Select a payment method.', 'error_select_source' => 'Tell us how you heard about us.', 'error_slip' => 'Screenshot or PDF is required.',
        'summary_customer' => 'Customer', 'summary_pickup' => 'Collection', 'summary_payment' => 'Payment', 'summary_proof' => 'Proof', 'summary_name' => 'Name', 'summary_phone' => 'Phone', 'summary_branch' => 'Branch', 'summary_date' => 'Date', 'summary_ref' => 'Ref', 'summary_slip' => 'Slip',
        'flow_step_1' => 'Product Selection', 'flow_step_2' => 'Collection Location', 'flow_step_3' => 'Payment', 'flow_step_4' => 'Collect',
        'help_support' => 'Help & Support', 'join_community' => 'Join Community',
        'warning_first_page' => 'Without attaching the Payment Slip, your order will NOT be processed.',
        'source_instagram' => 'Instagram', 'source_sms' => 'SMS',
        'exit_warning_title' => 'Order Not Placed', 'exit_warning_msg' => 'Leave without placing order? Data will be lost.', 'exit_confirm' => 'Yes, Exit', 'exit_cancel' => 'No, Stay',
        'payment_warning' => "After you transfer, screenshot the payment slip and attach it on the next page.",
        'view_order' => 'View Your Order', 'track_order' => 'Track Your Order',
        'warning_slide' => 'Attention: Your order will not be processed unless a payment receipt is attached upon submission.',
        'choose_lang' => 'Choose Language', 'call_us' => 'Call Us',
        'welcome_msg' => 'Pre-order your holiday torta and collect it at your nearest branch.',
        'summary_source' => 'Heard Via', 'summary_items' => 'Items Ordered',
        'telegram_only_title' => 'Telegram Required', 'telegram_only_msg' => 'This app can only be used inside Telegram.', 'open_telegram' => 'Open in Telegram',
        'lang_en_desc' => 'Continue in English', 'lang_am_desc' => 'Continue in Amharic',
        'maintenance_title' => 'Pre-Order Closed', 'maintenance_msg' => 'We are not accepting orders at this time. Please check back later!', 'maintenance_thanks' => 'Thank you for choosing Kaldi\'s Coffee',
        'no_branches' => 'No collection branches available at this time.',
        'no_branches_desc' => 'All branches are currently unavailable. Please check back later or contact support.',
        'tap_to_view' => 'Tap to view full image',
        'tap_enlarge' => 'Tap to enlarge',
        'pdf_attached' => 'PDF attached',
        'error_file_type' => 'Only screenshots and PDF files are accepted.',
        'digits_counter' => 'digits',
        'confirm_order_title' => 'Confirm Your Order',
        'confirm_order_msg' => 'Are you sure you want to place this order? Please review your receipt carefully before confirming.',
        'confirm_order_yes' => 'Yes, Place Order',
        'confirm_order_no' => 'No, Go Back',
        'confirm_order_checking' => 'Checking...',
        'error_duplicate_ref' => 'This reference number has already been used. Please enter a different transaction ID.',
        'confirm_total_label' => 'Order Total'
    ],
    'am' => [
        'title' => 'ካልዲስ ቡና', 'subtitle' => 'የበዓል ቶርታ ቅድመ-ትእዛዝ',
        'step_1' => 'መረጃ', 'step_2' => 'ቶርታ', 'step_3' => 'ቅርንጫፍ', 'step_4' => 'ቀን', 'step_5' => 'ክፍያ', 'step_6' => 'ማረጋገጫ', 'step_7' => 'ምንጭ', 'step_8' => 'ማጠቃለያ',
        'fname_label' => 'የስም', 'lname_label' => 'የአባት ስም', 'surname_label' => 'የአያት ስም (አማራጭ)',
        'phone_label' => 'ስልክ ቁጥር', 'phone_hint' => 'ይህንን ያስገቡ: +251912345678 ወይም 912345678',
        'select_tortas' => 'ቶርታ ይምረጡ', 'select_branch' => 'የመሰብሰቢያ ቅርንጫፍ ይምረጡ', 'search_branch' => 'ቅርንጫፍ ፈልግ...', 'select_date' => 'የመሰብሰቢያ ቀን ምረጡ', 'select_payment' => 'ክፍያ ዘዴ ምረጡ',
        'order_summary' => 'የትእዛዝ ማጠቃልያ', 'total' => 'ጠቅላላ ክፍያ', 'etb' => 'ብር',
        'next' => 'ቀጥል', 'back' => 'ተመለስ', 'place_order' => 'ትዕዛዙን ላክ',
        'payment_proof' => 'የክፍያ ማረጋገጫ', 'upload_slip' => 'ስክሪንሾት ወይም PDF (አስፈላጊ)', 'enter_reference' => 'ሪፈረንስ ቁጥር (አማራጭ)', 'reference_placeholder' => 'ሪፈረንስ ቁጥር', 'or' => 'ወይም',
        'hear_about' => 'ስለ ካልዲስ ቅድመ ትእዛዝ ከየት ሰሙ?',
        'order_success' => 'ትእዛዞዎ ተልኳል!', 'order_number' => 'ቁጥር', 'thank_you' => 'ካልዲስ ቡናን ስለመረጡ እናመሰግናለን። የማረጋገጫ መልእክት ይደርስዎታል። መልካም በዓል ይሁንልዎ', 'order_again' => 'እንደገና ለማዘዝ',
        'pay_to' => 'ይክፈሉ ለ', 'your_cart' => 'ጋሪ', 'add' => 'አክል',
        'terms_label' => 'እቀበላለሁ', 'terms_link' => 'ውሎችን አንብ',
        'read_terms' => 'ውሎችና መመሪያዎች',
        'terms_payment_title' => 'የክፍያ ማረጋገጫ',
        'terms_payment_desc' => 'ትእዛዝዎ ከመረጋገጡ በፊት ክፍያው ሙሉ በሙሉ መፈፀሙን እና መረጋገጥ አለበት። ከዚህ በታች ያለውን የክፍያ ዘዴ ተጠቅመው እና ሙሉ የሆነ ክፍያ ካደረጉ በኋላ ማረጋገጫው ይከናወናል። የተሳሳተ ወይም የጎደለ ክፍያ ካደረጉ ትእዛዝዎ የሚሰረዝ ይሆናል።',
        'terms_pickup_title' => 'ትእዛዞን የመሰብሰብ ፖሊሲ',
        'terms_pickup_desc' => 'ትእዛዞች በመረጡት ቀን እና ቅርንጫፍ ብቻ ነው መሰብሰብ የሚችሉት። ትእዛዞን እንዲቀበልሎት ሰው ከወከሉ የከፈሉበትን ደረሰኝ እና በካልዲሰ ኮፊ በኩል የተላከሎትን መልዕክት ለወከሉት ሰው መስጠቶዎ እንዳይረሳ። በመረጡት ቀን እና ቅርንጫፍ ካልሰበሰቡ ትእዛዝዎ የሚሰረዝ ይሆናል።',
        'terms_full_payment_title' => 'ሙሉ ክፍያ ያስፈልጋል',
        'terms_full_payment_desc' => 'የሰጡት ትእዛዝ የተጠየቁት ምርቶች ሙሉ ክፍያ ካደረጉ በኋላ ብቻ የሚሰራ ይሰራል። የክፍያ ታሪክ የሌለው ወይም ምንም አይነት ክፍያ ያልተገኘም ትእዛዝ ተቀባይነት አይኖረውም።',
        'error_terms' => 'ውሎችን ይቀበሉ።', 'error_name' => 'ስም ይሙሉ።', 'error_phone' => 'ስልክ ቁጥር +251 9 ወይም 7 ከ8 ተጨማሪ አሃዝ ጋር መሆን አለበት።', 'error_fields' => 'መረጃ ይሙሉ።', 'error_order' => 'ስህተት።', 'processing' => 'በሂደት ላይ...',
        'error_select_branch' => 'የመሰብሰቢያ ቅርንጫፍ ምረጡ።', 'error_select_date' => 'የመሰብሰቢያ ቀን ምረጡ።', 'error_select_payment' => 'ክፍያ ዘዴ ምረጡ።', 'error_select_source' => 'ምንጭ ምረጡ።', 'error_slip' => 'ስክሪንሾት ወይም PDF አስፈላጊ ነው።',
        'summary_customer' => 'ደንበኛ', 'summary_pickup' => 'መሰብሰቢያ', 'summary_payment' => 'ክፍያ', 'summary_proof' => 'ማረጋገጫ', 'summary_name' => 'ስም', 'summary_phone' => 'ስልክ', 'summary_branch' => 'ቅርንጫፍ', 'summary_date' => 'ቀን', 'summary_ref' => 'ማመልከቻ', 'summary_slip' => 'ስክሪንሾት',
        'flow_step_1' => 'የምርት ምርጫ', 'flow_step_2' => 'የመሰብሰቢያ ቦታ', 'flow_step_3' => 'ክፍያ', 'flow_step_4' => 'ተቀበል',
        'help_support' => 'እገዛ', 'join_community' => 'ቡድናችንን ተቀላቀል',
        'warning_first_page' => 'የክፍያ ማረጋገጫ ሳያያይዙ ትእዛዝዎ አይሰራም።',
        'source_instagram' => 'Instagram', 'source_sms' => 'SMS',
        'exit_warning_title' => 'ትእዛዝ አልተላከም', 'exit_warning_msg' => 'ትእዛዝዎን ሳያስገቡ እየወጡ ነው።', 'exit_confirm' => 'አዎ, ውጣ', 'exit_cancel' => 'አይ, ቀጥል',
        'payment_warning' => "ክፍያ ካደረጉ በኋላ ስክሪንሾት ይውሰዱ።",
        'view_order' => 'ትእዛዝዎን ይመልከቱ', 'track_order' => 'ትእዛዝዎን ይከታቱ',
        'warning_slide' => 'ማሳሰቢያ፦ የክፍያ ደረሰኙ ከዚህ ቅጽ ጋር አብሮ ካልተያያዘ ትዕዛዝዎ ተቀባይነት አይኖረውም።',
        'choose_lang' => 'ቋንቋ ይምረጡ', 'call_us' => 'ደውሉን',
        'welcome_msg' => 'የበዓል ቶርታዎን ቅድሚያ ያስይዙ እና በቅርበት በመረጡት ቅርንጫፍ ይውሰዱ።',
        'summary_source' => 'ያወቁት', 'summary_items' => 'የተዘዙ እቃዎች',
        'telegram_only_title' => 'ቴሌግራም ያስፈልጋል', 'telegram_only_msg' => 'ይህ አፕልኬሽን ውስጥ ብቻ ሊሰራ ይችላል።', 'open_telegram' => 'በቴሌግራም ይክፈቱ',
        'lang_en_desc' => 'Continue in English', 'lang_am_desc' => 'በአማርኛ ቀጥል',
        'maintenance_title' => 'ቅድመ-ትእዛዝ የተዘጋ', 'maintenance_msg' => 'በዚህ ጊዜ ትእዛዞችን አንቀብልም። እባክዎ በኋላ ይመልከቱ!', 'maintenance_thanks' => 'ካልዲስ ኮፊን ስለመረጡ እናመሰግናለን',
        'no_branches' => 'በዚህ ጊዜ ምንም ቅርንጫፍ የለም።',
        'no_branches_desc' => 'ሁሉም ቅርንጫፎች አሁን የማይገኙ ናቸው። እባክዎ በኋላ ይመልከቱ ወይም ድጋፍ ያግኙ።',
        'tap_to_view' => 'ሙሉ ምስል ለማየት ይጫኑ',
        'tap_enlarge' => 'ለማሳደግ ይጫኑ',
        'pdf_attached' => 'PDF ተያይዟል',
        'error_file_type' => 'ስክሪንሾት እና PDF ብቻ ይቀበላል።',
        'digits_counter' => 'አሃዝ',
        'confirm_order_title' => 'ትእዛዙን ያረጋግጡ',
        'confirm_order_msg' => 'ትእዛዙን ለመላክ ይፈልጋሉ? እባክዎ ደረሰኙን በደንብ ያረጋግጡ።',
        'confirm_order_yes' => 'አዎ, ላክ',
        'confirm_order_no' => 'አይ, ተመለስ',
        'confirm_order_checking' => 'በማረጋገጥ ላይ...',
        'error_duplicate_ref' => 'ይህ ቁጥር ቀደም ብሎ ተጠቅሟል። እባክዎ ሌላ ቁጥር ያስገቡ።',
        'confirm_total_label' => 'የትእዛዝ ጠቅላላ'
    ]
];
 $t = $translations[$lang] ?? $translations['en'];
?>
<!DOCTYPE html>
<html lang="<?= $lang ?>" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title><?= $t['title'] ?></title>
<link rel="preload" as="image" href="/logokaldis.png">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&family=Noto+Sans+Ethiopic:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{font-family:'Inter','Noto Sans Ethiopic',-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
:root{--bg:#FDFBF7;--pri:#8b4513;--pri-dk:#5C2E0C;--brand:#CFA679;--s-top:env(safe-area-inset-top,0px);--s-bot:env(safe-area-inset-bottom,0px);--s-left:env(safe-area-inset-left,0px);--s-right:env(safe-area-inset-right,0px)}
html,body{background:var(--bg);color:#333;height:100%;height:100dvh;width:100%;overflow:hidden;position:fixed;top:0;left:0;right:0;bottom:0;overscroll-behavior:none;margin:0;padding:0}
#fixedAlert{position:fixed;top:0;left:0;right:0;z-index:9998;padding-top:var(--s-top);background:linear-gradient(90deg,#FEF3C7,#FEE2E2,#FEF3C7);border-bottom:2px solid #F59E0B;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .4s,transform .4s;transform:translateY(-100%)}
#fixedAlert.visible{opacity:1;pointer-events:auto;transform:translateY(0)}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
#fixedAlert .scroll-text{display:flex;white-space:nowrap;animation:marquee 18s linear infinite;padding:5px 0}
#fixedAlert .scroll-text span{font-size:10px;font-weight:700;color:#92400E;padding:0 20px;display:inline-flex;align-items:center;gap:4px}
.bean-scene{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.coffee-bean{position:absolute;width:18px;height:26px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:linear-gradient(145deg,#CFA679 0%,#A0784C 40%,#7A5C3A 100%);box-shadow:inset -2px -2px 4px rgba(0,0,0,.25),inset 1px 1px 3px rgba(255,255,255,.15),0 2px 8px rgba(0,0,0,.15);opacity:0}
.coffee-bean::after{content:'';position:absolute;top:25%;left:50%;transform:translateX(-50%) rotate(-5deg);width:2px;height:50%;background:rgba(0,0,0,.2);border-radius:2px}
.coffee-bean.light{background:linear-gradient(145deg,#E8D5BF 0%,#CFA679 40%,#A0784C 100%)}
.coffee-bean.dark{background:linear-gradient(145deg,#A0784C 0%,#7A5C3A 40%,#8b4513 100%)}
@keyframes bf1{0%{transform:translate(10px,110%) rotate(20deg);opacity:0}10%{opacity:.35}85%{opacity:.35}100%{transform:translate(-15px,-20%) rotate(380deg);opacity:0}}
@keyframes bf2{0%{transform:translate(80%,115%) rotate(-30deg);opacity:0}8%{opacity:.3}90%{opacity:.3}100%{transform:translate(75%,-15%) rotate(-340deg);opacity:0}}
@keyframes bf3{0%{transform:translate(50%,120%) rotate(50deg);opacity:0}12%{opacity:.25}88%{opacity:.25}100%{transform:translate(55%,-25%) rotate(410deg);opacity:0}}
@keyframes bf4{0%{transform:translate(25%,125%) rotate(-10deg);opacity:0}15%{opacity:.2}82%{opacity:.2}100%{transform:translate(20%,-10%) rotate(350deg);opacity:0}}
@keyframes bf5{0%{transform:translate(65%,118%) rotate(35deg);opacity:0}5%{opacity:.28}92%{opacity:.28}100%{transform:translate(70%,-18%) rotate(395deg);opacity:0}}
@keyframes bf6{0%{transform:translate(90%,122%) rotate(-45deg);opacity:0}18%{opacity:.22}80%{opacity:.22}100%{transform:translate(85%,-22%) rotate(-315deg);opacity:0}}
@keyframes bf7{0%{transform:translate(40%,128%) rotate(15deg);opacity:0}10%{opacity:.18}85%{opacity:.18}100%{transform:translate(35%,-30%) rotate(375deg);opacity:0}}
.bean-1{left:8%;animation:bf1 14s ease-in-out infinite}.bean-2{left:30%;animation:bf2 18s ease-in-out infinite 2s}.bean-3{left:55%;animation:bf3 16s ease-in-out infinite 4s}.bean-4{left:78%;animation:bf4 20s ease-in-out infinite 1s}.bean-5{left:18%;animation:bf5 15s ease-in-out infinite 6s}.bean-6{left:65%;animation:bf6 17s ease-in-out infinite 3s}.bean-7{left:42%;animation:bf7 19s ease-in-out infinite 5s}
.deco-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.deco-bean{position:absolute;pointer-events:none;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;box-shadow:inset -1px -1px 3px rgba(0,0,0,.2),inset 1px 1px 2px rgba(255,255,255,.1);opacity:0}
.deco-bean::after{content:'';position:absolute;top:25%;left:50%;transform:translateX(-50%) rotate(-5deg);width:1.5px;height:45%;background:rgba(0,0,0,.15);border-radius:2px}
.deco-bean.b-default{background:linear-gradient(145deg,#CFA679,#A0784C 40%,#7A5C3A)}
.deco-bean.b-light{background:linear-gradient(145deg,#E8D5BF,#CFA679 40%,#A0784C)}
.deco-bean.b-dark{background:linear-gradient(145deg,#A0784C,#7A5C3A 40%,#8b4513)}
.deco-bean.b-roast{background:linear-gradient(145deg,#8D6E63,#8b4513 40%,#5A2D0C)}
@keyframes bdf{0%,100%{transform:translateY(0) rotate(var(--rot,0deg));opacity:var(--op,.1)}50%{transform:translateY(-28px) rotate(calc(var(--rot,0deg) + 22deg));opacity:calc(var(--op,.1)*2)}}
.anim-bf{animation:bdf var(--dur,18s) ease-in-out infinite var(--delay,0s)}
.pg-bg{position:absolute;inset:0;z-index:0;pointer-events:none}
.pg-orbs{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.pg-orb{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none}
.pg-dots{position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.3;background-image:radial-gradient(circle,rgba(139,69,19,.02) 1px,transparent 1px);background-size:22px 22px}
.pg-content{position:relative;z-index:1}
.prog-segments{display:flex;gap:3px;padding:0 1px;margin-top:5px}
.prog-seg-item{flex:1;height:4px;border-radius:3px;background:#E8E0DB;transition:all .5s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
.prog-seg-item.done{background:linear-gradient(90deg,#A1887F,#8b4513)}
.prog-seg-item.active{background:linear-gradient(90deg,#CFA679,#8b4513);box-shadow:0 0 10px rgba(207,166,121,.6)}
.prog-seg-item.active::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);animation:segShimmer 1.8s ease-in-out infinite}
@keyframes segShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
.prog-label{font-size:8px;font-weight:700;color:#8b4513;text-align:center;margin-top:3px;transition:opacity .3s,transform .3s;letter-spacing:.06em;text-transform:uppercase;min-height:12px}
.app-shell{display:flex;flex-direction:column;height:100%;height:100dvh;max-width:430px;margin:0 auto;position:relative;z-index:10;background:var(--bg);overflow:hidden;padding-top:var(--s-top);padding-bottom:var(--s-bot);padding-left:var(--s-left);padding-right:var(--s-right);transition:padding-top .45s cubic-bezier(.4,0,.2,1),background .4s ease}
.app-shell.landing-bg{background:radial-gradient(ellipse at 50% -10%, #A0522D 0%, #8b4513 45%, #4A230A 100%);background-attachment:fixed}
@keyframes goldShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.text-gradient-gold{background:linear-gradient(135deg,#FFF5E4 0%,#FFE082 30%,#FFCA28 65%,#FFF5E4 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:goldShimmer 6s ease infinite}
.hero-logo-frame{position:relative;padding:6px;background:linear-gradient(135deg,rgba(255,224,130,.7),rgba(139,69,19,.4),rgba(255,224,130,.5));border-radius:50%;box-shadow:0 12px 36px rgba(0,0,0,.5),inset 0 0 16px rgba(255,255,255,.3)}
.hero-badge{background:linear-gradient(135deg,rgba(255,224,130,.22),rgba(255,255,255,.08));border:1px solid rgba(255,224,130,.38);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:9999px;padding:3px 12px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.step-chip{background:rgba(255,255,255,.09);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:6px 8px;transition:all .2s ease;min-width:0}
.step-chip:active{transform:scale(.96);background:rgba(255,255,255,.18)}
.lang-card-active{background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(255,248,225,.18))!important;border-color:#FFE082!important;box-shadow:0 8px 24px rgba(0,0,0,.3),0 0 18px rgba(255,224,130,.35)!important}
@keyframes pulseCta{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,224,130,.4)}50%{transform:scale(1.02);box-shadow:0 0 0 8px rgba(255,224,130,0)}}
.cta-pulse{animation:pulseCta 2.5s cubic-bezier(.4,0,.6,1) infinite}
.app-header{flex:0 0 auto}.app-footer{flex:0 0 auto}
.app-main{flex:1 1 0;min-height:0;overflow:hidden;overscroll-behavior:contain}
.app-main.can-scroll{overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.app-main.can-scroll::-webkit-scrollbar{display:none}
.step-pad{padding:10px 14px}
.btn-pri{background:linear-gradient(135deg,#6D4C41,#4E342E);color:#fff;border:none;box-shadow:0 4px 14px rgba(62,39,35,.3);font-weight:700;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:14px;transition:transform .1s}
.btn-pri:active{transform:scale(.96)}
.btn-pri:disabled{opacity:.5;pointer-events:none}
.card{background:rgba(255,255,255,.88);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1.5px solid rgba(255,255,255,.7);border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.03);transition:all .15s}
.sel-card{border:2px solid var(--pri)!important;background:rgba(255,243,224,.92)!important;box-shadow:0 0 0 3px rgba(93,64,55,.08)}
.inp-g{position:relative;margin-bottom:10px}
.inp-g input{width:100%;padding:16px 12px 6px 38px;border:1.5px solid #E0D8D3;border-radius:12px;font-size:14px;background:rgba(255,255,255,.96);outline:none;transition:all .2s;font-weight:500;color:#333;height:50px}
.inp-g input:focus{border-color:var(--pri);box-shadow:0 0 0 3px rgba(93,64,55,.08)}
.inp-g label{position:absolute;left:38px;top:50%;transform:translateY(-50%);font-size:13px;color:#aaa;pointer-events:none;transition:all .2s;background:transparent;padding:0 3px;white-space:nowrap}
.inp-g input:focus+label,.inp-g input:not(:placeholder-shown)+label{top:-1px;left:10px;font-size:9px;font-weight:700;color:var(--pri);background:var(--bg);border-radius:3px}
.inp-g.always-float label{top:-1px;left:10px;font-size:9px;font-weight:700;color:var(--pri);background:var(--bg);border-radius:3px;transform:none}
.phone-prefix{position:absolute;left:34px;top:50%;transform:translateY(-50%);font-size:15px;font-weight:800;color:var(--pri);pointer-events:none;z-index:2;letter-spacing:.03em}
.phone-input-wrap input {
    padding-left: 80px !important;
    padding-top: 15px !important;
    padding-bottom: 15px !important;
    font-size: 15px !important;
    font-weight: 800 !important;
    color: var(--pri) !important;
    letter-spacing: .06em !important;
    line-height: 1 !important;
}
.phone-digit-count{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700;color:#b0a89f;pointer-events:none;z-index:2;transition:color .2s}
.phone-digit-count.full{color:#4ADE80}
.phone-digit-count.over{color:#F87171}
.inp-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#b0a89f;width:16px;height:16px;pointer-events:none}
.spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-radius:50%;border-top-color:#fff;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.header-logo{width:22px;height:22px;object-fit:contain;cursor:pointer;transition:transform .15s}
.header-logo:active{transform:scale(.88)}
.m-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:20000;display:none;align-items:flex-end;padding:0 var(--s-left) 0 var(--s-right);padding-bottom:var(--s-bot)}
.m-ov.on{display:flex;animation:fadeIn .2s}
.m-ov.center{align-items:center;justify-content:center;padding:20px}
.m-body{width:100%;max-width:430px;max-height:85vh;background:#fff;border-radius:22px 22px 0 0;padding:20px;overflow-y:auto;-webkit-overflow-scrolling:touch;animation:slideUp .3s cubic-bezier(.16,1,.3,1)}
.m-ov.center .m-body{border-radius:22px;max-height:90vh;padding:24px}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
#toasts{position:fixed;top:calc(12px + var(--s-top));left:50%;transform:translateX(-50%);z-index:99999;width:calc(100% - 28px);max-width:380px;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast{padding:12px 16px;border-radius:10px;box-shadow:0 10px 25px -5px rgba(0,0,0,.15),0 8px 10px -6px rgba(0,0,0,.1);display:flex;align-items:center;gap:10px;font-size:13px;font-weight:500;color:#09090b;background:#ffffff;border:1px solid #e4e4e7;pointer-events:auto;animation:sonnerIn .2s cubic-bezier(.16,1,.3,1)}
.toast.ok{border-color:#bbf7d0;background:#f0fdf4;color:#14532d}
.toast.err{border-color:#fecaca;background:#fef2f2;color:#7f1d1d}
.toast.info{border-color:#bfdbfe;background:#eff6ff;color:#1e3a8a}
@keyframes sonnerIn{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.lang-btn{position:relative;overflow:hidden}
.lang-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,.25) 50%,transparent 60%);transform:translateX(-100%);transition:transform .5s}
.lang-btn:active::after{transform:translateX(100%)}
.sup-item{transition:all .12s}.sup-item:active{transform:scale(.98)}
.rc-div{border:none;border-top:2px dashed #e5e7eb;margin:8px 0}
.cart-bar{position:sticky;bottom:0;left:0;right:0;z-index:20;background:rgba(255,255,255,.97);backdrop-filter:blur(12px);border-top:1px solid #e5e7eb;padding:8px 14px;box-shadow:0 -4px 14px rgba(0,0,0,.05)}
.p-img{width:72px;height:72px;background:#f3f0ec;border-radius:12px;overflow:hidden;flex-shrink:0;position:relative;cursor:pointer}
.p-img img{width:100%;height:100%;object-fit:cover;transition:transform .2s}
.p-img:active img{transform:scale(1.05)}
.p-img .zoom-hint{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,.65),transparent);color:#fff;font-size:8px;font-weight:600;padding:10px 4px 3px;text-align:center;pointer-events:none;opacity:.95;letter-spacing:.02em;line-height:1}
.qty-b{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;transition:transform .1s}
.qty-b:active{transform:scale(.85)}
.footer-safe{padding-bottom:max(12px,var(--s-bot))}
.tg-block{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;padding:32px;text-align:center;background:linear-gradient(135deg,#3E2723,#CFA679)}
.glass{background:rgba(255,255,255,.1);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.15);border-radius:14px}
.glass-light{background:rgba(255,255,255,.15);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);border-radius:14px}
@keyframes logoPulse{0%,100%{filter:drop-shadow(0 0 12px rgba(255,220,160,.4))}50%{filter:drop-shadow(0 0 24px rgba(255,220,160,.7))}}
.logo-pulse{animation:logoPulse 3s ease-in-out infinite}
.landing-logo-wrap{cursor:pointer;transition:transform .15s;-webkit-user-select:none;user-select:none}
.landing-logo-wrap:active{transform:scale(.92)}
.maintenance-block{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100dvh;padding:32px;text-align:center;background:linear-gradient(160deg,#3E2723 0%,#5D4037 50%,#3E2723 100%)}
@keyframes pulse-slow{0%,100%{opacity:1}50%{opacity:.5}}
.pulse-slow{animation:pulse-slow 2s ease-in-out infinite}
@media(min-width:431px){.app-shell{border-left:1px solid rgba(0,0,0,.04);border-right:1px solid rgba(0,0,0,.04)}}
#imgViewer{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.95);display:none;align-items:center;justify-content:center;flex-direction:column;padding:16px}
#imgViewer.on{display:flex;animation:fadeIn .2s}
#imgViewer img{max-width:100%;max-height:85vh;object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
#imgViewer .iv-close{position:absolute;top:calc(12px + var(--s-top));right:calc(12px + var(--s-right));width:36px;height:36px;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;border:none;cursor:pointer;transition:transform .15s,background .15s}
#imgViewer .iv-close:active{transform:scale(.85);background:rgba(255,255,255,.25)}
#imgViewer .iv-name{color:rgba(255,255,255,.85);font-size:12px;font-weight:600;margin-top:12px;text-align:center;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.flow-arrow{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:20px}
.flow-arrow svg{width:14px;height:14px;color:rgba(255,255,255,.5)}
.pdf-preview-box{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px}
.pdf-icon-box{width:48px;height:48px;background:linear-gradient(135deg,#FEE2E2,#FECACA);border-radius:14px;display:flex;align-items:center;justify-content:center;border:2px solid #FCA5A5}
.pdf-icon-box svg{width:24px;height:24px;color:#DC2626}
.pdf-filename{font-size:11px;font-weight:600;color:#374151;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pdf-remove-btn{position:absolute;top:8px;right:8px;background:#EF4444;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);cursor:pointer;transition:transform .15s}
.pdf-remove-btn:active{transform:scale(.85)}
.name-bold{font-weight:700}
.confirm-icon-ring{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#D1FAE5,#A7F3D0);display:flex;align-items:center;justify-content:center;border:3px solid #6EE7B7;box-shadow:0 4px 20px rgba(16,185,129,.2)}
.confirm-icon-inner{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 4px rgba(255,255,255,.3)}
.confirm-total-box{background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:2px solid #FDE68A;border-radius:14px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
.confirm-items-preview{max-height:120px;overflow-y:auto;scrollbar-width:none}
.confirm-items-preview::-webkit-scrollbar{display:none}
</style>
</head>
<body>
<div id="fixedAlert"><div class="scroll-text" id="alertScrollText"><span>&#x26A0;&#xFE0F </span><span>&#x26A0;&#xFE0F </span><span>&#x26A0;&#xFE0F </span><span>&#x26A0;&#xFE0F </span></div></div>
<div id="toasts"></div>

<div id="imgViewer" onclick="closeImgViewer()">
    <button class="iv-close" onclick="event.stopPropagation();closeImgViewer()"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
    <img id="imgViewerSrc" src="" alt="Full Image" onclick="event.stopPropagation()">
    <p class="iv-name" id="imgViewerName"></p>
</div>

<div id="termsModal" class="m-ov">
    <div class="m-body" id="termsBody"></div>
</div>

<div id="exitModal" class="m-ov center">
    <div class="m-body max-w-sm w-auto rounded-2xl p-5 text-center relative overflow-hidden shadow-2xl">
        <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
        <div class="w-12 h-12 rounded-full bg-red-50 mx-auto mb-3 flex items-center justify-center border-2 border-red-100"><svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
        <h3 class="text-base font-bold mb-1 text-gray-900" id="exitTitle"></h3>
        <p class="text-xs text-gray-500 mb-4" id="exitMsg"></p>
        <div class="flex gap-2">
            <button onclick="closeExit()" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-xs bg-white text-gray-700 active:scale-95 transition-transform" id="exitCancelBtn"></button>
            <button onclick="doExit()" class="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform" id="exitConfirmBtn"></button>
        </div>
    </div>
</div>

<div id="orderConfirmModal" class="m-ov center">
    <div class="m-body max-w-sm w-auto rounded-2xl p-5 text-center relative overflow-hidden shadow-2xl">
        <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400"></div>
        <div class="confirm-icon-ring mx-auto mb-3">
            <div class="confirm-icon-inner">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
        </div>
        <h3 class="text-base font-bold mb-1 text-gray-900" id="confirmTitle"></h3>
        <p class="text-xs text-gray-500 mb-3 leading-relaxed" id="confirmMsg"></p>
        <div class="confirm-total-box mb-3" id="confirmTotalBox">
            <div>
                <p class="text-[8px] font-bold text-amber-600 uppercase tracking-widest" id="confirmTotalLabel"></p>
                <p class="text-[10px] text-gray-500 mt-0.5" id="confirmItemsCount"></p>
            </div>
            <p class="text-lg font-extrabold text-[#5D4037] font-mono" id="confirmTotalAmt"></p>
        </div>
        <div class="confirm-items-preview bg-gray-50 rounded-xl p-2.5 mb-4" id="confirmItemsPreview"></div>
        <div class="flex gap-2">
            <button onclick="closeOrderConfirm()" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 font-bold text-xs bg-white text-gray-700 active:scale-95 transition-transform" id="confirmNoBtn"></button>
            <button onclick="confirmOrder()" class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5" id="confirmYesBtn"></button>
        </div>
    </div>
</div>

<div id="tgBlock" class="tg-block" style="display:none">
    <svg class="w-16 h-16 mx-auto text-white opacity-70 mb-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
    <h2 class="text-xl font-extrabold text-white mb-2"><?= $t['telegram_only_title'] ?></h2>
    <p class="text-sm text-white/70 mb-6"><?= $t['telegram_only_msg'] ?></p>
    <a href="https://t.me/KaldisPreOrderBot" target="_blank" class="btn-pri px-8 py-3.5 rounded-2xl text-sm no-underline inline-flex items-center gap-2"><?= $t['open_telegram'] ?></a>
</div>

<?php if ($maintenanceMode): ?>
<div id="maintenanceBlock" class="maintenance-block">
    <div class="relative z-10 flex flex-col items-center max-w-xs">
        <div class="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 border-2 border-white/20">
            <svg class="w-12 h-12 text-amber-400 pulse-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div class="relative mb-6 logo-pulse">
            <div class="absolute inset-[-12px] bg-[#FFDCA0]/30 rounded-full blur-xl"></div>
            <img src="/logokaldis.png" class="relative z-10 w-20 h-20 object-contain drop-shadow-lg" alt="Logo">
        </div>
        <h1 class="text-2xl font-black text-white mb-2"><?= $t['maintenance_title'] ?></h1>
        <div class="w-16 h-1 bg-amber-400/60 rounded-full mb-4"></div>
        <p class="text-sm text-white/80 leading-relaxed mb-6"><?= $t['maintenance_msg'] ?></p>
        <div class="glass-light px-6 py-3 rounded-xl mb-8"><p class="text-xs text-white/90 font-semibold"><?= $t['maintenance_thanks'] ?></p></div>
        <div class="glass rounded-xl overflow-hidden w-full">
            <a href="tel:0930332185" class="sup-item flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <div class="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center"><svg class="w-5 h-5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></div>
                <div class="flex-1 text-left"><p class="text-[10px] text-white/60 font-medium"><?= $t['call_us'] ?></p><p class="text-sm font-bold text-white font-mono">0930332185</p></div>
            </a>
            <a href="https://t.me/KaldissCoffee" target="_blank" class="sup-item flex items-center gap-3 px-4 py-3">
                <div class="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center"><svg class="w-5 h-5 text-sky-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg></div>
                <div class="flex-1 text-left"><p class="text-[10px] text-white/60 font-medium"><?= $t['join_community'] ?></p><p class="text-sm font-bold text-white">@KaldissCoffee</p></div>
            </a>
        </div>
    </div>
    <div class="bean-scene"><div class="coffee-bean bean-1"></div><div class="coffee-bean light bean-2"></div><div class="coffee-bean dark bean-3"></div><div class="coffee-bean bean-4"></div><div class="coffee-bean light bean-5"></div><div class="coffee-bean dark bean-6"></div><div class="coffee-bean bean-7"></div></div>
</div>
<div id="appRoot" class="app-shell" style="display:none">
<?php else: ?>
<div id="appRoot" class="app-shell" style="display:none">
<?php endif; ?>
    <header id="appHeader" class="app-header bg-white/92 backdrop-blur-xl border-b border-gray-100/80 z-50 px-3.5 py-2">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <img src="/logokaldis.png" class="header-logo" alt="Logo" onclick="deepRefresh()">
                <h1 class="font-extrabold text-[14px] text-[#3E2723] tracking-tight leading-none" id="headerTitle"><?= $t['title'] ?></h1>
            </div>
            <div class="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tracking-wide" id="stepText">1/8</div>
        </div>
        <div class="prog-segments" id="progSegs">
            <div class="prog-seg-item"></div><div class="prog-seg-item"></div><div class="prog-seg-item"></div><div class="prog-seg-item"></div><div class="prog-seg-item"></div><div class="prog-seg-item"></div><div class="prog-seg-item"></div><div class="prog-seg-item"></div>
        </div>
        <div class="prog-label" id="progLabel"></div>
    </header>
    <main id="content" class="app-main"></main>
    <footer id="footer" class="app-footer bg-white/95 backdrop-blur-xl border-t border-gray-100/80 px-3.5 pt-2.5 footer-safe z-50">
        <div class="flex gap-2.5">
            <button id="backBtn" onclick="prevStep()" class="hidden flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-xs text-gray-700 bg-white active:scale-[.96] transition-transform"><?= $t['back'] ?></button>
            <button id="nextBtn" onclick="nextStep()" class="flex-1 py-3 rounded-xl btn-pri text-xs shadow-lg"><?= $t['next'] ?></button>
        </div>
    </footer>
</div>

<script>
var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
if (tg) {
    try {
        if (tg.ready) tg.ready();
        if (tg.expand) tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor('#FFFFFF');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#FDFBF7');
        if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
    } catch(e) {}
}

<?php if ($maintenanceMode): ?>
if (tg && tg.setHeaderColor) { try { tg.setHeaderColor('#3E2723'); tg.setBackgroundColor('#3E2723'); } catch(e){} }
document.getElementById('appRoot').style.display = 'none'; document.getElementById('fixedAlert').style.display = 'none';
throw new Error('Maintenance Mode');
<?php endif; ?>

function deepRefresh() { try { haptic('med'); } catch(e) {} if ('caches' in window) { caches.keys().then(function(n){ n.forEach(function(nm){ caches.delete(nm); }); }).catch(function(){}); } try { sessionStorage.clear(); } catch(e) {} var url = location.pathname + location.search; var sep = url.indexOf('?') === -1 ? '?' : '&'; location.replace(url + sep + '_cr=' + Date.now()); }

var alertH = 0;
function updateAlertText() { var el = document.getElementById('alertScrollText'); if (!el) return; var msg = t('warning_slide'); var h = ''; for (var i = 0; i < 4; i++) h += '<span>\u26A0\uFE0F ' + msg + '</span>'; el.innerHTML = h; }
function updateAlert() { var el = document.getElementById('fixedAlert'); var show = (S.step >= 2 && S.step <= 6); el.classList.toggle('visible', show); requestAnimationFrame(function() { requestAnimationFrame(function() { alertH = show ? el.offsetHeight : 0; updateShellPadding(); }); }); }
function updateShellPadding() { var root = document.getElementById('appRoot'); if (!root) return; var show = (S.step >= 2 && S.step <= 6); root.style.paddingTop = 'calc(' + (show ? alertH : 0) + 'px + var(--s-top))'; }

var S = { lang: '<?= $lang ?>', chatId: '<?= $chatId ?>', step: 0, totalSteps: 8, firstName: '', lastName: '', surname: '', phone: '', cart: [], branch: null, holiday: null, payment: null, payRef: '', paySlip: null, paySlipPrev: null, paySlipType: null, paySlipName: null, hearAbout: null, orderNum: null, termsOk: false, busy: false, searchQ: '' };
if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) { S.firstName = tg.initDataUnsafe.user.first_name || ''; S.lastName = tg.initDataUnsafe.user.last_name || ''; if (!S.chatId) S.chatId = String(tg.initDataUnsafe.user.id || ''); }

var holidays = <?= json_encode($holidays) ?>.map(function(h){ return Object.assign({}, h, {id: String(h.id), date: h.date || null}); });
var products = <?= json_encode($products) ?>.map(function(p){ return Object.assign({}, p, {id: String(p.id)}); });
var branches = <?= json_encode($branches) ?>.map(function(b){ return Object.assign({}, b, {id: String(b.id)}); });
var payMethods = <?= json_encode($paymentMethods) ?>.map(function(p){ return Object.assign({}, p, {id: String(p.id)}); });
var TR = <?= json_encode($translations) ?>;

function t(k) { try { return (TR[S.lang] && TR[S.lang][k]) ? TR[S.lang][k] : (TR.en[k] || k); } catch(e) { return TR.en[k] || k; } }
function haptic(ty) { try { if (tg && tg.HapticFeedback) { if (ty === 'ok') tg.HapticFeedback.notificationOccurred('success'); else if (ty === 'err') tg.HapticFeedback.notificationOccurred('error'); else if (ty === 'med') tg.HapticFeedback.impactOccurred('medium'); else if (ty === 'light') tg.HapticFeedback.impactOccurred('light'); else if (ty === 'heavy') tg.HapticFeedback.impactOccurred('heavy'); else tg.HapticFeedback.selectionChanged(); } } catch(e) {} }
function fmtDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString(S.lang === 'am' ? 'am-ET' : 'en-US', {month: 'short', day: 'numeric'}); }
function srcLbl(id) { return {sms: t('source_sms'), telegram: 'Telegram', instagram: t('source_instagram'), tiktok: 'TikTok'}[id] || id; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function fmtPhoneDisplay(digits) {
    if (!digits) return '';
    var d = String(digits).replace(/[^0-9]/g, '');
    if (d.length === 9) return '+251' + d;
    if (d.length === 12 && d.substring(0, 3) === '251') return '+' + d;
    if (d.length === 10 && d[0] === '0') return '+251' + d.substring(1);
    return '+251' + d.substring(d.length - 9);
}

function fmtPhoneSubmit(digits) {
    if (!digits) return '';
    var d = String(digits).replace(/[^0-9]/g, '');
    if (d.length === 9) return '0' + d;
    if (d.length === 12 && d.substring(0, 3) === '251') return '0' + d.substring(3);
    return '0' + d.substring(d.length - 9);
}

function logAct(action, extraData) {}

function toast(m, ty) {
    haptic(ty === 'error' ? 'err' : 'ok');
    var c = document.getElementById('toasts'), el = document.createElement('div');
    var isErr = ty === 'error', isInfo = ty === 'info';
    el.className = 'toast ' + (isErr ? 'err' : (isInfo ? 'info' : 'ok'));
    var ic = isErr ? '<svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' : (isInfo ? '<svg class="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' : '<svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>');
    el.innerHTML = ic + '<span class="flex-1 leading-snug font-medium">' + m + '</span>';
    c.appendChild(el);
    setTimeout(function() {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-12px) scale(.95)';
        el.style.transition = 'all .2s cubic-bezier(.16,1,.3,1)';
        setTimeout(function() { el.remove(); }, 200);
    }, 3500);
}

function viewFullImg(src, name) { haptic('light'); document.getElementById('imgViewerSrc').src = src; document.getElementById('imgViewerName').textContent = name || ''; document.getElementById('imgViewer').classList.add('on'); }
function closeImgViewer() { document.getElementById('imgViewer').classList.remove('on'); document.getElementById('imgViewerSrc').src = ''; }

function toLatinDigits(s) { var geez = '\u1369\u1370\u1371\u1372\u1373\u1374\u1375\u1376\u1377', arabic = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669', persian = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9', r = ''; for (var i = 0; i < s.length; i++) { var c = s[i], gi = geez.indexOf(c); if (gi >= 0) { r += String(gi + 1); continue; } var ai = arabic.indexOf(c); if (ai >= 0) { r += String(ai); continue; } var pi = persian.indexOf(c); if (pi >= 0) { r += String(pi); continue; } r += c; } return r; }

function normalizePhone(p) {
    if (!p) return '';
    p = toLatinDigits(p).replace(/[^0-9+]/g, '');
    if (p.indexOf('+251') === 0) p = p.substring(4);
    else if (p.indexOf('251') === 0) p = p.substring(3);
    if (p.indexOf('0') === 0) p = p.substring(1);
    p = p.substring(0, 9);
    if (!/^[97]\d{8}$/.test(p)) return '';
    return p;
}

var beanSceneHTML = '<div class="bean-scene"><div class="coffee-bean bean-1"></div><div class="coffee-bean light bean-2"></div><div class="coffee-bean dark bean-3"></div><div class="coffee-bean bean-4"></div><div class="coffee-bean light bean-5"></div><div class="coffee-bean dark bean-6"></div><div class="coffee-bean bean-7"></div></div>';

function pageWrap(step, innerHTML, opts) {
    opts = opts || {};
    var bgs = {1:'linear-gradient(170deg,#FFF8F0,#FDFBF7 45%,#FAF3E8)',2:'linear-gradient(170deg,#FFF5EB,#FFF9F3 45%,#FDF6EE)',3:'linear-gradient(170deg,#F2F6FF,#F8FAFF 45%,#FDFBF7)',4:'linear-gradient(170deg,#FFF6E0,#FFFAF0 45%,#FDFBF7)',5:'linear-gradient(170deg,#FFF8E1,#FFFBF0 45%,#FDF8EE)',6:'linear-gradient(170deg,#EEF2FF,#F5F8FF 45%,#FDFBF7)',7:'linear-gradient(170deg,#FFF5F0,#FFFAF7 45%,#FDFBF7)',8:'linear-gradient(170deg,#F0FFF0,#F8FFF8 45%,#FDFBF7)'};
    var o1 = {1:'#CFA679',2:'#E8A87C',3:'#90CAF9',4:'#FFE082',5:'#FFD54F',6:'#90CAF9',7:'#FFAB91',8:'#A5D6A7'};
    var o2 = {1:'#8D6E63',2:'#D4A574',3:'#64B5F6',4:'#FFD54F',5:'#FFC107',6:'#7986CB',7:'#FF8A65',8:'#81C784'};
    var sty = 'position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-sizing:border-box;';
    return '<div class="step-pad" style="'+sty+'">'+beanSceneHTML+'<div class="pg-bg" style="background:'+(bgs[step]||'var(--bg)')+'"></div><div class="pg-dots"></div><div class="pg-orbs"><div class="pg-orb" style="top:-15%;right:-10%;width:180px;height:180px;background:'+(o1[step]||'#CFA679')+';opacity:.10"></div><div class="pg-orb" style="bottom:-8%;left:-12%;width:150px;height:150px;background:'+(o2[step]||'#8D6E63')+';opacity:.07"></div></div>'+getBeans(step)+'<div class="pg-content" style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden">'+innerHTML+'</div></div>';
}

function getBeans(step) {
    var sets = {1:[{c:'b-default',x:88,y:6,w:16,h:23,o:.09,d:0,dur:16,r:20},{c:'b-light',x:6,y:65,w:14,h:20,o:.07,d:3,dur:20,r:-15},{c:'b-dark',x:92,y:55,w:12,h:17,o:.06,d:6,dur:14,r:40},{c:'b-roast',x:15,y:18,w:15,h:22,o:.05,d:9,dur:18,r:-30},{c:'b-default',x:50,y:80,w:13,h:19,o:.04,d:1,dur:17,r:10},{c:'b-light',x:75,y:35,w:11,h:16,o:.035,d:5,dur:19,r:-25}],2:[{c:'b-light',x:85,y:3,w:15,h:22,o:.08,d:0,dur:18,r:15},{c:'b-roast',x:4,y:45,w:14,h:20,o:.07,d:2,dur:16,r:-20},{c:'b-default',x:90,y:50,w:13,h:19,o:.05,d:4,dur:20,r:30},{c:'b-dark',x:12,y:10,w:14,h:20,o:.06,d:6,dur:15,r:-10},{c:'b-light',x:50,y:2,w:13,h:19,o:.05,d:1,dur:17,r:10},{c:'b-default',x:35,y:80,w:14,h:20,o:.04,d:5,dur:19,r:-25},{c:'b-roast',x:70,y:70,w:11,h:16,o:.035,d:8,dur:22,r:45}],3:[{c:'b-default',x:88,y:5,w:14,h:20,o:.07,d:0,dur:16,r:20},{c:'b-light',x:5,y:55,w:13,h:19,o:.05,d:3,dur:18,r:-15},{c:'b-dark',x:90,y:60,w:12,h:17,o:.04,d:5,dur:20,r:35},{c:'b-roast',x:10,y:15,w:14,h:20,o:.04,d:2,dur:17,r:15},{c:'b-default',x:80,y:30,w:12,h:17,o:.03,d:7,dur:15,r:-20},{c:'b-light',x:45,y:75,w:11,h:16,o:.03,d:4,dur:19,r:10}],4:[{c:'b-roast',x:85,y:4,w:15,h:22,o:.07,d:0,dur:15,r:25},{c:'b-default',x:5,y:50,w:14,h:20,o:.05,d:2,dur:18,r:-30},{c:'b-light',x:88,y:55,w:13,h:19,o:.04,d:4,dur:20,r:15},{c:'b-dark',x:15,y:12,w:13,h:19,o:.04,d:1,dur:16,r:30},{c:'b-roast',x:70,y:75,w:11,h:16,o:.03,d:6,dur:19,r:-10},{c:'b-default',x:40,y:85,w:12,h:17,o:.025,d:3,dur:21,r:-40}],5:[{c:'b-default',x:86,y:3,w:14,h:20,o:.07,d:0,dur:16,r:20},{c:'b-dark',x:4,y:45,w:15,h:22,o:.06,d:2,dur:18,r:-25},{c:'b-roast',x:90,y:55,w:12,h:17,o:.04,d:4,dur:20,r:35},{c:'b-light',x:12,y:10,w:14,h:20,o:.04,d:1,dur:17,r:20},{c:'b-default',x:78,y:72,w:12,h:17,o:.03,d:5,dur:15,r:-35},{c:'b-dark',x:50,y:1,w:11,h:16,o:.03,d:3,dur:22,r:10}],6:[{c:'b-light',x:86,y:4,w:14,h:20,o:.07,d:0,dur:15,r:15},{c:'b-default',x:5,y:48,w:13,h:19,o:.05,d:2,dur:18,r:-20},{c:'b-roast',x:90,y:58,w:12,h:17,o:.05,d:4,dur:20,r:30},{c:'b-dark',x:14,y:12,w:13,h:19,o:.04,d:1,dur:16,r:15},{c:'b-light',x:75,y:78,w:11,h:16,o:.03,d:6,dur:19,r:-25},{c:'b-default',x:42,y:88,w:12,h:17,o:.025,d:3,dur:21,r:40}],7:[{c:'b-roast',x:86,y:5,w:14,h:20,o:.07,d:0,dur:16,r:25},{c:'b-light',x:5,y:42,w:15,h:22,o:.06,d:2,dur:18,r:-15},{c:'b-default',x:90,y:60,w:12,h:17,o:.05,d:4,dur:20,r:30},{c:'b-dark',x:10,y:14,w:14,h:20,o:.04,d:1,dur:17,r:25},{c:'b-roast',x:80,y:80,w:12,h:17,o:.03,d:5,dur:15,r:-15},{c:'b-light',x:45,y:3,w:11,h:16,o:.03,d:3,dur:24,r:-30}],8:[{c:'b-default',x:87,y:4,w:14,h:20,o:.07,d:0,dur:16,r:10},{c:'b-roast',x:4,y:40,w:13,h:19,o:.06,d:2,dur:18,r:-20},{c:'b-light',x:90,y:65,w:12,h:17,o:.05,d:4,dur:20,r:35},{c:'b-dark',x:12,y:10,w:13,h:19,o:.04,d:1,dur:17,r:10},{c:'b-default',x:78,y:75,w:11,h:16,o:.03,d:5,dur:15,r:-20},{c:'b-roast',x:55,y:85,w:12,h:17,o:.025,d:3,dur:21,r:45}]};
    var items = sets[step] || []; if (!items.length) return '';
    var h = '<div class="deco-layer">';
    for (var i = 0; i < items.length; i++) { var it = items[i]; h += '<div class="deco-bean '+it.c+' anim-bf" style="left:'+it.x+'%;top:'+it.y+'%;width:'+it.w+'px;height:'+it.h+'px;--op:'+it.o+';--delay:'+it.d+'s;--dur:'+it.dur+'s;--rot:'+it.r+'deg"></div>'; }
    return h + '</div>';
}

function updateProgress() {
    var segs = document.querySelectorAll('.prog-seg-item'), label = document.getElementById('progLabel'), names = [t('step_1'),t('step_2'),t('step_3'),t('step_4'),t('step_5'),t('step_6'),t('step_7'),t('step_8')];
    for (var i = 0; i < segs.length; i++) { var sn = i + 1; segs[i].classList.remove('done', 'active'); if (sn < S.step) segs[i].classList.add('done'); else if (sn === S.step) segs[i].classList.add('active'); }
    if (label) { if (S.step >= 1 && S.step <= 8) { label.textContent = names[S.step - 1]; label.style.opacity = '1'; } else { label.textContent = ''; label.style.opacity = '0'; } }
}

function validate(s) {
    if (s === 1) {
        if (!S.firstName.trim() || !S.lastName.trim()) { toast(t('error_name'), 'error'); return false; }
        var np = normalizePhone(S.phone);
        if (!/^[97]\d{8}$/.test(np)) { toast(t('error_phone'), 'error'); return false; }
        S.phone = np;
    }
    if (s === 2 && S.cart.length === 0) { toast(t('error_fields'), 'error'); return false; }
    if (s === 3 && !S.branch) { toast(t('error_select_branch'), 'error'); return false; }
    if (s === 4 && !S.holiday) { toast(t('error_select_date'), 'error'); return false; }
    if (s === 5 && !S.payment) { toast(t('error_select_payment'), 'error'); return false; }
    if (s === 6) { if (!S.paySlip) { toast(t('error_slip'), 'error'); return false; } if (!S.termsOk) { toast(t('error_terms'), 'error'); return false; } }
    if (s === 7 && !S.hearAbout) { toast(t('error_select_source'), 'error'); return false; }
    return true;
}

function nextStep() {
    if (S.busy) return;
    if (!validate(S.step)) return;
    haptic('light');
    S.busy = true;
    if (S.step === 8) { showOrderConfirm(); S.busy = false; return; }
    S.step++;
    if (S.step === 3 && branches.length === 1) { S.branch = branches[0]; }
    if (S.step === 4 && holidays.length === 1) { S.holiday = holidays[0]; }
    if (S.step === 5 && payMethods.length === 1) { S.payment = payMethods[0]; }
    render();
    S.busy = false;
}

function prevStep() { haptic('light'); if (S.step > 0) { S.step--; render(); } else if (tg && tg.close) tg.close(); }

function setupBack() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(function() { if (S.step === 8 && !S.orderNum) showExit(); else if (S.step > 0) prevStep(); else tg.close(); });
    }
}

function showExit() { document.getElementById('exitTitle').textContent = t('exit_warning_title'); document.getElementById('exitMsg').textContent = t('exit_warning_msg'); document.getElementById('exitCancelBtn').textContent = t('exit_cancel'); document.getElementById('exitConfirmBtn').textContent = t('exit_confirm'); document.getElementById('exitModal').classList.add('on'); }
function closeExit() { document.getElementById('exitModal').classList.remove('on'); }
function doExit() { if (tg && tg.close) tg.close(); }
function setHead(v) { var h = document.getElementById('appHeader'); if (h) h.style.display = v ? '' : 'none'; }
function setFoot(v) { var f = document.getElementById('footer'); if (f) f.style.display = v ? '' : 'none'; }

function showOrderConfirm() {
    haptic('med');
    var tot = S.cart.reduce(function(s, it) { var p = products.find(function(x) { return x.id === it.product_id; }); return s + (p ? parseFloat(p.unit_price) * it.quantity : 0); }, 0);
    var totalQty = S.cart.reduce(function(s, it) { return s + it.quantity; }, 0);

    document.getElementById('confirmTitle').textContent = t('confirm_order_title');
    document.getElementById('confirmMsg').textContent = t('confirm_order_msg');
    document.getElementById('confirmNoBtn').textContent = t('confirm_order_no');
    document.getElementById('confirmYesBtn').innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> ' + t('confirm_order_yes');
    document.getElementById('confirmTotalLabel').textContent = t('confirm_total_label');
    document.getElementById('confirmItemsCount').textContent = totalQty + ' ' + t('summary_items').toLowerCase();
    document.getElementById('confirmTotalAmt').textContent = tot.toLocaleString() + ' ' + t('etb');

    var itemsHTML = '';
    for (var i = 0; i < S.cart.length; i++) {
        var it = S.cart[i], p = products.find(function(x) { return x.id === it.product_id; });
        if (!p) continue;
        itemsHTML += '<div class="flex justify-between items-center text-[10px] py-0.5 ' + (i > 0 ? 'border-t border-gray-100' : '') + '"><span class="text-gray-700 font-medium truncate flex-1 pr-2">' + p.product_name + ' <span class="text-gray-400">\u00D7' + it.quantity + '</span></span><span class="font-bold font-mono text-gray-800 shrink-0">' + (parseFloat(p.unit_price) * it.quantity).toLocaleString() + '</span></div>';
    }
    document.getElementById('confirmItemsPreview').innerHTML = itemsHTML;
    document.getElementById('orderConfirmModal').classList.add('on');
}

function closeOrderConfirm() { haptic('light'); document.getElementById('orderConfirmModal').classList.remove('on'); }

async function confirmOrder() {
    closeOrderConfirm();
    submitOrder();
}

function openTerms() {
    var el = document.getElementById('termsBody');
    el.innerHTML = '<div class="flex justify-between items-center mb-4"><h3 class="text-base font-bold text-gray-800">' + t('read_terms') + '</h3><button onclick="closeTerms()" class="p-1.5 bg-gray-100 rounded-full active:scale-90 transition-transform"><svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="space-y-3 pb-3"><div class="bg-amber-50 rounded-xl p-3 border border-amber-100"><div class="flex items-center gap-2 mb-1.5"><div class="w-6 h-6 rounded-lg bg-amber-200 flex items-center justify-center"><svg class="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><h4 class="font-bold text-[#5D4037] text-xs">' + t('terms_full_payment_title') + '</h4></div><p class="text-xs text-gray-600 leading-relaxed">' + t('terms_full_payment_desc') + '</p></div><div class="bg-blue-50 rounded-xl p-3 border border-blue-100"><div class="flex items-center gap-2 mb-1.5"><div class="w-6 h-6 rounded-lg bg-blue-200 flex items-center justify-center"><svg class="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div><h4 class="font-bold text-[#5D4037] text-xs">' + t('terms_payment_title') + '</h4></div><p class="text-xs text-gray-600 leading-relaxed">' + t('terms_payment_desc') + '</p></div><div class="bg-green-50 rounded-xl p-3 border border-green-100"><div class="flex items-center gap-2 mb-1.5"><div class="w-6 h-6 rounded-lg bg-green-200 flex items-center justify-center"><svg class="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg></div><h4 class="font-bold text-[#5D4037] text-xs">' + t('terms_pickup_title') + '</h4></div><p class="text-xs text-gray-600 leading-relaxed">' + t('terms_pickup_desc') + '</p></div><button onclick="acceptTerms()" class="w-full btn-pri text-xs py-3 mt-2">' + t('terms_label') + '</button></div>';
    document.getElementById('termsModal').classList.add('on');
}
function closeTerms() { document.getElementById('termsModal').classList.remove('on'); }
function acceptTerms() { haptic('ok'); S.termsOk = true; closeTerms(); render(); }

function render() {
    setHead(true); setFoot(true);
    var views = [renderLang, renderInfo, renderProds, renderBranch, renderDates, renderPay, renderProof, renderSource, renderSummary, renderSuccess];
    if (views[S.step]) views[S.step]();
    var root = document.getElementById('appRoot'), isLanding = S.step === 0;
    root.classList.toggle('landing-bg', isLanding); setHead(!isLanding); setFoot(!isLanding);
    if (tg && tg.setHeaderColor) {
        if (isLanding) tg.setHeaderColor('#8b4513'); else tg.setHeaderColor('#FFFFFF');
    }

    document.documentElement.lang = S.lang;
    document.documentElement.dir = 'ltr';
    if (S.lang === 'am') {
        document.body.style.fontFamily = "'Noto Sans Ethiopic', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    } else {
        document.body.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    }

    var headerTitleEl = document.getElementById('headerTitle');
    if (headerTitleEl) headerTitleEl.textContent = t('title');

    updateAlertText(); updateAlert(); updateProgress();
    document.getElementById('stepText').innerText = (S.step > 0 && S.step < 9) ? (S.step + '/8') : '1/8';
    document.getElementById('backBtn').classList.toggle('hidden', S.step <= 0 || S.step >= 9);
    document.getElementById('backBtn').innerText = t('back');
    if (S.step >= 9) { setFoot(false); } else { setFoot(true); document.getElementById('nextBtn').innerText = S.step === 8 ? t('place_order') : t('next'); }
    var m = document.getElementById('content'); if (m) m.scrollTop = 0;
}

function renderLang() {
    var hour = new Date().getHours(), g = '', gi = '';
    if (hour >= 5 && hour < 12) { g = S.lang === 'am' ? '\u12A5\u1295\u12B3\u1295 \u12A0\u12F0\u122B' : 'Good Morning'; gi = '\u2600\uFE0F'; }
    else if (hour >= 12 && hour < 17) { g = S.lang === 'am' ? '\u12A5\u1295\u12B3\u1295 \u12CB\u1209' : 'Good Afternoon'; gi = '\u2615'; }
    else if (hour >= 17 && hour < 21) { g = S.lang === 'am' ? '\u121D\u120D\u12B3\u121D \u121D\u123D\u1275' : 'Good Evening'; gi = '\uD83C\uDF05'; }
    else { g = S.lang === 'am' ? '\u121D\u120D\u12B3\u121D \u120C\u120A\u1275' : 'Good Night'; gi = '\uD83C\uDF19'; }

    var m = document.getElementById('content'); m.classList.remove('can-scroll'); m.className = 'app-main';
    var phI = '<svg class="w-3.5 h-3.5 text-green-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>';
    var tgI = '<svg class="w-3.5 h-3.5 text-sky-300 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>';
    var chkI = '<svg class="w-3 h-3 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>';
    var arrI = '<svg class="w-3 h-3 text-amber-300/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"/></svg>';

    var isAm = S.lang === 'am';

    var h = '<div class="step-pad flex flex-col justify-between py-2 sm:py-3.5 px-3.5 sm:px-4" style="height:100%;max-height:100%;position:relative;overflow:hidden">' +
            beanSceneHTML +
            '<div class="relative z-10 flex flex-col justify-between h-full space-y-2 sm:space-y-3.5 overflow-hidden">' +
            
            '<div class="text-center pt-1 shrink-0">' +
                '<div class="landing-logo-wrap relative w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-2.5 hero-logo-frame logo-pulse" onclick="deepRefresh()">' +
                    '<div class="absolute inset-[-12px] bg-gradient-to-r from-amber-400/35 to-amber-600/35 rounded-full blur-xl"></div>' +
                    '<img src="/logokaldis.png" loading="eager" fetchpriority="high" class="relative z-10 w-full h-full object-contain drop-shadow-2xl" alt="Logo">' +
                '</div>' +
                '<h2 class="text-2xl sm:text-3xl font-black text-gradient-gold tracking-tight leading-none mb-1">'+t('title')+'</h2>' +
                '<p class="text-[10px] sm:text-xs font-bold text-amber-200/90 tracking-widest uppercase mb-1.5">'+t('subtitle')+'</p>' +
                '<div class="inline-flex items-center gap-1.5 px-3 py-1 glass rounded-full shadow-md border border-white/20">' +
                    '<span class="text-xs">'+gi+'</span>' +
                    '<span class="text-[10px] font-bold text-white/95 tracking-wide">'+g+'</span>' +
                '</div>' +
            '</div>' +

            '<div class="shrink-0 px-0.5">' +
                '<div class="flex items-center justify-between gap-1 text-center">' +
                    '<div class="step-chip flex-1 flex flex-col items-center justify-center p-1.5 min-w-0">' +
                        '<span class="text-xs mb-0.5">\uD83C\uDF82</span>' +
                        '<span class="text-[8px] font-extrabold text-amber-100 uppercase tracking-tight leading-none truncate">' + (isAm ? '1. \u1276\u122D\u1270' : '1. Torta') + '</span>' +
                    '</div>' +
                    arrI +
                    '<div class="step-chip flex-1 flex flex-col items-center justify-center p-1.5 min-w-0">' +
                        '<span class="text-xs mb-0.5">\uD83D\uDCCD</span>' +
                        '<span class="text-[8px] font-extrabold text-amber-100 uppercase tracking-tight leading-none truncate">' + (isAm ? '2. \u1245\u122D\u1295\u1296\u123D' : '2. Branch') + '</span>' +
                    '</div>' +
                    arrI +
                    '<div class="step-chip flex-1 flex flex-col items-center justify-center p-1.5 min-w-0">' +
                        '<span class="text-xs mb-0.5">\uD83D\uDCB3</span>' +
                        '<span class="text-[8px] font-extrabold text-amber-100 uppercase tracking-tight leading-none truncate">' + (isAm ? '3. \u12AD\u120D\u12EB' : '3. Payment') + '</span>' +
                    '</div>' +
                    arrI +
                    '<div class="step-chip flex-1 flex flex-col items-center justify-center p-1.5 min-w-0">' +
                        '<span class="text-xs mb-0.5">\uD83C\uDF81</span>' +
                        '<span class="text-[8px] font-extrabold text-amber-100 uppercase tracking-tight leading-none truncate">' + (isAm ? '4. \u1270\u1240\u1260\u120D' : '4. Collect') + '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="shrink my-auto space-y-2 sm:space-y-3">' +
                '<div>' +
                    '<div class="flex items-center justify-center gap-1.5 mb-1.5">' +
                        '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>' +
                        '<p class="text-[10px] sm:text-[11px] font-black text-amber-200 text-center uppercase tracking-[0.2em]">' + (isAm ? '\u1246\u1295\u1246 \u12ED\u121D\u122D\u1290 / Choose Language' : 'Choose Language / \u1246\u1295\u1246 \u12ED\u121D\u122D\u1290') + '</p>' +
                    '</div>' +
                    '<div class="grid grid-cols-2 gap-2.5 sm:gap-3.5">' +
                        '<button onclick="setLang(\'en\')" class="lang-btn relative flex flex-col items-center justify-center gap-1 p-3 sm:p-3.5 rounded-2xl border-2 transition-all active:scale-95 '+(S.lang==='en'?'lang-card-active border-amber-300 shadow-xl shadow-amber-900/30':'glass-light border-white/25 hover:border-white/40')+'">' +
                            (S.lang === 'en' ? '<div class="absolute top-2 right-2 w-4 h-4 bg-amber-500/80 rounded-full flex items-center justify-center border border-amber-200">' + chkI + '</div>' : '') +
                            '<span class="text-2xl sm:text-3xl drop-shadow">\uD83C\uDDEC\uD83C\uDDE7</span>' +
                            '<span class="font-extrabold text-xs sm:text-sm text-white">English</span>' +
                            '<span class="text-[8px] sm:text-[9px] font-medium text-amber-200/80">Fast Pre-Order</span>' +
                        '</button>' +
                        '<button onclick="setLang(\'am\')" class="lang-btn relative flex flex-col items-center justify-center gap-1 p-3 sm:p-3.5 rounded-2xl border-2 transition-all active:scale-95 '+(S.lang==='am'?'lang-card-active border-amber-300 shadow-xl shadow-amber-900/30':'glass-light border-white/25 hover:border-white/40')+'">' +
                            (S.lang === 'am' ? '<div class="absolute top-2 right-2 w-4 h-4 bg-amber-500/80 rounded-full flex items-center justify-center border border-amber-200">' + chkI + '</div>' : '') +
                            '<span class="text-2xl sm:text-3xl drop-shadow">\uD83C\uDDEA\uD83C\uDDF9</span>' +
                            '<span class="font-extrabold text-xs sm:text-sm text-white" style="font-family:\'Noto Sans Ethiopic\',sans-serif">\u12A0\u121B\u122D\u129B</span>' +
                            '<span class="text-[8px] sm:text-[9px] font-medium text-amber-200/80" style="font-family:\'Noto Sans Ethiopic\',sans-serif">\u1260\u12A0\u121B\u122D\u129B \u1240\u123D\u120D</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +

                '<div class="glass p-2.5 sm:p-3 text-center rounded-2xl border border-white/25 shadow-lg space-y-0.5 cta-pulse">' +
                    '<div class="inline-flex items-center gap-1 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider">' +
                        '<span>\u2615</span><span>' + (isAm ? '\u12A5\u1295\u12B3\u1295 \u1260\u12F0\u1205\u1293 \u1211\u1271' : 'Welcome to Kaldi\'s Pre-Order') + '</span>' +
                    '</div>' +
                    '<p class="text-[10px] sm:text-xs text-white/95 leading-relaxed font-semibold">' + t('welcome_msg') + '</p>' +
                '</div>' +
            '</div>' +

            '<div class="shrink-0 pb-1">' +
                '<p class="text-[8px] sm:text-[9px] font-extrabold text-amber-200/70 text-center uppercase tracking-widest mb-1">'+t('help_support')+'</p>' +
                '<div class="grid grid-cols-2 gap-2 sm:gap-2.5">' +
                    '<a href="tel:0930332185" class="glass rounded-xl p-2 sm:p-2.5 flex items-center justify-center gap-1.5 text-white hover:bg-white/20 active:scale-95 transition-all no-underline min-w-0 border border-white/20 shadow-md">' +
                        '<div class="w-6 h-6 sm:w-7 sm:h-7 bg-green-500/35 rounded-lg flex items-center justify-center shrink-0 border border-green-400/40">'+phI+'</div>' +
                        '<div class="text-left leading-none min-w-0 truncate">' +
                            '<p class="text-[8px] sm:text-[9px] text-white/75 font-medium truncate">'+t('call_us')+'</p>' +
                            '<p class="text-[10px] sm:text-xs font-black font-mono text-amber-200 mt-0.5 truncate">0930332185</p>' +
                        '</div>' +
                    '</a>' +
                    '<a href="https://t.me/KaldissCoffee" target="_blank" class="glass rounded-xl p-2 sm:p-2.5 flex items-center justify-center gap-1.5 text-white hover:bg-white/20 active:scale-95 transition-all no-underline min-w-0 border border-white/20 shadow-md">' +
                        '<div class="w-6 h-6 sm:w-7 sm:h-7 bg-sky-500/35 rounded-lg flex items-center justify-center shrink-0 border border-sky-400/40">'+tgI+'</div>' +
                        '<div class="text-left leading-none min-w-0 truncate">' +
                            '<p class="text-[8px] sm:text-[9px] text-white/75 font-medium truncate">'+t('join_community')+'</p>' +
                            '<p class="text-[10px] sm:text-xs font-black text-amber-200 mt-0.5 truncate">Telegram</p>' +
                        '</div>' +
                    '</a>' +
                '</div>' +
            '</div>' +

            '</div></div>';
    m.innerHTML = h;
}

function setLang(l) {
    haptic('med');
    S.lang = l;
    S.step = 1;
    render();
}


function renderInfo() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var phoneDigits = normalizePhone(S.phone);
    var digitCount = phoneDigits.length;
    var countClass = digitCount === 9 ? 'full' : (digitCount > 9 ? 'over' : '');
    var countText = digitCount + '/9 ' + t('digits_counter');
    var inner = '<div class="flex flex-col justify-between h-full py-1 overflow-hidden">' +
                '<div class="text-center mb-2 shrink-0"><div class="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-1 text-base shadow-sm">\uD83D\uDC64</div><h2 class="text-xs font-bold text-gray-800">'+t('step_1')+'</h2></div>' +
                '<div class="space-y-2 my-auto">' +
                '<div class="grid grid-cols-2 gap-2"><div class="inp-g col-span-2"><input type="text" id="fN" value="'+esc(S.firstName)+'" placeholder=" " autocomplete="given-name" oninput="S.firstName=this.value"><label for="fN">'+t('fname_label')+'</label><svg class="inp-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div><div class="inp-g"><input type="text" id="lN" value="'+esc(S.lastName)+'" placeholder=" " autocomplete="family-name" oninput="S.lastName=this.value"><label for="lN">'+t('lname_label')+'</label><svg class="inp-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div><div class="inp-g"><input type="text" id="sN" value="'+esc(S.surname)+'" placeholder=" " oninput="S.surname=this.value"><label for="sN">'+t('sname_label')+'</label><svg class="inp-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div></div>' +
                '<div class="inp-g phone-input-wrap always-float"><span class="phone-prefix">+251</span><input type="tel" id="ph" value="'+esc(phoneDigits)+'" placeholder=" " autocomplete="tel" inputmode="numeric" maxlength="9" oninput="onPhoneInput(this)"><label for="ph" style="left:80px">'+t('phone_label')+'</label><svg class="inp-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg><span class="phone-digit-count '+countClass+'" id="phoneCount">'+countText+'</span></div>' +
                '<p class="text-[9px] text-gray-400 text-center -mt-1">\uD83D\uDCDE '+t('phone_hint')+'</p></div>' +
                '</div>';
    m.innerHTML = pageWrap(1, inner);
    setTimeout(function() { var el = document.getElementById('fN'); if (el) el.focus(); }, 120);
}

function onPhoneInput(el) {
    var raw = toLatinDigits(el.value).replace(/[^0-9]/g, '');
    raw = raw.substring(0, 9);
    el.value = raw;
    S.phone = raw;
    var countEl = document.getElementById('phoneCount');
    if (countEl) {
        var len = raw.length;
        countEl.textContent = len + '/9 ' + t('digits_counter');
        countEl.classList.remove('full', 'over');
        if (len === 9) countEl.classList.add('full');
        else if (len > 9) countEl.classList.add('over');
    }
}

function renderProds() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var tot = 0; S.cart.forEach(function(it) { var p = products.find(function(x) { return x.id === it.product_id; }); if (p) tot += parseFloat(p.unit_price) * it.quantity; });
    var inner = '<div class="flex flex-col h-full overflow-hidden"><div class="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2 mb-2">';
    for (var i = 0; i < products.length; i++) {
        var p = products[i], ic = S.cart.find(function(x) { return x.product_id === p.id; }), pr = parseFloat(p.unit_price), act = '';
        if (ic) { var sub = pr * ic.quantity; act = '<div class="flex items-center justify-between mt-0.5"><span class="text-[9px] text-gray-500 font-mono">'+ic.quantity+' x '+pr.toLocaleString()+' = <b class="text-[#5D4037]">'+sub.toLocaleString()+'</b> '+t('etb')+'</span></div><div class="flex items-center gap-1 mt-1"><button onclick="upd(\''+p.id+'\',-1)" class="qty-b bg-gray-200 text-[#5D4037]">\u2212</button><span class="text-xs font-bold text-[#5D4037] w-6 text-center tabular-nums">'+ic.quantity+'</span><button onclick="upd(\''+p.id+'\',1)" class="qty-b bg-[#5D4037] text-white">+</button></div>'; }
        else { act = '<div class="flex items-center justify-between mt-1"><span class="text-xs font-bold text-[#5D4037]">'+pr.toLocaleString()+' '+t('etb')+'</span><button onclick="addP(\''+p.id+'\')" class="btn-pri text-[10px] py-1.5 px-4 rounded-lg active:scale-95 shadow-sm" style="min-height:auto">'+t('add')+'</button></div>'; }
        var imgSrc = p.image || '';
        var imgHTML = imgSrc ? '<img src="'+imgSrc+'" loading="lazy" onerror="this.src=\'https://via.placeholder.com/150?text=K\'">' : '<div class="w-full h-full flex items-center justify-center text-2xl">\uD83C\uDF82</div>';
        var tapHint = imgSrc ? '<div class="zoom-hint">\uD83D\uDD0D '+t('tap_enlarge')+'</div>' : '';
        inner += '<div class="card p-0 flex flex-col overflow-hidden '+(ic?'sel-card ring-2 ring-amber-400/50':'')+'"><div class="flex gap-2.5 p-2.5 bg-white"><div class="p-img" '+(imgSrc ? 'onclick="viewFullImg(\''+imgSrc.replace(/'/g,"\\'")+'\',\''+esc(p.product_name).replace(/'/g,"\\'")+'\')"' : '')+'>'+imgHTML+tapHint+(ic?'<div class="absolute top-1 left-1 bg-green-500 text-white text-[8px] font-bold w-5 h-5 rounded-full shadow flex items-center justify-center z-10">\u2713</div>':'')+'</div><div class="flex-1 min-w-0 flex flex-col justify-between"><div><h3 class="font-bold text-xs text-gray-800 leading-tight">'+p.product_name+'</h3>'+(p.description?'<p class="text-[9px] text-gray-400 mt-0.5 leading-snug line-clamp-1">'+p.description+'</p>':'')+'</div><div>'+act+'</div></div></div></div>';
    }
    inner += '</div><div class="cart-bar rounded-xl shrink-0"><div class="flex justify-between items-center"><div class="flex items-center gap-1.5"><span class="text-[10px] font-bold text-gray-500">'+t('your_cart')+'</span><span class="text-[10px] font-bold text-[#5D4037] bg-amber-100 px-1.5 py-0.5 rounded-full">'+S.cart.reduce(function(s,it){return s+it.quantity;},0)+'</span></div><span class="text-sm font-extrabold text-[#5D4037]">'+tot.toLocaleString()+' <span class="text-[10px] text-gray-500 font-medium">'+t('etb')+'</span></span></div></div></div>';
    m.innerHTML = pageWrap(2, inner);
}
function addP(id) { haptic('light'); var p = products.find(function(x){return x.id===id;}); S.cart.push({product_id: id, quantity: 1}); renderProds(); }
function upd(id, d) { haptic('selection'); var it = S.cart.find(function(x) { return x.product_id === id; }); if (it) { it.quantity += d; var p = products.find(function(x){return x.id===id;}); if (it.quantity <= 0) { S.cart = S.cart.filter(function(x) { return x.product_id !== id; }); } renderProds(); } }

function renderBranchListHTML() {
    var filtered = branches.filter(function(b) { 
        return !S.searchQ || b.name.toLowerCase().indexOf(S.searchQ.toLowerCase()) >= 0 || (b.location && b.location.toLowerCase().indexOf(S.searchQ.toLowerCase()) >= 0); 
    });
    if (filtered.length === 0) {
        return '<div class="text-center py-8 text-gray-400"><p class="text-xs font-medium">No branches found matching "' + esc(S.searchQ) + '"</p></div>';
    }
    var h = '';
    for (var i = 0; i < filtered.length; i++) {
        var b = filtered[i], sel = S.branch && S.branch.id === b.id;
        var mapBtn = b.location && (b.location.indexOf('http://') === 0 || b.location.indexOf('https://') === 0) ? '<a href="'+b.location+'" target="_blank" onclick="event.stopPropagation()" class="text-[10px] text-sky-600 font-bold underline inline-flex items-center gap-1">🗺️ Open Map</a>' : '';
        var phoneTxt = b.contact_phone ? '<span class="text-[10px] text-gray-500 font-mono">📞 '+b.contact_phone+'</span>' : '';
        h += '<div onclick="selBr(\''+b.id+'\')" class="card p-3 cursor-pointer active:scale-[.98] transition-all '+(sel?'sel-card shadow-md':'')+'"><div class="flex justify-between items-center"><p class="font-bold text-xs text-gray-800">'+b.name+'</p>'+(sel?'<span class="text-amber-800 text-xs font-bold">✓</span>':'')+'</div><div class="flex justify-between items-center mt-1">'+phoneTxt+mapBtn+'</div></div>';
    }
    return h;
}

function renderBranch() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    if (branches.length === 0) {
        m.innerHTML = pageWrap(3, '<div class="flex flex-col items-center justify-center text-center py-12 px-6"><div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-100"><svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div><h3 class="text-sm font-bold text-gray-800 mb-1">'+t('no_branches')+'</h3><p class="text-xs text-gray-500 leading-relaxed mb-4 max-w-xs">'+t('no_branches_desc')+'</p><a href="tel:0930332185" class="btn-pri text-[10px] py-2.5 px-6 rounded-xl shadow-sm inline-flex items-center gap-2" style="min-height:auto"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>'+t('call_us')+'</a></div>');
        var nextBtn = document.getElementById('nextBtn'); if (nextBtn) { nextBtn.disabled = true; nextBtn.style.opacity = '0.5'; nextBtn.style.pointerEvents = 'none'; }
        return;
    }
    var nextBtn = document.getElementById('nextBtn'); if (nextBtn) { nextBtn.disabled = false; nextBtn.style.opacity = '1'; nextBtn.style.pointerEvents = 'auto'; }
    var inner = '<div class="flex flex-col h-full overflow-hidden"><h2 class="text-xs font-bold flex items-center gap-1 mb-2 shrink-0">\uD83D\uDCCD '+t('select_branch')+'</h2><div class="relative mb-2 shrink-0"><div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div><input type="text" id="bSearch" class="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50" placeholder="'+t('search_branch')+'" value="'+esc(S.searchQ)+'" oninput="filterBr(this.value)"></div><div id="bList" class="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2">' + renderBranchListHTML() + '</div></div>';
    m.innerHTML = pageWrap(3, inner);
}

function filterBr(q) {
    S.searchQ = q;
    var listEl = document.getElementById('bList');
    if (listEl) {
        listEl.innerHTML = renderBranchListHTML();
    } else {
        renderBranch();
    }
}
function selBr(id) {
    haptic('med');
    var b = branches.find(function(x) { return x.id === id; });
    if (b) {
        S.branch = b;
        var listEl = document.getElementById('bList');
        if (listEl) {
            listEl.innerHTML = renderBranchListHTML();
        } else {
            renderBranch();
        }
    }
}

function renderDates() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var inner = '<div class="flex flex-col h-full overflow-hidden"><h2 class="text-xs font-bold flex items-center gap-1 mb-2 shrink-0">\uD83D\uDCC5 '+t('select_date')+'</h2><div class="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2">';
    for (var i = 0; i < holidays.length; i++) {
        var h = holidays[i], sel = S.holiday && S.holiday.id === h.id;
        var dt = h.date ? fmtDate(h.date) : '';
        inner += '<div onclick="selDt(\''+h.id+'\')" class="card p-3 cursor-pointer active:scale-[.98] transition-all '+(sel?'sel-card shadow-md':'')+'"><div class="flex justify-between items-center"><p class="font-bold text-xs text-gray-800">'+h.name+'</p>'+(dt?'<span class="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">'+dt+'</span>':'')+'</div></div>';
    }
    inner += '</div></div>';
    m.innerHTML = pageWrap(4, inner);
}
function selDt(id) { haptic('med'); var h = holidays.find(function(x) { return x.id === id; }); if (h) { S.holiday = h; renderDates(); } }

function renderPay() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var inner = '<div class="flex flex-col h-full overflow-hidden"><h2 class="text-xs font-bold flex items-center gap-1 mb-2 shrink-0">\uD83D\uDCB3 '+t('select_payment')+'</h2><div class="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2">';
    for (var i = 0; i < payMethods.length; i++) {
        var pm = payMethods[i], sel = S.payment && S.payment.id === pm.id;
        var accDetails = '';
        if (pm.account_number || pm.account_name) {
            accDetails = '<div class="flex items-center gap-1.5 mt-1.5 flex-wrap">' +
                (pm.account_number ? '<span class="text-xs font-extrabold font-mono text-gray-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 tracking-wide">💳 ' + esc(pm.account_number) + '</span>' : '') +
                (pm.account_name ? '<span class="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-lg border border-amber-200/50">👤 ' + esc(pm.account_name) + '</span>' : '') +
                '</div>';
        }
        var instrText = pm.instructions ? '<p class="text-[10px] text-gray-500 mt-1 italic">' + esc(pm.instructions) + '</p>' : '';
        inner += '<div onclick="selPm(\''+pm.id+'\')" class="card p-3 cursor-pointer active:scale-[.98] transition-all '+(sel?'sel-card shadow-md ring-2 ring-amber-400/50':'')+'"><div class="flex justify-between items-center"><h3 class="font-bold text-xs text-gray-800">'+esc(pm.name)+'</h3>'+(sel?'<span class="text-amber-800 text-xs font-bold">✓</span>':'')+'</div>'+accDetails+instrText+'</div>';
    }
    inner += '</div></div>';
    m.innerHTML = pageWrap(5, inner);
}
function selPm(id) { haptic('med'); var pm = payMethods.find(function(x) { return x.id === id; }); if (pm) { S.payment = pm; renderPay(); } }

function renderProof() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var slipPreview = '';
    if (S.paySlipPrev) {
        if (S.paySlipType === 'pdf') {
            slipPreview = '<div class="relative bg-red-50 rounded-xl p-2.5 border-2 border-red-200 flex items-center gap-3"><div class="pdf-icon-box"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg></div><div class="flex-1 min-w-0"><p class="pdf-filename">'+esc(S.paySlipName||'document.pdf')+'</p><p class="text-[9px] text-gray-500 font-bold">\u2705 '+t('pdf_attached')+'</p></div><button onclick="clearImg()" class="pdf-remove-btn">\u2715</button></div>';
        } else {
            slipPreview = '<div class="relative rounded-xl overflow-hidden border-2 border-amber-300 shadow-md"><img src="'+S.paySlipPrev+'" class="w-full h-28 object-cover"><button onclick="clearImg()" class="pdf-remove-btn">\u2715</button></div>';
        }
    } else {
        slipPreview = '<div class="border-2 border-dashed border-amber-300 rounded-xl p-3 text-center cursor-pointer bg-amber-50/50 hover:bg-amber-50 transition-colors" onclick="document.getElementById(\'slipInp\').click()"><input type="file" accept="image/*,application/pdf" id="slipInp" onchange="onSlipChange(event)" class="hidden"><svg class="w-7 h-7 mx-auto text-amber-700 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><p class="text-xs font-bold text-amber-900 mb-0.5">'+t('upload_slip')+'</p><p class="text-[9px] text-amber-700/80">'+t('warning_first_page')+'</p></div>';
    }

    var payAccountBox = S.payment && (S.payment.account_number || S.payment.account_name)
        ? '<div class="card p-2.5 mb-2 text-center bg-amber-50/80 border border-amber-200 shadow-sm rounded-xl"><div class="flex justify-between items-center mb-1"><p class="text-[9px] text-gray-500 uppercase font-bold tracking-widest">'+t('pay_to')+' ('+esc(S.payment.name)+')</p><span class="text-xs">💳</span></div>' +
          (S.payment.account_number ? '<p class="font-mono font-bold text-xs tracking-widest text-[#3E2723] bg-white py-1.5 px-3 rounded-lg border border-amber-300 w-full mb-1">Account: '+esc(S.payment.account_number)+'</p>' : '') +
          (S.payment.account_name ? '<p class="text-[10px] font-bold text-amber-900 bg-amber-100 inline-block px-2.5 py-0.5 rounded-full border border-amber-200">Name: '+esc(S.payment.account_name)+'</p>' : '') +
          '</div>'
        : '';

    var inner = '<div class="flex flex-col justify-between h-full overflow-hidden py-1">' +
                '<h2 class="text-xs font-bold flex items-center gap-1 shrink-0 mb-1.5">\uD83D\uDCF8 '+t('payment_proof')+'</h2>' +
                payAccountBox +
                '<div class="bg-amber-50 rounded-xl p-2 border border-amber-200 shrink-0 mb-1.5"><p class="text-[10px] text-amber-900 leading-relaxed font-medium">\u2139\uFE0F '+t('payment_warning')+'</p></div>' +
                '<div class="inp-g shrink-0 mb-2"><input type="text" id="pRef" value="'+esc(S.payRef)+'" placeholder=" " oninput="S.payRef=this.value"><label for="pRef">'+t('enter_reference')+'</label><svg class="inp-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg></div>' +
                '<div class="shrink-0 mb-2">'+slipPreview+'</div>' +
                '<div class="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-gray-200 shrink-0"><input type="checkbox" id="tCk" '+(S.termsOk?'checked':'')+' onchange="S.termsOk=this.checked" class="w-4 h-4 text-[#5D4037] rounded border-gray-300 focus:ring-amber-500"><label for="tCk" class="text-xs text-gray-700 flex-1">'+t('terms_label')+' <a href="javascript:void(0)" onclick="openTerms()" class="text-amber-800 font-bold underline">'+t('terms_link')+'</a></label></div>' +
                '</div>';
    m.innerHTML = pageWrap(6, inner);
}

function onSlipChange(e) {
    var f = e.target.files[0];
    if (!f) return;
    var isImage = f.type.startsWith('image/');
    var isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) { toast(t('error_file_type'), 'error'); e.target.value = ''; return; }
    if (f.size > 10*1024*1024) { toast('Too large (max 10MB)', 'error'); e.target.value = ''; return; }
    haptic('med');
    if (isPdf) {
        S.paySlipType = 'pdf'; S.paySlipName = f.name; S.paySlipPrev = 'pdf';
        var reader = new FileReader();
        reader.onload = function(ev) { S.paySlip = ev.target.result; render(); };
        reader.readAsDataURL(f);
    } else {
        S.paySlipType = 'image'; S.paySlipName = f.name;
        var reader2 = new FileReader();
        reader2.onload = function(ev) { S.paySlip = ev.target.result; S.paySlipPrev = ev.target.result; render(); };
        reader2.readAsDataURL(f);
    }
}
function clearImg() { haptic('light'); S.paySlip = null; S.paySlipPrev = null; S.paySlipType = null; S.paySlipName = null; render(); }

function renderSource() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var src = [{id:'sms',lbl:t('source_sms'),ic:'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',c:'bg-green-100 text-green-600'},{id:'telegram',lbl:'Telegram',ic:'M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.75-.33 1.4.18 1.16 1.28l-2.75 14.05c-.19.97-.74 1.13-1.43.71L12.6 17.3l-2.18 2.1c-.24.25-.44.46-.91.46z',c:'bg-sky-100 text-sky-500'},{id:'instagram',lbl:t('source_instagram'),ic:'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.012-3.584.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',c:'bg-pink-100 text-pink-500'},{id:'tiktok',lbl:'TikTok',ic:'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z',c:'bg-gray-100 text-gray-800'}];
    var inner = '<div class="flex flex-col justify-between h-full overflow-hidden py-1"><h2 class="text-xs font-bold flex items-center gap-1 mb-2 shrink-0">\uD83D\uDCE2 '+t('hear_about')+'</h2><div class="space-y-2 my-auto">';
    for (var i = 0; i < src.length; i++) { var s = src[i], sel = S.hearAbout === s.id; inner += '<div onclick="S.hearAbout=\''+s.id+'\';haptic(\'med\');render()" class="card p-3 cursor-pointer flex items-center gap-3 active:scale-[.98] transition-all '+(sel?'sel-card shadow-md ring-2 ring-amber-400/50':'')+'"><div class="w-9 h-9 rounded-lg '+s.c+' flex items-center justify-center shrink-0 shadow-sm border border-white/50"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="'+s.ic+'"/></svg></div><span class="text-xs font-bold text-gray-800 flex-1">'+s.lbl+'</span><div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 '+(sel?'bg-[#5D4037] border-[#5D4037] shadow-sm':'border-gray-300')+'">'+(sel?'<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>':'')+'</div></div>'; }
    inner += '</div></div>'; m.innerHTML = pageWrap(7, inner);
}

function renderSummary() {
    var m = document.getElementById('content');
    m.className = 'app-main';
    var tot = S.cart.reduce(function(s, it) { var p = products.find(function(x) { return x.id === it.product_id; }); return s + (p ? parseFloat(p.unit_price) * it.quantity : 0); }, 0), fn = '<span class="name-bold">'+esc(S.firstName)+'</span> <span class="name-bold">'+esc(S.lastName)+'</span>'+(S.surname ? ' <span class="name-bold">'+esc(S.surname)+'</span>' : ''), hd = S.holiday && S.holiday.date ? fmtDate(S.holiday.date) : '';
    m.innerHTML = pageWrap(8, '<div class="flex flex-col h-full overflow-hidden"><h2 class="text-xs font-bold flex items-center gap-1 mb-2 shrink-0">\uD83E\uDDF3 '+t('order_summary')+'</h2><div class="flex-1 min-h-0 overflow-y-auto pr-0.5">' + buildReceipt({tot: tot, fn: fn, hd: hd, slip: true}) + '</div></div>');
}

function buildReceipt(opts) {
    var tot = opts.tot, fn = opts.fn, hd = opts.hd, slip = opts.slip;
    var phoneDisplay = fmtPhoneDisplay(S.phone);
    var h = '<div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"><div class="bg-gradient-to-r from-[#3E2723] to-[#5D4037] p-3 flex items-center justify-between"><img src="/logokaldis.png" class="h-6" alt="Logo"><div class="text-right"><p class="text-[7px] text-amber-200/80 font-bold tracking-widest uppercase">'+t('order_number')+'</p><p class="text-xs font-mono font-bold text-white tracking-wider">'+(S.orderNum||'')+'</p></div></div><div class="p-3 space-y-2"><div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 rounded-lg p-2"><p class="text-[7px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">\uD83D\uDC64 '+t('summary_customer')+'</p><p class="text-[11px] font-bold text-gray-800 leading-snug">'+fn+'</p><p class="text-[11px] font-bold font-mono text-gray-800 tracking-wide">'+phoneDisplay+'</p></div><div class="bg-gray-50 rounded-lg p-2"><p class="text-[7px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">\uD83D\uDCCD '+t('summary_pickup')+'</p><p class="text-[11px] font-bold text-gray-800 leading-snug">'+(S.branch?S.branch.name:'')+'</p><div class="flex items-center gap-1 mt-0.5 flex-wrap"><span class="text-[9px] text-gray-500">'+(S.holiday?S.holiday.name:'')+'</span>'+(hd?'<span class="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[7px] font-bold">'+hd+'</span>':'')+'</div></div></div><hr class="rc-div"><div class="grid grid-cols-2 gap-2"><div class="bg-gray-50 rounded-lg p-2"><p class="text-[7px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">\uD83D\uDCB3 '+t('summary_payment')+'</p><p class="text-[11px] font-bold text-gray-800">'+(S.payment?S.payment.name:'')+'</p>'+(S.payment&&S.payment.account_number?'<p class="text-[9px] font-mono text-gray-500 mt-0.5">'+S.payment.account_number+'</p>':'')+'</div><div class="bg-gray-50 rounded-lg p-2"><p class="text-[7px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">\uD83D\uDCE2 '+t('summary_source')+'</p><p class="text-[11px] font-bold text-gray-800">'+(S.hearAbout?srcLbl(S.hearAbout):'')+'</p>'+(S.payRef?'<p class="text-[8px] text-gray-400 mt-1">'+t('summary_ref')+': <span class="font-mono text-gray-600">'+S.payRef+'</span></p>':'')+'</div></div><hr class="rc-div"><div><p class="text-[7px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">\uD83D\uDECD '+t('summary_items')+'</p>';
    for (var i = 0; i < S.cart.length; i++) { var it = S.cart[i], p = products.find(function(x) { return x.id === it.product_id; }); if (!p) continue; h += '<div class="flex justify-between items-center text-[10px] mb-1"><div class="flex-1 pr-2"><p class="font-bold text-gray-800">'+p.product_name+'</p><p class="text-[8px] text-gray-400">\u00D7'+it.quantity+' @ '+parseFloat(p.unit_price).toLocaleString()+' ETB</p></div><span class="font-bold text-gray-800 font-mono text-[10px]">'+(parseFloat(p.unit_price)*it.quantity).toLocaleString()+'</span></div>'; }
    h += '</div>';
    if (slip && S.paySlipPrev) {
        h += '<hr class="rc-div"><div><p class="text-[7px] uppercase font-bold text-gray-400 tracking-wider mb-1">\uD83D\uDCF8 '+t('summary_proof')+'</p>';
        if (S.paySlipType === 'pdf') {
            h += '<div class="flex items-center gap-2 bg-red-50 rounded-lg p-2 border border-red-200/50"><div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4 text-red-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg></div><div class="flex-1 min-w-0"><p class="text-[10px] font-bold text-gray-800 truncate">'+esc(S.paySlipName||'document.pdf')+'</p><p class="text-[8px] text-gray-500">'+t('pdf_attached')+'</p></div></div>';
        } else {
            h += '<img src="'+S.paySlipPrev+'" class="w-full h-20 object-cover rounded-lg border border-gray-200 shadow-sm">';
        }
        h += '</div>';
    }
    h += '<hr class="rc-div"><div class="flex justify-between items-end pt-0.5"><span class="text-[9px] uppercase font-bold text-gray-500 tracking-wider">'+t('total')+'</span><span class="text-lg font-extrabold text-[#5D4037] font-mono">'+tot.toLocaleString()+' <span class="text-[10px] font-bold text-gray-500 font-normal">'+t('etb')+'</span></span></div></div></div>';
    return h;
}

function launchFireworks() {
    haptic('heavy');
    var existing = document.getElementById('fwCanvas');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    
    var canvas = document.createElement('canvas');
    canvas.id = 'fwCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
    
    var ctx = canvas.getContext('2d');
    var width = canvas.width = window.innerWidth;
    var height = canvas.height = window.innerHeight;
    
    var particles = [];
    var colors = ['#FFD700', '#FF9800', '#FF3D00', '#4CAF50', '#00E5FF', '#E91E63', '#9C27B0', '#FFFFFF', '#FFEA00'];

    function createBurst(cx, cy, count) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 9 + 2.5;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (Math.random() * 2),
                radius: Math.random() * 3.5 + 1.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Math.random() * 0.018 + 0.012,
                gravity: 0.15
            });
        }
    }

    createBurst(width * 0.5, height * 0.28, 65);
    setTimeout(function() { createBurst(width * 0.25, height * 0.22, 55); }, 220);
    setTimeout(function() { createBurst(width * 0.75, height * 0.22, 55); }, 420);
    setTimeout(function() { createBurst(width * 0.5, height * 0.38, 75); }, 650);
    setTimeout(function() { createBurst(width * 0.35, height * 0.3, 50); }, 900);
    setTimeout(function() { createBurst(width * 0.65, height * 0.3, 50); }, 1100);

    function loop() {
        ctx.clearRect(0, 0, width, height);
        var activeCount = 0;
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (p.alpha <= 0) continue;
            activeCount++;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.985;
            p.alpha -= p.decay;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (activeCount > 0) {
            requestAnimationFrame(loop);
        } else {
            if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
    }
    loop();
}

function renderSuccess() {
    window.onbeforeunload = null; setHead(false); setFoot(false);
    launchFireworks();
    var m = document.getElementById('content');
    m.classList.remove('can-scroll');
    m.className = 'app-main';
    m.innerHTML = '<div class="step-pad flex flex-col items-center text-center justify-center" style="height:100%;padding-top:16px;padding-bottom:16px">'+beanSceneHTML+'<div class="relative z-10 flex flex-col items-center"><div class="w-16 h-16 rounded-full bg-green-100 mb-3 flex items-center justify-center shadow-inner border-4 border-green-50 relative"><div class="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-50"></div><svg class="w-8 h-8 text-green-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div><h2 class="text-lg font-black text-gray-800 mb-1.5">'+t('order_success')+'</h2><div class="bg-white border-2 border-green-100 rounded-xl px-5 py-3 shadow-sm mb-2.5 w-full max-w-xs"><p class="text-[8px] text-gray-400 uppercase font-bold tracking-widest mb-0.5">'+t('order_number')+'</p><p class="text-xl font-mono font-black text-[#5D4037] tracking-wider">'+S.orderNum+'</p></div><p class="text-[10px] text-gray-600 mb-4 leading-relaxed font-medium px-4">'+t('thank_you')+'</p><div class="w-full space-y-2 max-w-xs"><a href="https://t.me/KaldissCoffee" target="_blank" class="flex w-full py-3 rounded-xl bg-[#229ED9] text-white font-bold text-[11px] shadow-lg items-center justify-center gap-1.5 active:scale-95 transition-transform"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>'+t('join_community')+'</a><div class="grid grid-cols-2 gap-2"><button onclick="viewOrder()" class="py-3 rounded-xl bg-[#5D4037] text-white font-bold text-[11px] active:scale-95 transition-transform shadow-md">'+t('view_order')+'</button><button onclick="trackOrderInBot()" class="py-3 rounded-xl bg-amber-100 text-amber-900 font-bold text-[11px] active:scale-95 transition-transform flex items-center justify-center shadow-sm">'+t('track_order')+'</button></div><button onclick="doReset()" class="w-full py-3 rounded-xl btn-pri text-[11px] shadow-lg active:scale-95 transition-transform">'+t('order_again')+'</button></div></div></div>';
}

function trackOrderInBot() { haptic('med'); if (tg && tg.close) tg.close(); }

function viewOrder() {
    setHead(false); setFoot(false);
    var m = document.getElementById('content');
    m.classList.add('can-scroll');
    m.classList.remove('app-main');
    m.className = 'app-main can-scroll';
    var tot = S.cart.reduce(function(s, it) { var p = products.find(function(x) { return x.id === it.product_id; }); return s + (p ? parseFloat(p.unit_price) * it.quantity : 0); }, 0), fn = '<span class="name-bold">'+esc(S.firstName)+'</span> <span class="name-bold">'+esc(S.lastName)+'</span>'+(S.surname ? ' <span class="name-bold">'+esc(S.surname)+'</span>' : ''), hd = S.holiday && S.holiday.date ? fmtDate(S.holiday.date) : '';
    m.innerHTML = '<div class="flex items-center justify-between mb-3 sticky top-0 z-10" style="margin:-10px -14px 10px;padding:10px 14px 6px;background:linear-gradient(to bottom,var(--bg) 80%,transparent)"><button onclick="renderSuccess()" class="p-2 bg-white rounded-lg active:scale-90 transition-transform shadow-sm border border-gray-100"><svg class="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button><h1 class="font-bold text-xs text-gray-800">\uD83E\uDDF3 '+t('order_summary')+'</h1><div class="w-8"></div></div>' + buildReceipt({tot: tot, fn: fn, hd: hd, slip: true}) + '<div class="mt-3"><button onclick="doReset()" class="w-full py-3 rounded-xl btn-pri text-xs shadow-lg active:scale-95 transition-transform">'+t('order_again')+'</button></div>';
}

function doReset() {
    haptic('med'); S.cart = []; S.branch = null; S.holiday = null; S.payment = null;
    S.firstName = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.first_name || '' : '';
    S.lastName = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.last_name || '' : '';
    S.surname = ''; S.phone = ''; S.payRef = ''; S.paySlip = null; S.paySlipPrev = null; S.paySlipType = null; S.paySlipName = null; S.hearAbout = null; S.orderNum = null; S.termsOk = false; S.step = 2;
    render();
}

function fmtPhoneSubmit(phone) {
    if (!phone) return '';
    var digits = String(phone).replace(/[^0-9]/g, '');
    if (digits.indexOf('251') === 0) digits = digits.substring(3);
    if (digits.indexOf('0') === 0) digits = digits.substring(1);
    return '+251' + digits;
}

async function submitOrder() {
    if (S.busy) return;
    S.busy = true;

    var nextBtnEl = document.getElementById('nextBtn');
    if (nextBtnEl) {
        nextBtnEl.disabled = true;
        nextBtnEl.style.opacity = '0.5';
        nextBtnEl.style.pointerEvents = 'none';
        nextBtnEl.innerHTML = '<div class="spinner"></div> ' + t('processing');
    }

    try {
        haptic('heavy');
        var cartData = S.cart.map(function(it) { var p = products.find(function(x) { return x.id === it.product_id; }); return {product_id: it.product_id, quantity: it.quantity, unit_price: p ? p.unit_price : 0}; });

        var phoneForServer = fmtPhoneSubmit(S.phone);

        var payload = {
            first_name: S.firstName,
            father_name: S.lastName,
            surname: S.surname,
            phone_number: phoneForServer,
            collection_branch_id: S.branch ? S.branch.id : null,
            collection_day_id: S.holiday ? S.holiday.id : null,
            payment_method: S.payment ? S.payment.name : 'CBE',
            transaction_reference: S.payRef,
            payment_slip: S.paySlip,
            items: cartData,
            chat_id: S.chatId
        };

        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, 15000);

        var res = await fetch('/api/pre-orders/miniapp/order', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);

        var raw = await res.text();
        var data;
        try { data = JSON.parse(raw); } catch(e) { toast('Server error. Please try again.', 'error'); resetBtn(); return; }

        if (data.success && data.order_number) {
            S.orderNum = data.order_number;
            S.step = 9; render(); haptic('ok'); toast(t('order_success'), 'ok');
        } else {
            toast(data.message || t('error_order'), 'error'); resetBtn();
        }
    } catch(e) {
        if (e.name === 'AbortError') { toast('Request timed out. Please try again.', 'error'); }
        else { console.error(e); toast(t('error_order'), 'error'); }
        resetBtn();
    }
}

function resetBtn() {
    S.busy = false;
    var b = document.getElementById('nextBtn');
    if (b) { b.innerHTML = t('place_order'); b.disabled = false; b.style.opacity = '1'; b.style.pointerEvents = 'auto'; }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeImgViewer(); closeTerms(); closeExit(); closeOrderConfirm(); }
});

document.getElementById('appRoot').style.display = 'flex';
setupBack();
render();
</script>
</body>
</html>
