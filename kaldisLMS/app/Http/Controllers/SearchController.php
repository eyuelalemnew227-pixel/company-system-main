<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\SopDocument;
use App\Models\User;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if ($q === '' || strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $user = $request->user();
        $results = [];

        if ($user->hasPermission('course.view')) {
            $results['courses'] = Course::where('title', 'like', "%{$q}%")
                ->limit(5)->get(['id', 'title'])
                ->map(fn (Course $c) => ['id' => $c->id, 'label' => $c->title, 'url' => "/courses/{$c->id}"]);
        }

        if ($user->hasPermission('user.view')) {
            $results['users'] = User::where(fn ($w) => $w->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"))
                ->limit(5)->get(['id', 'name', 'email'])
                ->map(fn (User $u) => ['id' => $u->id, 'label' => "{$u->name} ({$u->email})", 'url' => '/users']);
        }

        if ($user->hasPermission('sop.view')) {
            $results['sop'] = SopDocument::where('title', 'like', "%{$q}%")
                ->limit(5)->get(['id', 'title'])
                ->map(fn (SopDocument $s) => ['id' => $s->id, 'label' => $s->title, 'url' => "/sop/{$s->id}"]);
        }

        if ($user->hasPermission('certificate.view')) {
            $results['certificates'] = Certificate::where('certificate_number', 'like', "%{$q}%")
                ->limit(5)->get(['id', 'certificate_number'])
                ->map(fn (Certificate $c) => ['id' => $c->id, 'label' => $c->certificate_number, 'url' => '/certificates']);
        }

        return response()->json(['results' => array_filter($results, fn ($group) => count($group) > 0)]);
    }
}
