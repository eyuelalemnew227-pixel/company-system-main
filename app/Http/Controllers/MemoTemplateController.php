<?php

namespace App\Http\Controllers;

use App\Models\MemoTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class MemoTemplateController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        if ($user->can('memo.templates.manage')) {
            $templates = MemoTemplate::latest()->get();
        } else {
            $templates = MemoTemplate::where('user_id', $user->id)->latest()->get();
        }

        return Inertia::render('memos/templates/index', [
            'templates' => $templates,
            'isSuperAdmin' => $user->can('memo.templates.manage'),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'template_name' => 'required|string|max:200',
            'title' => 'nullable|string|max:255',
            'content' => 'required|string',
        ]);

        $user = Auth::user();
        $templateId = 'TPL-' . strtoupper(Str::random(8));

        MemoTemplate::create([
            'template_id' => $templateId,
            'user_id' => $user->id,
            'template_name' => $request->input('template_name'),
            'title' => $request->input('title'),
            'content' => $request->input('content'),
        ]);

        return back()->with('success', 'Memo template saved successfully.');
    }

    public function destroy(MemoTemplate $memoTemplate)
    {
        $user = Auth::user();
        if ($memoTemplate->user_id !== $user->id && !$user->can('memo.templates.manage')) {
            abort(403, 'Unauthorized action.');
        }

        $memoTemplate->delete();

        return back()->with('success', 'Memo template deleted successfully.');
    }
}
