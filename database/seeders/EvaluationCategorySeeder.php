<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EvaluationCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Peer to Peer Evaluation', 'weight' => 20],
            ['name' => 'Bottom Up Evaluation', 'weight' => 20],
            ['name' => 'Top Down Evaluation', 'weight' => 40],
            ['name' => 'Department to Department', 'weight' => 20],
            ['name' => 'Branch Managers Evaluation', 'weight' => 0],
        ];

        foreach ($categories as $category) {
            \App\Models\EvaluationCategory::updateOrCreate(
                ['name' => $category['name']],
                ['weight' => $category['weight'], 'is_active' => true]
            );
        }
    }
}
