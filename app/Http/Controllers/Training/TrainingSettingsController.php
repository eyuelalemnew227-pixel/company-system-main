<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\TrainingSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TrainingSettingsController extends Controller
{
    /**
     * Display Training Settings Management Page
     */
    public function index(): Response
    {
        $defaultQuestionnaire = [
            [
                'key' => 'content_clarity',
                'title' => 'የስልጠናው ይዘት ግልፅነትና ጠቃሚነት (Content Clarity & Value)',
                'description' => 'Were the training materials clear, easy to understand, and valuable for branch operations?',
            ],
            [
                'key' => 'preparation',
                'title' => 'የአሰልጣኙ ዝግጅትና አቀራረብ (Trainer Preparation & Presentation)',
                'description' => 'Was the department trainer well prepared, engaging, and clear in presenting?',
            ],
            [
                'key' => 'time_management',
                'title' => 'የጊዜ አጠቃቀም (Time Management & Schedule Adherence)',
                'description' => 'Did the trainer respect the allocated duration and start/end time slots?',
            ],
            [
                'key' => 'applicability',
                'title' => 'በስራ ላይ ያለው ተገቢነት (Practical Applicability to Work)',
                'description' => 'Is the knowledge directly applicable to solving branch challenges and improving results?',
            ],
        ];

        $defaultDeliveryMethods = [
            'In-Person (በአካል)',
            'On-the-Job Training (በስራ ላይ)',
            'Off-the-Job Training (ከስራ ውጪ)',
            'Virtual / Telegram Live (በቪዲዮ)',
            'Workshop & Practical (ተግባራዊ ስልጠና)',
        ];

        $defaultTargetRoles = [
            'Branch Managers (የቅርንጫፍ ስራ አስኪያጅ)',
            'Assistant Managers (ምክትል ስራ አስኪያጅ)',
            'Store Keepers (እቃ ግምጃ ቤት ሃላፊ)',
            'Cashiers (ካሸር)',
            'Baristas (ባሪስታ)',
            'Shift Leaders (የክፍል መሪ)',
        ];

        $defaultResourceCategories = [
            'Projector & Screen (ፕሮጀክተርና ስክሪን)',
            'Sound System & Microphone (ድምፅ ማጉያ)',
            'Printed Training Manual / Booklet (የስልጠና ማኑዋል ቦክሌት)',
            'Flipchart & Markers (ፍሊፕ ቻርት)',
            'Laptop / Presentation Computer (ላፕቶፕ)',
            'Coffee & Refreshment Catering (የሻይና ቡና መስተንግዶ)',
        ];

        $defaultAgendaTitles = [
            'title_label' => '1. የስልጠናው ርዕስ (Training Title / Topic)',
            'objectives_label' => '2. የስልጠናው ዓላማ (Training Objectives)',
            'outline_label' => '3. የስልጠናው ይዘት (Training Content Outline)',
            'roles_label' => '4. የስልጠናው ተሳታፊዎች (Target Trainee Roles)',
            'method_label' => '5. የስልጠናው አሰጣጥ ዘዴ (Delivery Method)',
            'resources_label' => '6. የስልጠናው የሚያስፈልጉ ግብአቶች (Required Resources)',
        ];

        $questionnaire = TrainingSetting::getByKey('questionnaire_metrics', $defaultQuestionnaire);
        $deliveryMethods = TrainingSetting::getByKey('delivery_methods', $defaultDeliveryMethods);
        $targetRoles = TrainingSetting::getByKey('target_trainee_roles', $defaultTargetRoles);
        $resourceCategories = TrainingSetting::getByKey('resource_categories', $defaultResourceCategories);
        $agendaTitles = TrainingSetting::getByKey('agenda_labels', $defaultAgendaTitles);
        $instructions = TrainingSetting::getByKey('agenda_instructions', 'እባክዎን የስልጠና ይዘት እና ዓላማ በግልፅ በመሙላት ለስልጠና ክፍሉ ያስረክቡ።');

        return Inertia::render('training/settings/Index', [
            'questionnaire' => $questionnaire,
            'deliveryMethods' => $deliveryMethods,
            'targetRoles' => $targetRoles,
            'resourceCategories' => $resourceCategories,
            'agendaTitles' => $agendaTitles,
            'instructions' => $instructions,
        ]);
    }

    /**
     * Save Training Settings
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'questionnaire' => 'required|array',
            'deliveryMethods' => 'required|array',
            'targetRoles' => 'required|array',
            'resourceCategories' => 'required|array',
            'agendaTitles' => 'required|array',
            'instructions' => 'nullable|string',
        ]);

        TrainingSetting::setByKey('questionnaire_metrics', $validated['questionnaire']);
        TrainingSetting::setByKey('delivery_methods', array_filter($validated['deliveryMethods']));
        TrainingSetting::setByKey('target_trainee_roles', array_filter($validated['targetRoles']));
        TrainingSetting::setByKey('resource_categories', array_filter($validated['resourceCategories']));
        TrainingSetting::setByKey('agenda_labels', $validated['agendaTitles']);
        TrainingSetting::setByKey('agenda_instructions', $validated['instructions'] ?? '');

        return back()->with('success', 'Training Settings and Manual Guidelines updated successfully!');
    }
}
