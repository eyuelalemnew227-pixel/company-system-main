<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\FormInputType;
use App\Models\KpiRole;
use App\Models\Training\TdKpiQuestion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TdKpiQuestionController extends Controller
{
    public function index(Request $request): Response
    {
        $query = TdKpiQuestion::query()
            ->with(['role:id,name', 'inputType:id,name,type_identifier'])
            ->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('label', 'like', '%' . $search . '%')
                    ->orWhereHas('role', fn ($roleQuery) => $roleQuery->where('name', 'like', '%' . $search . '%'))
                    ->orWhereHas('inputType', fn ($typeQuery) => $typeQuery->where('name', 'like', '%' . $search . '%'));
            });
        }

        return Inertia::render('training/TdKpi/Questions/Index', [
            'questions' => $query->paginate(10)->withQueryString(),
            'request' => $request->only('search'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('training/TdKpi/Questions/Create', [
            'kpiRoles' => $this->kpiRoles(),
            'formInputTypes' => $this->formInputTypes(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateQuestion($request);

        DB::transaction(function () use ($validated) {
            $question = TdKpiQuestion::create([
                'label' => $validated['label'],
                'kpi_role_id' => $validated['kpi_role_id'],
                'form_input_type_id' => $validated['form_input_type_id'],
                'status' => $validated['status'],
            ]);

            $this->syncChoices($question, $validated['choices'] ?? []);
        });

        return Redirect::route('training.td-kpi.questions.index')
            ->with('flash.message', 'Question created successfully!');
    }

    public function edit(TdKpiQuestion $tdKpiQuestion): Response
    {
        $tdKpiQuestion->load(['role:id,name', 'inputType:id,name,type_identifier', 'choices']);

        return Inertia::render('training/TdKpi/Questions/Edit', [
            'question' => $tdKpiQuestion,
            'kpiRoles' => $this->kpiRoles(),
            'formInputTypes' => $this->formInputTypes(),
        ]);
    }

    public function update(Request $request, TdKpiQuestion $tdKpiQuestion): RedirectResponse
    {
        $validated = $this->validateQuestion($request);

        DB::transaction(function () use ($tdKpiQuestion, $validated) {
            $tdKpiQuestion->update([
                'label' => $validated['label'],
                'kpi_role_id' => $validated['kpi_role_id'],
                'form_input_type_id' => $validated['form_input_type_id'],
                'status' => $validated['status'],
            ]);

            $this->syncChoices($tdKpiQuestion, $validated['choices'] ?? []);
        });

        return Redirect::route('training.td-kpi.questions.index')
            ->with('flash.message', 'Question updated successfully!');
    }

    public function destroy(TdKpiQuestion $tdKpiQuestion): RedirectResponse
    {
        $tdKpiQuestion->delete();

        return Redirect::route('training.td-kpi.questions.index')
            ->with('flash.message', 'Question deleted successfully!');
    }

    private function validateQuestion(Request $request): array
    {
        $validated = $request->validate([
            'label' => ['required', 'string'],
            'kpi_role_id' => ['required', 'exists:kpi_roles,id'],
            'form_input_type_id' => ['required', 'exists:form_input_types,id'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'choices' => ['nullable', 'array'],
            'choices.*.label' => ['nullable', 'string', 'max:255'],
            'choices.*.value' => ['nullable', 'string', 'max:255'],
        ]);

        $inputType = FormInputType::find($validated['form_input_type_id']);
        $needsChoices = TdKpiQuestion::inputTypeNeedsChoices($inputType?->type_identifier);

        $choices = collect($validated['choices'] ?? [])
            ->map(function ($choice, $index) {
                return [
                    'label' => trim((string) ($choice['label'] ?? '')),
                    'value' => trim((string) ($choice['value'] ?? '')),
                    'order_index' => $index,
                ];
            })
            ->filter(fn ($choice) => $choice['label'] !== '' && $choice['value'] !== '')
            ->values()
            ->all();

        if ($needsChoices && count($choices) === 0) {
            throw ValidationException::withMessages([
                'choices' => 'At least one choice with label and value is required for this input type.',
            ]);
        }

        if (!$needsChoices) {
            $choices = [];
        }

        $validated['choices'] = $choices;

        return $validated;
    }

    private function syncChoices(TdKpiQuestion $question, array $choices): void
    {
        $question->choices()->delete();

        foreach ($choices as $choice) {
            $question->choices()->create($choice);
        }
    }

    private function kpiRoles()
    {
        return KpiRole::query()->orderBy('name')->get(['id', 'name']);
    }

    private function formInputTypes()
    {
        return FormInputType::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'type_identifier']);
    }
}
