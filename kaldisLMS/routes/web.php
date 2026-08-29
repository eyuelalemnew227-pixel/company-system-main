<?php

use App\Http\Controllers\BranchController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\LessonController;
use App\Http\Controllers\MyLearningController;
use App\Http\Controllers\AiQuizController;
use App\Http\Controllers\BadgeController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuestionBankController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SopController;
use App\Http\Controllers\TelegramWebhookController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route(auth()->check() ? 'dashboard' : 'login');
});

// No session/auth — Telegram calls this directly, verified via the secret path segment.
Route::post('/telegram/webhook/{secret}', [TelegramWebhookController::class, 'handle'])->name('telegram.webhook');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/question-bank', [QuestionBankController::class, 'index'])->name('question-bank.index');
    Route::post('/question-bank', [QuestionBankController::class, 'store'])->name('question-bank.store');
    Route::put('/question-bank/{questionBank}', [QuestionBankController::class, 'update'])->name('question-bank.update');
    Route::delete('/question-bank/{questionBank}', [QuestionBankController::class, 'destroy'])->name('question-bank.destroy');

    Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
    Route::get('/courses/create', [CourseController::class, 'create'])->name('courses.create');
    Route::post('/courses', [CourseController::class, 'store'])->name('courses.store');
    Route::get('/courses/{course}/edit', [CourseController::class, 'edit'])->name('courses.edit');
    Route::put('/courses/{course}', [CourseController::class, 'update'])->name('courses.update');
    Route::delete('/courses/{course}', [CourseController::class, 'destroy'])->name('courses.destroy');
    Route::post('/courses/{course}/enroll', [CourseController::class, 'enroll'])->name('courses.enroll');
    Route::get('/courses/{course}', [CourseController::class, 'show'])->name('courses.show');

    Route::get('/lessons/{lesson}', [LessonController::class, 'show'])->name('lessons.show');
    Route::post('/lessons/{lesson}/complete', [LessonController::class, 'complete'])->name('lessons.complete');

    Route::get('/my-learning', [MyLearningController::class, 'index'])->name('my-learning.index');

    Route::get('/quizzes', [QuizController::class, 'index'])->name('quizzes.index');
    Route::post('/quizzes', [QuizController::class, 'store'])->name('quizzes.store');
    Route::get('/quizzes/{quiz}/take', [QuizController::class, 'take'])->name('quizzes.take');
    Route::post('/quizzes/{quiz}/submit', [QuizController::class, 'submit'])->name('quizzes.submit');

    Route::get('/ai-quiz', [AiQuizController::class, 'index'])->name('ai-quiz.index');
    Route::post('/ai-quiz/generate', [AiQuizController::class, 'generate'])->name('ai-quiz.generate');

    Route::get('/certificates', [CertificateController::class, 'index'])->name('certificates.index');
    Route::post('/certificates/issue-pending', [CertificateController::class, 'issuePending'])->name('certificates.issue-pending');
    Route::post('/certificates/{certificate}/revoke', [CertificateController::class, 'revoke'])->name('certificates.revoke');
    Route::get('/certificates/verify', [CertificateController::class, 'verifyPage'])->name('certificates.verify-page');
    Route::get('/certificates/verify/lookup', [CertificateController::class, 'verify'])->name('certificates.verify');

    Route::get('/leaderboard', [LeaderboardController::class, 'index'])->name('leaderboard.index');

    Route::get('/badges', [BadgeController::class, 'index'])->name('badges.index');
    Route::post('/badges', [BadgeController::class, 'store'])->name('badges.store');

    Route::get('/sop', [SopController::class, 'index'])->name('sop.index');
    Route::post('/sop', [SopController::class, 'store'])->name('sop.store');
    Route::put('/sop/{sop}', [SopController::class, 'update'])->name('sop.update');
    Route::delete('/sop/{sop}', [SopController::class, 'destroy'])->name('sop.destroy');
    Route::post('/sop/{sop}/acknowledge', [SopController::class, 'acknowledge'])->name('sop.acknowledge');
    Route::get('/sop/{sop}', [SopController::class, 'show'])->name('sop.show');

    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::post('/calendar', [CalendarController::class, 'store'])->name('calendar.store');

    Route::get('/forums', [ForumController::class, 'index'])->name('forums.index');
    Route::post('/forums', [ForumController::class, 'store'])->name('forums.store');
    Route::get('/forums/thread/{thread}', [ForumController::class, 'showThread'])->name('forums.thread');
    Route::post('/forums/thread/{thread}', [ForumController::class, 'reply'])->name('forums.reply');
    Route::patch('/forums/thread/{thread}/posts/{post}/solution', [ForumController::class, 'markSolution'])->name('forums.mark-solution');
    Route::get('/forums/{forum}/threads', [ForumController::class, 'threads'])->name('forums.threads');
    Route::post('/forums/{forum}/threads', [ForumController::class, 'storeThread'])->name('forums.threads.store');

    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{targetUser}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{targetUser}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::post('/users/pending/{registration}/approve', [UserController::class, 'approveRegistration'])->name('users.pending.approve');
    Route::post('/users/pending/{registration}/reject', [UserController::class, 'rejectRegistration'])->name('users.pending.reject');

    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{role}/permissions', [RoleController::class, 'updatePermission'])->name('roles.permissions.update');

    Route::get('/branches', [BranchController::class, 'index'])->name('branches.index');
    Route::post('/branches', [BranchController::class, 'store'])->name('branches.store');
    Route::put('/branches/{branch}', [BranchController::class, 'update'])->name('branches.update');
    Route::post('/branches/{branch}/departments', [BranchController::class, 'storeDepartment'])->name('branches.departments.store');

    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/{type}/data', [ReportController::class, 'data'])
        ->whereIn('type', [
            'certificates', 'course-completion', 'employee-learning', 'login-audit',
            'quiz-performance', 'sop-compliance', 'trainer-activity',
        ])
        ->name('reports.data');

    Route::get('/settings', [SettingController::class, 'edit'])->name('settings.edit');
    Route::put('/settings', [SettingController::class, 'update'])->name('settings.update');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/profile/telegram-link', [ProfileController::class, 'linkTelegram'])->name('profile.telegram-link');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{recipient}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');

    Route::get('/search', [SearchController::class, 'index'])->name('search.index');
});

require __DIR__.'/auth.php';
