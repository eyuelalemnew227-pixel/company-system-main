<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\TrainingType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TrainingTypeController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TrainingType::query()->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where('name', 'like', '%' . $search . '%');
        }

        return Inertia::render('training/TdKpi/TrainingTypes/Index', [
            'trainingTypes' => $query->paginate(15)->withQueryString(),
            'request' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('training/TdKpi/TrainingTypes/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateTrainingType($request);

        TrainingType::create($validated);

        return Redirect::route('training.td-kpi.training-types.index')
            ->with('message', 'Training type created successfully!');
    }

    public function edit(TrainingType $trainingType): Response
    {
        return Inertia::render('training/TdKpi/TrainingTypes/Edit', [
            'trainingType' => $trainingType,
        ]);
    }

    public function update(Request $request, TrainingType $trainingType): RedirectResponse
    {
        $validated = $this->validateTrainingType($request, $trainingType);

        $trainingType->update($validated);

        return Redirect::route('training.td-kpi.training-types.index')
            ->with('message', 'Training type updated successfully!');
    }

    public function destroy(TrainingType $trainingType): RedirectResponse
    {
        $trainingType->delete();

        return Redirect::route('training.td-kpi.training-types.index')
            ->with('message', 'Training type deleted successfully!');
    }

    private function validateTrainingType(Request $request, ?TrainingType $trainingType = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('training_types', 'name')->ignore($trainingType?->id),
            ],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }
}
