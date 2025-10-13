<?php

namespace App\Http\Controllers;

use App\Models\Position;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PositionController extends Controller
{
    public function index()
    {
        $query = Position::query();

        if ($search = request('search')) {
            $query->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $positions = $query->paginate(5)->withQueryString()->through(function ($position) {
                return [
                    'id' => $position->id,
                    'title' => $position->title,
                    'level' => $position->level,
                    'description' => $position->description,
                    'created_at' => $position->created_at->format('d-m-Y'),
                ];
        });

        return Inertia::render('positions/Index', [
            'positions' => $positions,
            'request' => request()->only('search'),
        ]);
    }

    public function create()
    {
        return Inertia::render('positions/Create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'level' => 'required|in:Team,Manager,Director,General Manager,CEO',
            'description' => 'nullable|string',
        ]);

        Position::create($request->only([
            'title',
            'level',
            'description',
        ]));

        return to_route('positions.index')->with('message', 'Position Created Successfully!');
    }

    public function edit(Position $position)
    {
        return Inertia::render('positions/Edit', [
            'position' => $position,
        ]);
    }

    public function update(Request $request, Position $position)
    {
        $request->validate([
            'title' => 'required|string|max:100',
            'level' => 'required|in:Team,Manager,Director,General Manager,CEO',
            'description' => 'nullable|string',
        ]);

        $position->update($request->only([
            'title',
            'level',
            'description',
        ]));

        return to_route('positions.index')->with('message', 'Position Updated Successfully!');
    }

    public function destroy(Position $position)
    {
        $position->delete();
        return to_route('positions.index')->with('message', 'Position Deleted Successfully!');
    }
}