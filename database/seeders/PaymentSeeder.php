<?php

namespace Database\Seeders;

use App\Models\PaymentCategory;
use App\Models\PaymentType;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    public function run(): void
    {
        $expense = PaymentCategory::firstOrCreate(['name' => 'Expense']);
        $cost = PaymentCategory::firstOrCreate(['name' => 'Cost']);

        PaymentType::firstOrCreate(['name' => 'General Expense', 'payment_category_id' => $expense->id]);
        PaymentType::firstOrCreate(['name' => 'Travel Expense', 'payment_category_id' => $expense->id]);
        PaymentType::firstOrCreate(['name' => 'Direct Cost', 'payment_category_id' => $cost->id]);
        PaymentType::firstOrCreate(['name' => 'Overhead Cost', 'payment_category_id' => $cost->id]);
    }
}
