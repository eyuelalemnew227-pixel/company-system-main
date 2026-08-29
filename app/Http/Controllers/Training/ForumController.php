<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\Course;
use App\Models\Training\Forum;
use App\Models\Training\ForumPost;
use App\Models\Training\ForumThread;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ForumController extends Controller
{
    public function index(): Response
    {
        $forums = Forum::with(['course', 'threads' => function ($q) {
            $q->latest()->take(5);
        }])->get();

        $coursesWithoutForum = Course::doesntHave('forum')->get();

        return Inertia::render('training/forums/index', [
            'forums' => $forums,
            'coursesWithoutForum' => $coursesWithoutForum,
        ]);
    }

    public function storeForum(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:training_courses,id|unique:training_forums,course_id',
            'title' => 'required|string|max:255',
        ]);

        Forum::create($validated);

        return back()->with('success', 'Forum created for course successfully.');
    }

    public function showThread(ForumThread $thread): Response
    {
        $thread->increment('views');
        $thread->load(['forum.course', 'author', 'posts.author', 'posts.replies.author']);

        return Inertia::render('training/forums/thread', [
            'thread' => $thread,
        ]);
    }

    public function storeThread(Forum $forum, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $thread = $forum->threads()->create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
        ]);

        $thread->posts()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        return back()->with('success', 'Discussion thread created.');
    }

    public function reply(ForumThread $thread, Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'body' => 'required|string',
            'parent_id' => 'nullable|exists:training_forum_posts,id',
        ]);

        $thread->posts()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        return back()->with('success', 'Reply posted.');
    }

    public function markSolution(ForumThread $thread, ForumPost $post): RedirectResponse
    {
        $thread->posts()->update(['is_solution' => false]);
        $post->update(['is_solution' => true]);

        return back()->with('success', 'Post marked as solution.');
    }
}
