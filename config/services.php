<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'powerbi' => [
        'key' => env('POWER_BI_API_KEY'),
    ],

    'forms' => [
        'key' => env('FORMS_API_KEY', env('POWER_BI_API_KEY', 'kaldis_forms_api_2026')),
    ],

    'geezsms' => [
        'token' => env('GEEZSMS_TOKEN'),
        'shortcode_id' => env('GEEZSMS_SHORTCODE_ID'),
        'callback_url' => env('GEEZSMS_CALLBACK_URL'),
    ],

];
