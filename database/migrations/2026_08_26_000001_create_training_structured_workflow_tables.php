<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('trainer_evaluations');
        Schema::dropIfExists('training_schedule_items');
        Schema::dropIfExists('training_schedules');
        Schema::dropIfExists('training_agendas');

        // 1. Structured Training Agendas (Image 1 Format)
        Schema::create('training_agendas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->onDelete('cascade');
            $table->foreignId('submitted_by_user_id')->constrained('users')->onDelete('cascade');
            $table->string('title'); // የስልጠናው ርዕስ
            $table->date('proposed_date'); // ቀን
            $table->integer('allocated_minutes')->default(35); // የሚወስደው ሰዓት (በደቂቃ)
            $table->text('description')->nullable(); // የስልጠናው አጭር መግለጫ
            $table->json('objectives')->nullable(); // የስልጠናው ዓላማ (array of strings)
            $table->json('content_outline')->nullable(); // የስልጠናው ይዘት (array of strings)
            $table->json('target_trainees')->nullable(); // የስልጠናው ተሳታፊዎች (roles array)
            $table->string('delivery_method')->default('In-Person'); // ስልጠናው የሚሰጥበት መንገድ
            $table->json('required_resources')->nullable(); // ለስልጠናው የሚያስፈልጉ ግብአቶች [{item, specification, quantity, ratio}]
            $table->enum('status', ['submitted', 'reviewed', 'scheduled', 'approved', 'completed', 'rejected'])->default('submitted');
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        // 2. Master Training Schedules (Image 2 Format Header)
        Schema::create('training_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('title'); // e.g. የሰኔ ወር የስራ አስኪያጆች እና የዲፓርትመንት ሀላፊዎች የስልጠና መርሃግብር
            $table->date('schedule_date');
            $table->string('venue')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['draft', 'pending_approval', 'published', 'completed'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. Training Schedule Items (Image 2 Format Grid Rows)
        Schema::create('training_schedule_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_schedule_id')->constrained('training_schedules')->onDelete('cascade');
            $table->foreignId('training_agenda_id')->nullable()->constrained('training_agendas')->onDelete('set null');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->string('topic_title'); // የስልጠና ርዕስ (አጀንዳ)
            $table->integer('order_no')->default(1);
            $table->integer('allocated_minutes')->default(30); // የተፈቀደ ሰዓት (በደቂቃ)
            $table->string('start_time')->nullable(); // የጊዜ ሰሌዳ start e.g. 03:00
            $table->string('end_time')->nullable(); // የጊዜ ሰሌዳ end e.g. 03:40
            $table->boolean('is_break')->default(false); // e.g. Tea break
            $table->boolean('department_approved')->default(false);
            $table->timestamp('department_approved_at')->nullable();
            $table->foreignId('department_approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // 4. Branch Manager Trainer Evaluation Feedback (Image 3 Format)
        Schema::create('trainer_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_schedule_item_id')->constrained('training_schedule_items')->onDelete('cascade');
            $table->foreignId('evaluator_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('evaluator_branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->foreignId('trainer_department_id')->constrained('departments')->onDelete('cascade');
            $table->integer('content_clarity_rating')->default(5); // 1-5
            $table->integer('preparation_rating')->default(5); // 1-5
            $table->integer('time_management_rating')->default(5); // 1-5
            $table->integer('applicability_rating')->default(5); // 1-5
            $table->decimal('overall_rating', 3, 1)->default(5.0);
            $table->text('strengths')->nullable();
            $table->text('areas_for_improvement')->nullable();
            $table->text('feedback_notes')->nullable();
            $table->boolean('attendance_confirmed')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trainer_evaluations');
        Schema::dropIfExists('training_schedule_items');
        Schema::dropIfExists('training_schedules');
        Schema::dropIfExists('training_agendas');
    }
};
