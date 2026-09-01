<?php

namespace App\Http\Controllers;

use App\Models\Form;
use App\Models\FormVersion;
use App\Models\FormSection;
use App\Models\FormQuestion;
use App\Models\FormChoice;
use App\Models\FormInputType;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class FormController extends Controller
{
    /**
     * Display a listing of the resource for admins.
     */
    public function index()
    {
        $user = auth()->user();

        $forms = Form::with([
            'user_permissions' => function ($q) use ($user) {
                $q->where('user_id', $user->id);
            }
        ])->where(function ($query) use ($user) {
            $query->where('created_by', $user->id)
                ->orWhereHas('user_permissions', function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->where(function ($q2) {
                            $q2->where('can_edit_schema', true)
                                ->orWhere('can_delete_submissions', true)
                                ->orWhere('can_manage_access', true);
                        });
                });
        })->latest()->get();

        $forms->transform(function ($form) use ($user) {
            if ($form->created_by === $user->id) {
                $form->can_manage_access = true;
                $form->can_edit_schema = true;
            } else {
                $perm = $form->user_permissions->first();
                $form->can_manage_access = $perm ? $perm->can_manage_access : false;
                $form->can_edit_schema = $perm ? $perm->can_edit_schema : false;
            }
            return $form;
        });

        return Inertia::render('Forms/Index', ['forms' => $forms]);
    }

    /**
     * Display forms available for end-users to fill out.
     */
    public function available()
    {
        $user = auth()->user();
        $forms = Form::where(function ($query) use ($user) {
            $query->where('status', 'active')
                ->whereHas('user_permissions', function ($q) use ($user) {
                    $q->where('user_id', $user->id)->where('can_fill_submissions', true);
                });
        })
            ->orWhere('created_by', $user->id)
            ->latest()
            ->get();

        return Inertia::render('Forms/Available', ['forms' => $forms]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $inputTypes = FormInputType::where('is_active', true)->get();
        $branches = \App\Models\Branch::select('id', 'name')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();

        return Inertia::render('Forms/Create', [
            'inputTypes' => $inputTypes,
            'branches' => $branches,
            'departments' => $departments
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:draft,active,archived',
            'sections' => 'nullable|array',
            'sections.*.title' => 'required|string|max:255',
            'sections.*.questions' => 'nullable|array',
            'sections.*.questions.*.label' => 'required|string',
            'sections.*.questions.*.form_input_type_id' => 'required|exists:form_input_types,id',
            'sections.*.questions.*.is_required' => 'boolean',
            'sections.*.questions.*.choices' => 'nullable|array',
            'sections.*.questions.*.choices.*.label' => 'required_with:sections.*.questions.*.choices|string',
            'sections.*.questions.*.choices.*.value' => 'nullable|string',
            'sections.*.questions.*._id' => 'nullable|string',
            'sections.*.questions.*.visibility_logic' => 'nullable|array',
        ]);

        DB::transaction(function () use ($validated) {
            $form = Form::create([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            $version = FormVersion::create([
                'form_id' => $form->id,
                'version_number' => 1,
                'status' => 'draft',
            ]);

            if (!empty($validated['sections'])) {
                foreach ($validated['sections'] as $sIndex => $sectionData) {
                    $section = FormSection::create([
                        'form_version_id' => $version->id,
                        'title' => $sectionData['title'],
                        'order_index' => $sIndex,
                    ]);

                    if (!empty($sectionData['questions'])) {
                        foreach ($sectionData['questions'] as $qIndex => $questionData) {
                            $question = FormQuestion::create([
                                'form_section_id' => $section->id,
                                'form_input_type_id' => $questionData['form_input_type_id'],
                                'label' => $questionData['label'],
                                'is_required' => $questionData['is_required'] ?? false,
                                'order_index' => $qIndex,
                                'local_id' => $questionData['_id'] ?? \Illuminate\Support\Str::random(7),
                                'visibility_logic' => !empty($questionData['visibility_logic']) ? $questionData['visibility_logic'] : null,
                            ]);

                            if (!empty($questionData['choices'])) {
                                foreach ($questionData['choices'] as $cIndex => $choiceData) {
                                    FormChoice::create([
                                        'form_question_id' => $question->id,
                                        'label' => $choiceData['label'],
                                        'value' => $choiceData['value'] ?? strtolower($choiceData['label']),
                                        'order_index' => $cIndex,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
        });

        return redirect()->route('forms.index')->with('success', 'Form created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $form = Form::findOrFail($id);

        $user = auth()->user();
        if ($form->created_by !== $user->id) {
            $hasAccess = $form->user_permissions()->where('user_id', $user->id)->where('can_edit_schema', true)->exists();
            if (!$hasAccess) {
                abort(403, 'You must be granted explicit form-level access to edit this specific forms schema.');
            }
        }

        $version = $form->versions()->latest()->with([
            'sections' => function ($q) {
                $q->orderBy('order_index')->with([
                    'questions' => function ($q2) {
                        $q2->orderBy('order_index')->with([
                            'choices' => function ($q3) {
                                $q3->orderBy('order_index');
                            }
                        ]);
                    }
                ]);
            }
        ])->first();

        $inputTypes = FormInputType::where('is_active', true)->get();
        $branches = \App\Models\Branch::select('id', 'name')->get();
        $departments = \App\Models\Department::select('id', 'name')->get();

        return Inertia::render('Forms/Edit', [
            'form' => $form,
            'formVersion' => $version,
            'inputTypes' => $inputTypes,
            'branches' => $branches,
            'departments' => $departments
        ]);
    }

    public function versions(string $id)
    {
        $form = Form::findOrFail($id);
        $user = auth()->user();

        if ($form->created_by !== $user->id) {
            $hasAccess = $form->user_permissions()->where('user_id', $user->id)->where('can_edit_schema', true)->exists();
            if (!$hasAccess) {
                abort(403, 'You must be granted explicit form-level access to view versions for this form.');
            }
        }
        $allVersions = $form->versions()->latest()->get(['id', 'version_number', 'status', 'created_at']);

        return Inertia::render('Forms/Versions/Index', [
            'form' => $form,
            'allVersions' => $allVersions,
            'currentVersionId' => $form->versions()->latest()->value('id')
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $form = Form::findOrFail($id);
        $user = auth()->user();

        if ($form->created_by !== $user->id) {
            $hasAccess = $form->user_permissions()->where('user_id', $user->id)->where('can_edit_schema', true)->exists();
            if (!$hasAccess) {
                abort(403, 'You must be granted explicit form-level access to update this specific form.');
            }
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:draft,active,archived',
            'sections' => 'nullable|array',
            'sections.*.title' => 'required|string|max:255',
            'sections.*.questions' => 'nullable|array',
            'sections.*.questions.*.label' => 'required|string',
            'sections.*.questions.*.form_input_type_id' => 'required|exists:form_input_types,id',
            'sections.*.questions.*.is_required' => 'boolean',
            'sections.*.questions.*.choices' => 'nullable|array',
            'sections.*.questions.*.choices.*.label' => 'required_with:sections.*.questions.*.choices|string',
            'sections.*.questions.*.choices.*.value' => 'nullable|string',
            'sections.*.questions.*._id' => 'nullable|string',
            'sections.*.questions.*.visibility_logic' => 'nullable|array',
            'sections.*.questions.*.default_value' => 'nullable|string',
        ]);

        DB::transaction(function () use ($form, $validated) {
            $form->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'],
            ]);

            // Always create a new version to preserve historical data integrity
            $latestVersionNumber = $form->versions()->max('version_number') ?? 0;

            $version = FormVersion::create([
                'form_id' => $form->id,
                'version_number' => $latestVersionNumber + 1,
                'status' => 'draft',
            ]);

            if (!empty($validated['sections'])) {
                foreach ($validated['sections'] as $sIndex => $sectionData) {
                    $section = FormSection::create([
                        'form_version_id' => $version->id,
                        'title' => $sectionData['title'],
                        'order_index' => $sIndex,
                    ]);

                    if (!empty($sectionData['questions'])) {
                        foreach ($sectionData['questions'] as $qIndex => $questionData) {
                            $question = FormQuestion::create([
                                'form_section_id' => $section->id,
                                'form_input_type_id' => $questionData['form_input_type_id'],
                                'label' => $questionData['label'],
                                'is_required' => $questionData['is_required'] ?? false,
                                'order_index' => $qIndex,
                                'local_id' => $questionData['_id'] ?? \Illuminate\Support\Str::random(7),
                                'visibility_logic' => !empty($questionData['visibility_logic']) ? $questionData['visibility_logic'] : null,
                                'default_value' => $questionData['default_value'] ?? null,
                            ]);

                            if (!empty($questionData['choices'])) {
                                foreach ($questionData['choices'] as $cIndex => $choiceData) {
                                    FormChoice::create([
                                        'form_question_id' => $question->id,
                                        'label' => $choiceData['label'],
                                        'value' => $choiceData['value'] ?? strtolower($choiceData['label']),
                                        'order_index' => $cIndex,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
        });

        return redirect()->route('forms.index')->with('success', 'Form updated successfully. A new version was created.');
    }

    public function export(string $id)
    {
        $form = Form::findOrFail($id);

        $query = $form->versions();
        $targetVersionId = request()->query('version_id');

        if ($targetVersionId) {
            $query->where('id', $targetVersionId);
        } else {
            $query->latest();
        }

        $version = $query->with([
            'sections' => function ($q) {
                $q->orderBy('order_index')->with([
                    'questions' => function ($q2) {
                        $q2->orderBy('order_index')->with([
                            'choices' => function ($q3) {
                                $q3->orderBy('order_index');
                            }
                        ]);
                    }
                ]);
            }
        ])->first();

        if (!$version) {
            abort(404, 'No active version to export.');
        }

        $data = [
            'meta' => [
                'kaldis_schema_version' => '1.0',
                'type' => 'form_template',
                'exported_at' => now()->toIso8601String(),
            ],
            'form' => [
                'title' => $form->title,
                'description' => $form->description,
                'status' => $form->status,
                'version_number' => $version->version_number,
                'sections' => $version->sections->map(function ($section) {
                    return [
                        'title' => $section->title,
                        'order_index' => $section->order_index,
                        'questions' => $section->questions->map(function ($question) {
                            return [
                                '_id' => $question->local_id,
                                'label' => $question->label,
                                'form_input_type_id' => $question->form_input_type_id,
                                'is_required' => $question->is_required,
                                'order_index' => $question->order_index,
                                'visibility_logic' => $question->visibility_logic,
                                'choices' => $question->choices->map(function ($choice) {
                                    return [
                                        'label' => $choice->label,
                                        'value' => $choice->value,
                                        'order_index' => $choice->order_index,
                                    ];
                                })->toArray(),
                            ];
                        })->toArray(),
                    ];
                })->toArray(),
            ]
        ];

        $filename = \Illuminate\Support\Str::slug($form->title) . '_v' . $version->version_number . '_schema.json';
        return response()->streamDownload(function () use ($data) {
            echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        }, $filename, ['Content-Type' => 'application/json']);
    }

    public function import(Request $request)
    {
        $request->validate([
            'schema' => 'required|file|max:2048', // JSON or TXT payload check 
        ]);

        $fileContent = file_get_contents($request->file('schema')->getRealPath());
        $data = json_decode($fileContent, true);

        if (!$data || !isset($data['meta']['kaldis_schema_version']) || !isset($data['form'])) {
            return back()->withErrors(['schema' => 'Invalid or corrupted Form Schema JSON file.']);
        }

        $formData = $data['form'];

        DB::transaction(function () use ($formData) {
            $form = Form::create([
                'title' => $formData['title'] . ' (Imported)',
                'description' => $formData['description'] ?? null,
                'status' => 'draft', // Force draft to prevent accidental deployment
                'created_by' => auth()->id(),
            ]);

            $version = FormVersion::create([
                'form_id' => $form->id,
                'version_number' => 1,
                'status' => 'draft',
            ]);



            if (!empty($formData['sections'])) {
                foreach ($formData['sections'] as $sIndex => $sectionData) {
                    $section = FormSection::create([
                        'form_version_id' => $version->id,
                        'title' => $sectionData['title'],
                        'order_index' => $sectionData['order_index'] ?? $sIndex,
                    ]);

                    if (!empty($sectionData['questions'])) {
                        foreach ($sectionData['questions'] as $qIndex => $questionData) {
                            $question = FormQuestion::create([
                                'form_section_id' => $section->id,
                                'form_input_type_id' => $questionData['form_input_type_id'],
                                'label' => $questionData['label'],
                                'is_required' => $questionData['is_required'] ?? false,
                                'order_index' => $questionData['order_index'] ?? $qIndex,
                                'local_id' => $questionData['_id'] ?? \Illuminate\Support\Str::random(7),
                                'visibility_logic' => !empty($questionData['visibility_logic']) ? $questionData['visibility_logic'] : null,
                            ]);

                            if (!empty($questionData['choices'])) {
                                foreach ($questionData['choices'] as $cIndex => $choiceData) {
                                    FormChoice::create([
                                        'form_question_id' => $question->id,
                                        'label' => $choiceData['label'],
                                        'value' => $choiceData['value'] ?? strtolower($choiceData['label']),
                                        'order_index' => $choiceData['order_index'] ?? $cIndex,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
        });

        return redirect()->route('forms.index')->with('success', 'Form Schema imported and fabricated successfully!');
    }

    public function importVersion(Request $request, string $id)
    {
        $request->validate([
            'schema' => 'required|file|max:2048', // JSON payload
        ]);

        $form = Form::findOrFail($id);
        $fileContent = file_get_contents($request->file('schema')->getRealPath());
        $data = json_decode($fileContent, true);

        if (!$data || !isset($data['meta']['kaldis_schema_version']) || !isset($data['form'])) {
            return back()->withErrors(['schema' => 'Invalid or corrupted Form Schema JSON file.']);
        }

        $formData = $data['form'];

        DB::transaction(function () use ($form, $formData) {
            $form->update([
                'title' => $formData['title'],
                'description' => $formData['description'] ?? null,
                'status' => 'draft',
            ]);

            $latestVersionNumber = $form->versions()->max('version_number') ?? 0;

            $version = FormVersion::create([
                'form_id' => $form->id,
                'version_number' => $latestVersionNumber + 1,
                'status' => 'draft',
            ]);

            if (!empty($formData['sections'])) {
                foreach ($formData['sections'] as $sIndex => $sectionData) {
                    $section = FormSection::create([
                        'form_version_id' => $version->id,
                        'title' => $sectionData['title'],
                        'order_index' => $sectionData['order_index'] ?? $sIndex,
                    ]);

                    if (!empty($sectionData['questions'])) {
                        foreach ($sectionData['questions'] as $qIndex => $questionData) {
                            $question = FormQuestion::create([
                                'form_section_id' => $section->id,
                                'form_input_type_id' => $questionData['form_input_type_id'],
                                'label' => $questionData['label'],
                                'is_required' => $questionData['is_required'] ?? false,
                                'order_index' => $questionData['order_index'] ?? $qIndex,
                                'local_id' => $questionData['_id'] ?? \Illuminate\Support\Str::random(7),
                                'visibility_logic' => !empty($questionData['visibility_logic']) ? $questionData['visibility_logic'] : null,
                            ]);

                            if (!empty($questionData['choices'])) {
                                foreach ($questionData['choices'] as $cIndex => $choiceData) {
                                    FormChoice::create([
                                        'form_question_id' => $question->id,
                                        'label' => $choiceData['label'],
                                        'value' => $choiceData['value'] ?? strtolower($choiceData['label']),
                                        'order_index' => $choiceData['order_index'] ?? $cIndex,
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
        });

        return redirect()->route('forms.index')->with('success', 'Form successfully overwritten with a new structured version!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $form = \App\Models\Form::findOrFail($id);
        $form->delete();

        return redirect()->route('forms.index')->with('success', 'Form and all associated historical data permanently wiped.');
    }
}
