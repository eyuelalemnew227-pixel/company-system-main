<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Forum;
use App\Models\ForumPost;
use App\Models\ForumThread;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ForumController extends Controller
{
    public function index(Request $request): Response
    {
        $forums = Forum::with(['course:id,title,thumbnail'])
            ->withCount('threads')
            ->with(['threads' => fn ($q) => $q->latest()->limit(1)->with(['posts' => fn ($p) => $p->latest()->limit(1)])])
            ->oldest()
            ->get()
            ->map(function (Forum $f) {
                $lastThread = $f->threads->first();
                $lastPost = $lastThread?->posts->first();
                $lastActivity = $lastPost?->created_at ?? $lastThread?->created_at ?? $f->created_at;

                return [
                    'id' => $f->id, 'title' => $f->title, 'isLocked' => $f->is_locked,
                    'course' => $f->course, 'threadCount' => $f->threads_count, 'lastActivity' => $lastActivity,
                ];
            });

        return Inertia::render('Forums/Index', [
            'forums' => $forums,
            'canPost' => $request->user()->hasPermission('forum.post'),
            'courses' => Course::where('status', 'published')->orderBy('title')->get(['id', 'title']),
        ]);
    }

    public function store(Request $request)
    {
        Gate::authorize('permission', 'forum.post');
        $user = $request->user();
        abort_unless($user->employee, 403, 'Employee profile required to post.');

        $data = $request->validate([
            'course_id' => ['required', 'exists:courses,id'],
            'title' => ['required', 'string'],
            'body' => ['required', 'string'],
        ]);

        $course = Course::findOrFail($data['course_id']);
        $forum = Forum::firstOrCreate(['course_id' => $course->id], ['title' => "{$course->title} — Discussion"]);

        $thread = ForumThread::create(['forum_id' => $forum->id, 'user_id' => $user->id, 'title' => trim($data['title'])]);
        ForumPost::create(['thread_id' => $thread->id, 'user_id' => $user->id, 'body' => trim($data['body'])]);

        return redirect()->route('forums.thread', $thread)->with('success', 'Discussion started.');
    }

    public function threads(Request $request, Forum $forum): Response
    {
        $forum->load('course:id,title');
        $threads = ForumThread::where('forum_id', $forum->id)
            ->withCount('posts')
            ->with(['user:id,name', 'posts' => fn ($q) => $q->latest()->limit(1)->with('user:id,name')])
            ->orderByDesc('is_pinned')->orderByDesc('created_at')
            ->get()
            ->map(function (ForumThread $t) {
                $lastPost = $t->posts->first();

                return [
                    'id' => $t->id, 'title' => $t->title, 'isPinned' => $t->is_pinned, 'views' => $t->views,
                    'createdAt' => $t->created_at, 'authorName' => $t->user->name ?? 'Unknown', 'postCount' => $t->posts_count,
                    'lastPostAt' => $lastPost?->created_at ?? $t->created_at, 'lastPostAuthor' => $lastPost?->user->name ?? $t->user->name ?? 'Unknown',
                ];
            });

        return Inertia::render('Forums/Threads', [
            'forum' => ['id' => $forum->id, 'title' => $forum->title, 'isLocked' => $forum->is_locked, 'course' => $forum->course],
            'threads' => $threads,
            'canPost' => $request->user()->hasPermission('forum.post'),
        ]);
    }

    public function storeThread(Request $request, Forum $forum)
    {
        Gate::authorize('permission', 'forum.post');
        $user = $request->user();
        abort_unless($user->employee, 403, 'Employee profile required to post.');
        abort_if($forum->is_locked, 403, 'Forum is locked.');

        $data = $request->validate(['title' => ['required', 'string'], 'body' => ['required', 'string']]);

        $thread = ForumThread::create(['forum_id' => $forum->id, 'user_id' => $user->id, 'title' => trim($data['title'])]);
        ForumPost::create(['thread_id' => $thread->id, 'user_id' => $user->id, 'body' => trim($data['body'])]);

        return redirect()->route('forums.thread', $thread)->with('success', 'Thread created.');
    }

    public function showThread(Request $request, ForumThread $thread): Response
    {
        $thread->load(['forum.course:id,title', 'user:id,name']);
        $thread->increment('views');

        $posts = ForumPost::where('thread_id', $thread->id)->with('user:id,name')->orderBy('created_at')->get()
            ->map(fn (ForumPost $p) => [
                'id' => $p->id, 'body' => $p->body, 'parentId' => $p->parent_id, 'isSolution' => $p->is_solution,
                'createdAt' => $p->created_at, 'authorName' => $p->user->name ?? 'Unknown', 'userId' => $p->user_id,
            ]);

        $user = $request->user();

        return Inertia::render('Forums/Show', [
            'thread' => [
                'id' => $thread->id, 'title' => $thread->title, 'isPinned' => $thread->is_pinned, 'views' => $thread->views,
                'createdAt' => $thread->created_at, 'authorName' => $thread->user->name ?? 'Unknown', 'userId' => $thread->user_id,
                'forum' => ['id' => $thread->forum->id, 'title' => $thread->forum->title, 'isLocked' => $thread->forum->is_locked, 'course' => $thread->forum->course],
                'posts' => $posts,
            ],
            'canPost' => $user->hasPermission('forum.post'),
            'canMarkSolution' => $user->hasPermission('forum.post') && $user->role_slug !== 'employee',
        ]);
    }

    public function reply(Request $request, ForumThread $thread)
    {
        Gate::authorize('permission', 'forum.post');
        $user = $request->user();
        abort_unless($user->employee, 403, 'Employee profile required to post.');
        abort_if($thread->forum->is_locked, 403, 'Forum is locked.');

        $data = $request->validate([
            'body' => ['required', 'string'],
            'parent_id' => ['nullable', 'exists:forum_posts,id'],
        ]);

        if (! empty($data['parent_id'])) {
            $parentExists = ForumPost::where('id', $data['parent_id'])->where('thread_id', $thread->id)->exists();
            abort_unless($parentExists, 400, 'Invalid parent post.');
        }

        ForumPost::create([
            'thread_id' => $thread->id, 'user_id' => $user->id,
            'body' => trim($data['body']), 'parent_id' => $data['parent_id'] ?? null,
        ]);

        return back()->with('success', 'Reply posted.');
    }

    public function markSolution(Request $request, ForumThread $thread, ForumPost $post)
    {
        Gate::authorize('permission', 'forum.post');
        abort_unless($post->thread_id === $thread->id, 404);

        $data = $request->validate(['is_solution' => ['required', 'boolean']]);

        if ($data['is_solution']) {
            ForumPost::where('thread_id', $thread->id)->where('is_solution', true)->update(['is_solution' => false]);
        }
        $post->update(['is_solution' => $data['is_solution']]);

        return back()->with('success', $data['is_solution'] ? 'Marked as solution.' : 'Solution removed.');
    }
}
