<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\Training\RecurringTrainingModule;
use App\Models\Training\TdKpiAssessment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TdKpiAssessmentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TdKpiAssessment::query()
            ->with('trainingModule:id,training_name')
            ->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('assessment_name', 'like', '%' . $search . '%')
                    ->orWhereHas('trainingModule', fn ($m) => $m->where('training_name', 'like', '%' . $search . '%'));
            });
        }

        return Inertia::render('training/TdKpi/Assessments/Index', [
            'assessments' => $query->paginate(15)->withQueryString()->through(fn (TdKpiAssessment $assessment) => [
                'id' => $assessment->id,
                'assessment_name' => $assessment->assessment_name,
                'training_module' => $assessment->trainingModule?->training_name,
                'randomization_questions_number' => $assessment->randomization_questions_number,
                'status' => $assessment->status,
            ]),
            'request' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('training/TdKpi/Assessments/Create', [
            'trainingModules' => $this->trainingModules(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateAssessment($request);

        TdKpiAssessment::create($validated);

        return Redirect::route('training.td-kpi.assessments.index')
            ->with('message', 'Assessment created successfully!');
    }

    public function edit(TdKpiAssessment $assessment): Response
    {
        return Inertia::render('training/TdKpi/Assessments/Edit', [
            'assessment' => [
                'id' => $assessment->id,
                'assessment_name' => $assessment->assessment_name,
                'training_module_id' => $assessment->training_module_id,
                'randomization_questions_number' => $assessment->randomization_questions_number,
                'status' => $assessment->status,
            ],
            'trainingModules' => $this->trainingModules(),
        ]);
    }

    public function update(Request $request, TdKpiAssessment $assessment): RedirectResponse
    {
        $validated = $this->validateAssessment($request);

        $assessment->update($validated);

        return Redirect::route('training.td-kpi.assessments.index')
            ->with('message', 'Assessment updated successfully!');
    }

    public function destroy(TdKpiAssessment $assessment): RedirectResponse
    {
        $assessment->delete();

        return Redirect::route('training.td-kpi.assessments.index')
            ->with('message', 'Assessment deleted successfully!');
    }

    private function validateAssessment(Request $request): array
    {
        return $request->validate([
            'assessment_name' => ['required', 'string', 'max:255'],
            'training_module_id' => ['required', 'exists:recurring_training_modules,id'],
            'randomization_questions_number' => ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);
    }

    private function trainingModules()
    {
        return RecurringTrainingModule::query()
            ->orderBy('training_name')
            ->get(['id', 'training_name'])
            ->map(fn (RecurringTrainingModule $module) => [
                'id' => $module->id,
                'name' => $module->training_name,
            ]);
    }
}
