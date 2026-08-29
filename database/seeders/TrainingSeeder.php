<?php

namespace Database\Seeders;

use App\Models\Training\Badge;
use App\Models\Training\CertificateTemplate;
use App\Models\Training\Course;
use App\Models\Training\CourseCategory;
use App\Models\Training\CourseLesson;
use App\Models\Training\Question;
use App\Models\Training\Quiz;
use App\Models\Training\SopDocument;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TrainingSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Course Categories
        $cat1 = CourseCategory::firstOrCreate(['slug' => 'barista-coffee-skills'], [
            'name' => 'Barista Skills & Coffee Knowledge',
            'icon' => 'coffee',
            'color' => '#d97706',
            'status' => 'active',
        ]);

        $cat2 = CourseCategory::firstOrCreate(['slug' => 'food-safety-hygiene'], [
            'name' => 'Food Safety & Hygiene',
            'icon' => 'shield-check',
            'color' => '#059669',
            'status' => 'active',
        ]);

        $cat3 = CourseCategory::firstOrCreate(['slug' => 'customer-service-excellence'], [
            'name' => 'Customer Service Excellence',
            'icon' => 'users',
            'color' => '#2563eb',
            'status' => 'active',
        ]);

        // 2. Certificate Template
        $certTemplate = CertificateTemplate::firstOrCreate(['name' => 'Standard Corporate Certificate'], [
            'html_template' => '<h1>Certificate of Completion</h1><p>This certifies that {{employee_name}} has completed {{course_name}}.</p>',
            'is_default' => true,
        ]);

        // 3. Courses & Lessons
        $course1 = Course::firstOrCreate(['slug' => 'espresso-extraction-mastery'], [
            'category_id' => $cat1->id,
            'title' => 'Espresso Extraction & Grinder Calibration',
            'description' => 'Master the fundamentals of espresso dosing, tamping pressure, extraction yield, and daily grinder calibration for perfect coffee quality.',
            'duration_hours' => 3.0,
            'difficulty' => 'intermediate',
            'passing_score' => 80,
            'is_featured' => true,
            'is_mandatory' => true,
            'certificate_template_id' => $certTemplate->id,
            'enrollment_type' => 'open',
            'max_attempts' => 3,
            'deadline_days' => 14,
            'status' => 'published',
            'published_at' => now(),
        ]);

        CourseLesson::firstOrCreate([
            'course_id' => $course1->id,
            'title' => 'Grinder Calibration & Dose Measurement',
        ], [
            'type' => 'video',
            'youtube_url' => 'https://www.youtube.com/watch?v=L_LUpnjgPso',
            'youtube_video_id' => 'L_LUpnjgPso',
            'content' => "Lesson 1: Grinder Calibration\n\n1. Ensure grinder hopper is clean.\n2. Adjust grind size setting based on target 25-30 second extraction time.\n3. Measure dry dose (18g-20g) on digital scale.",
            'duration_minutes' => 15,
            'sort_order' => 1,
            'status' => 'active',
        ]);

        CourseLesson::firstOrCreate([
            'course_id' => $course1->id,
            'title' => 'Tamping Technique & Extraction Ratio',
        ], [
            'type' => 'video',
            'youtube_url' => 'https://www.youtube.com/watch?v=g2r2LhGzXkM',
            'youtube_video_id' => 'g2r2LhGzXkM',
            'content' => "Lesson 2: Level Tamping\n\n1. Apply level 15kg tamping pressure.\n2. Ensure clean portafilter rim.\n3. Aim for 36g liquid yield in 27 seconds.",
            'duration_minutes' => 20,
            'sort_order' => 2,
            'status' => 'active',
        ]);

        // Quiz for Course 1
        $quiz1 = Quiz::firstOrCreate(['course_id' => $course1->id, 'title' => 'Espresso Extraction Proficiency Test'], [
            'time_limit_minutes' => 15,
            'pass_mark' => 80,
            'max_attempts' => 3,
            'status' => 'active',
        ]);

        $q1 = Question::firstOrCreate(['quiz_id' => $quiz1->id, 'text' => 'What is the optimal extraction time window for a standard espresso shot?'], [
            'type' => 'single',
            'points' => 1,
            'sort_order' => 1,
        ]);

        $q1->answers()->firstOrCreate(['text' => '25 - 30 Seconds', 'is_correct' => true, 'sort_order' => 1]);
        $q1->answers()->firstOrCreate(['text' => '10 - 15 Seconds', 'is_correct' => false, 'sort_order' => 2]);
        $q1->answers()->firstOrCreate(['text' => '45 - 60 Seconds', 'is_correct' => false, 'sort_order' => 3]);

        // 4. Badges
        Badge::firstOrCreate(['name' => 'First Course Completed'], [
            'description' => 'Awarded for completing your first corporate training course.',
            'icon' => 'award',
            'criteria_type' => 'first_course',
            'criteria_value' => 1,
            'points' => 50,
        ]);

        Badge::firstOrCreate(['name' => 'Coffee Master'], [
            'description' => 'Awarded for scoring 100% on Barista extraction tests.',
            'icon' => 'coffee',
            'criteria_type' => 'score',
            'criteria_value' => 100,
            'points' => 100,
        ]);

        // 5. SOP Documents
        SopDocument::firstOrCreate(['title' => 'Daily Machine Sanitization & Backflushing SOP'], [
            'version' => '1.2',
            'category' => 'Food Safety',
            'content' => "Daily Backflushing Procedure:\n\n1. Insert blind filter into portafilter.\n2. Add 1 scoop espresso cleaner detergent.\n3. Lock group head and run for 10 seconds, repeat 5 times.\n4. Rinse thoroughly with hot water.",
            'effective_date' => now(),
            'requires_acknowledgement' => true,
            'status' => 'active',
        ]);
    }
}
