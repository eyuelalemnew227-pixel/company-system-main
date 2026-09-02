import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, GripVertical, Settings, Waypoints, Star, SlidersHorizontal } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { SearchableSelect } from '@/components/ui/searchable-select';
import React from 'react';

// Generates a quick stable ID for lists
const generateId = () => Math.random().toString(36).substring(2, 9);

export default function Edit({ form, formVersion, inputTypes, branches, departments }: { form: any, formVersion: any, inputTypes: any[], branches: any[], departments: any[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Form Builder', href: '/forms' },
        { title: 'All Forms', href: '/forms' },
        { title: `Edit: ${form.title}`, href: `/forms/${form.id}/edit` },
    ];

    const initialSections = (formVersion?.sections || [{ title: 'Section 1', questions: [] }]).map((sec: any) => ({
        ...sec,
        _id: sec.id?.toString() || generateId(),
        questions: (sec.questions || []).map((q: any) => ({
            ...q,
            _id: q.local_id || q.id?.toString() || generateId(),
            choices: (q.choices || []).map((c: any) => ({
                ...c,
                _id: c.local_id || c.id?.toString() || generateId()
            }))
        }))
    }));

    const { data, setData, put, processing, errors, transform } = useForm({
        title: form.title,
        description: form.description || '',
        status: form.status,
        sections: initialSections
    });

    const getAvailableLogicTargets = (currentSIndex: number, currentQIndex: number) => {
        const targets: any[] = [];
        data.sections.forEach((s: any, sIdx: number) => {
            if (sIdx > currentSIndex) return;
            s.questions.forEach((q: any, qIdx: number) => {
                if (sIdx === currentSIndex && qIdx >= currentQIndex) return;
                const isSelectType = inputTypes.find(t => t.id == q.form_input_type_id)?.type_identifier.includes('select');
                if (isSelectType && q.choices && q.choices.length > 0) {
                    targets.push(q);
                }
            });
        });
        return targets;
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination, type } = result;
        if (!destination) return;

        if (type === 'section') {
            const newSections = Array.from(data.sections);
            const [reordered] = newSections.splice(source.index, 1);
            newSections.splice(destination.index, 0, reordered);
            setData('sections', newSections);
            return;
        }

        if (type === 'question') {
            const sourceSIdx = parseInt(source.droppableId.split('-')[1]);
            const destSIdx = parseInt(destination.droppableId.split('-')[1]);

            const newSections = Array.from(data.sections);
            const sourceQuestions = Array.from(newSections[sourceSIdx].questions);
            const destQuestions = sourceSIdx === destSIdx ? sourceQuestions : Array.from(newSections[destSIdx].questions);

            const [reordered] = sourceQuestions.splice(source.index, 1);
            destQuestions.splice(destination.index, 0, reordered);

            newSections[sourceSIdx].questions = sourceQuestions;
            if (sourceSIdx !== destSIdx) {
                newSections[destSIdx].questions = destQuestions;
            }

            setData('sections', newSections);
            return;
        }
    };

    const addSection = () => {
        setData('sections', [...data.sections, { _id: generateId(), title: `Section ${data.sections.length + 1}`, questions: [] }]);
    };

    const removeSection = (sIndex: number) => {
        if (data.sections.length === 1) return;
        const newSections = [...data.sections];
        newSections.splice(sIndex, 1);
        setData('sections', newSections);
    };

    const updateSection = (sIndex: number, field: string, value: any) => {
        const newSections = [...data.sections];
        newSections[sIndex] = { ...newSections[sIndex], [field]: value };
        setData('sections', newSections);
    };

    const addQuestion = (sIndex: number) => {
        const newSections = [...data.sections];
        newSections[sIndex].questions.push({
            _id: generateId(),
            label: '',
            form_input_type_id: inputTypes[0]?.id || '',
            is_required: false,
            choices: []
        });
        setData('sections', newSections);
    };

    const removeQuestion = (sIndex: number, qIndex: number) => {
        const newSections = [...data.sections];
        newSections[sIndex].questions.splice(qIndex, 1);
        setData('sections', newSections);
    };

    const updateQuestion = (sIndex: number, qIndex: number, field: string, value: any) => {
        const newSections = [...data.sections];
        newSections[sIndex].questions[qIndex] = { ...newSections[sIndex].questions[qIndex], [field]: value };

        const isSelectType = inputTypes.find(t => t.id == value)?.type_identifier.includes('select');
        if (field === 'form_input_type_id' && isSelectType && (!newSections[sIndex].questions[qIndex].choices || newSections[sIndex].questions[qIndex].choices.length === 0)) {
            newSections[sIndex].questions[qIndex].choices = [{ _id: generateId(), label: 'Option 1', value: 'option_1' }];
        } else if (field === 'form_input_type_id' && !isSelectType) {
            newSections[sIndex].questions[qIndex].choices = [];
        }

        setData('sections', newSections);
    };

    const addChoice = (sIndex: number, qIndex: number) => {
        const newSections = [...data.sections];
        if (!newSections[sIndex].questions[qIndex].choices) {
            newSections[sIndex].questions[qIndex].choices = [];
        }
        newSections[sIndex].questions[qIndex].choices.push({
            _id: generateId(),
            label: `Option ${newSections[sIndex].questions[qIndex].choices.length + 1}`,
            value: `option_${newSections[sIndex].questions[qIndex].choices.length + 1}`
        });
        setData('sections', newSections);
    };

    const removeChoice = (sIndex: number, qIndex: number, cIndex: number) => {
        const newSections = [...data.sections];
        newSections[sIndex].questions[qIndex].choices.splice(cIndex, 1);
        setData('sections', newSections);
    };

    const updateChoice = (sIndex: number, qIndex: number, cIndex: number, field: string, value: any) => {
        const newSections = [...data.sections];
        newSections[sIndex].questions[qIndex].choices[cIndex] = { ...newSections[sIndex].questions[qIndex].choices[cIndex], [field]: value };
        setData('sections', newSections);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        // Strip _id to keep payload clean for backend
        const cleanPayload = {
            ...data,
            sections: data.sections.map((s: any, sIdx: number) => ({
                title: s.title,
                order_index: sIdx, // Reassert index based on drag order
                questions: s.questions.map((q: any, qIdx: number) => ({
                    _id: q._id,
                    label: q.label,
                    form_input_type_id: q.form_input_type_id,
                    is_required: q.is_required,
                    order_index: qIdx, // Reassert index based on drag order
                    visibility_logic: q.visibility_logic || null,
                    choices: q.choices?.map((c: any, cIdx: number) => ({
                        label: c.label,
                        value: c.value,
                        order_index: cIdx
                    }))
                }))
            }))
        };

        put(route('forms.update', form.id));
    };

    const getIconForType = (identifier: string) => {
        switch (identifier) {
            case 'rating_stars': return <Star className="h-4 w-4" />;
            case 'rating_slider': return <SlidersHorizontal className="h-4 w-4" />;
            default: return null;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Form: ${form.title}`} />

            <div className="max-w-4xl mx-auto space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Edit Form Template</h2>
                        <p className="text-muted-foreground">Editing this will generate a new version so previous submissions are unaffected.</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Form Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Form Title <span className="text-red-500">*</span></Label>
                                    <Input id="title" value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g. Waiter Daily Checklist" required />
                                    {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Form Status <span className="text-red-500">*</span></Label>
                                    <Select value={data.status} onValueChange={(val) => setData('status', val)}>
                                        <SelectTrigger className="w-full bg-white">
                                            <SelectValue placeholder="Select Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft (Hidden)</SelectItem>
                                            <SelectItem value="active">Active (Available)</SelectItem>
                                            <SelectItem value="archived">Archived (Closed)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Brief instructions or purpose for this form" />
                                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="sections-list" type="section">
                            {(provided) => (
                                <div className="space-y-6" {...provided.droppableProps} ref={provided.innerRef}>
                                    {data.sections.map((section: any, sIndex: number) => (
                                        <Draggable key={section._id} draggableId={section._id} index={sIndex}>
                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`border-primary/20 shadow-sm relative overflow-visible ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary border-transparent' : ''}`}
                                                >
                                                    <div className="absolute top-4 right-4 z-10 flex space-x-2">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeSection(sIndex)} disabled={data.sections.length === 1} className="text-muted-foreground hover:text-red-500">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <CardHeader className="bg-muted/30 pb-4 border-b">
                                                        <div className="flex items-center space-x-2 w-11/12">
                                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted focus:outline-none">
                                                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                            </div>
                                                            <Input value={section.title} onChange={e => updateSection(sIndex, 'title', e.target.value)} placeholder="Section Title" className="font-semibold text-lg border-none bg-transparent shadow-none focus-visible:ring-0 px-0 rounded-none w-full" required />
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pt-6 space-y-6">
                                                        <div className="bg-muted/10 p-4 rounded border border-muted mb-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <Label className="text-sm font-semibold text-amber-900 flex items-center">
                                                                    <Waypoints className="w-4 h-4 mr-2" /> Section Visibility Logic
                                                                </Label>
                                                                <Switch
                                                                    checked={!!section.visibility_logic}
                                                                    onCheckedChange={(checked) => updateSection(sIndex, 'visibility_logic', checked ? { target_local_id: '', operator: 'equals', value: '' } : null)}
                                                                />
                                                            </div>
                                                            {section.visibility_logic && (() => {
                                                                const logicTargets = getAvailableLogicTargets(sIndex, -1);
                                                                const selectedTarget = logicTargets.find(t => t._id === section.visibility_logic.target_local_id);

                                                                return (
                                                                    <div className="bg-amber-50/50 p-4 rounded-md border border-amber-900/10 space-y-4">
                                                                        {logicTargets.length === 0 ? (
                                                                            <p className="text-sm text-red-500">No previous multiple-choice questions found in previous sections. Add one above to use conditional logic.</p>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">If Question...</Label>
                                                                                    <Select
                                                                                        value={section.visibility_logic.target_local_id || ''}
                                                                                        onValueChange={(val) => updateSection(sIndex, 'visibility_logic', { ...section.visibility_logic, target_local_id: val, value: '' })}
                                                                                    >
                                                                                        <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Select target" /></SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {logicTargets.map(t => (
                                                                                                <SelectItem key={t._id} value={t._id}>{t.label || 'Untitled Question'}</SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">Condition</Label>
                                                                                    <Select
                                                                                        value={section.visibility_logic.operator || 'equals'}
                                                                                        onValueChange={(val) => updateSection(sIndex, 'visibility_logic', { ...section.visibility_logic, operator: val })}
                                                                                    >
                                                                                        <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Condition" /></SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="equals">Equals</SelectItem>
                                                                                            <SelectItem value="not_equals">Does Not Equal</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <Label className="text-xs">Value is...</Label>
                                                                                    <Select
                                                                                        value={section.visibility_logic.value || ''}
                                                                                        onValueChange={(val) => updateSection(sIndex, 'visibility_logic', { ...section.visibility_logic, value: val })}
                                                                                        disabled={!selectedTarget}
                                                                                    >
                                                                                        <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Option value" /></SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {selectedTarget?.choices?.map((c: any) => (
                                                                                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                                                            ))}
                                                                                            {!selectedTarget && <SelectItem value="none" disabled>Select target</SelectItem>}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })()}
                                                        </div>
                                                        <Droppable droppableId={`questions-${sIndex}`} type="question">
                                                            {(provided) => (
                                                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6 bg-transparent min-h-[50px]">
                                                                    {!section.questions || section.questions.length === 0 ? (
                                                                        <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                                            No questions in this section yet.
                                                                        </div>
                                                                    ) : (
                                                                        section.questions.map((question: any, qIndex: number) => {
                                                                            const selectedTypeIdentifier = inputTypes.find(t => t.id == question.form_input_type_id)?.type_identifier;
                                                                            const isSelectType = selectedTypeIdentifier?.includes('select');
                                                                            const isBranch = selectedTypeIdentifier === 'branch_lookup';
                                                                            const isDepartment = selectedTypeIdentifier === 'department_lookup';
                                                                            return (
                                                                                <Draggable key={question._id} draggableId={question._id} index={qIndex}>
                                                                                    {(provided, snapshot) => (
                                                                                        <div
                                                                                            ref={provided.innerRef}
                                                                                            {...provided.draggableProps}
                                                                                            className={`bg-muted/10 p-4 rounded-lg border relative flex space-x-3 ${snapshot.isDragging ? 'shadow-lg bg-background ring-2 ring-primary border-transparent' : ''}`}
                                                                                        >
                                                                                            <div className="pt-2">
                                                                                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700">
                                                                                                    <GripVertical className="h-5 w-5" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex-1">
                                                                                                <div className="absolute top-2 right-2 opacity-100">
                                                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(sIndex, qIndex)} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                                                                        <Trash2 className="h-4 w-4" />
                                                                                                    </Button>
                                                                                                </div>

                                                                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-1 pr-8">
                                                                                                    <div className="md:col-span-8 space-y-2">
                                                                                                        <Label>Question Text</Label>
                                                                                                        <Input value={question.label} onChange={e => updateQuestion(sIndex, qIndex, 'label', e.target.value)} placeholder="e.g. Is the table clean?" required />
                                                                                                    </div>
                                                                                                    <div className="md:col-span-4 space-y-2">
                                                                                                        <Label>Input Type</Label>
                                                                                                        <Select onValueChange={(val) => updateQuestion(sIndex, qIndex, 'form_input_type_id', Number(val))} value={String(question.form_input_type_id)}>
                                                                                                            <SelectTrigger className="bg-white">
                                                                                                                <SelectValue placeholder="Select type" />
                                                                                                            </SelectTrigger>
                                                                                                            <SelectContent>
                                                                                                                {inputTypes.map((type: any) => (
                                                                                                                    <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                                                                                                ))}
                                                                                                            </SelectContent>
                                                                                                        </Select>
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="mt-4 flex items-center space-x-2">
                                                                                                    <Checkbox id={`req-${sIndex}-${qIndex}`} checked={question.is_required} onCheckedChange={(checked) => updateQuestion(sIndex, qIndex, 'is_required', checked)} />
                                                                                                    <Label htmlFor={`req-${sIndex}-${qIndex}`} className="text-sm font-normal">Require an answer</Label>
                                                                                                </div>

                                                                                                {isSelectType && (
                                                                                                    <div className="mt-4 pt-3 border-t space-y-3">
                                                                                                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Options</Label>
                                                                                                        {question.choices && question.choices.map((choice: any, cIndex: number) => (
                                                                                                            <div key={choice._id} className="flex items-center space-x-2">
                                                                                                                <Input value={choice.label} onChange={e => updateChoice(sIndex, qIndex, cIndex, 'label', e.target.value)} placeholder="Display Text" className="h-9 text-sm bg-white" required />
                                                                                                                <Input value={choice.value} onChange={e => updateChoice(sIndex, qIndex, cIndex, 'value', e.target.value)} placeholder="Value (Code)" className="h-9 text-sm bg-muted/50" />
                                                                                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(sIndex, qIndex, cIndex)} className="h-8 w-8 text-muted-foreground hover:text-red-500" disabled={question.choices.length <= 1}>
                                                                                                                    <Trash2 className="h-4 w-4" />
                                                                                                                </Button>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        <Button type="button" variant="outline" size="sm" onClick={() => addChoice(sIndex, qIndex)} className="h-8 text-xs font-medium">
                                                                                                            <Plus className="mr-1 h-3 w-3" /> Add Option
                                                                                                        </Button>
                                                                                                    </div>
                                                                                                )}

                                                                                                {(isBranch || isDepartment) && (
                                                                                                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                                                                                        <Label className="block text-sm font-medium mb-2 opacity-80">
                                                                                                            Optional: Statically Lock to a pre-defined {isBranch ? 'Branch' : 'Department'}
                                                                                                        </Label>
                                                                                                        <SearchableSelect
                                                                                                            options={isBranch ? branches : departments}
                                                                                                            value={question.default_value}
                                                                                                            onValueChange={(val) => updateQuestion(sIndex, qIndex, 'default_value', val === 'none' ? '' : val)}
                                                                                                            allowAll={true}
                                                                                                            allLabel="End-User Fills Dynamically"
                                                                                                            allValue="none"
                                                                                                            placeholder={`Select ${isBranch ? 'Branch' : 'Department'} to lock...`}
                                                                                                        />
                                                                                                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                                                                                                            If locked, users cannot change this on their checklists. It will automatically filter downstream components natively.
                                                                                                        </p>
                                                                                                    </div>
                                                                                                )}

                                                                                                <div className="mt-6 pt-4 border-t border-muted">
                                                                                                    <div className="flex items-center justify-between mb-3">
                                                                                                        <Label className="text-sm font-semibold text-amber-900 flex items-center">
                                                                                                            <Waypoints className="w-4 h-4 mr-2" /> Conditional Skip Logic
                                                                                                        </Label>
                                                                                                        <Switch
                                                                                                            checked={!!question.visibility_logic}
                                                                                                            onCheckedChange={(checked) => updateQuestion(sIndex, qIndex, 'visibility_logic', checked ? { target_local_id: '', operator: 'equals', value: '' } : null)}
                                                                                                        />
                                                                                                    </div>
                                                                                                    {question.visibility_logic && (() => {
                                                                                                        const logicTargets = getAvailableLogicTargets(sIndex, qIndex);
                                                                                                        const selectedTarget = logicTargets.find(t => t._id === question.visibility_logic.target_local_id);

                                                                                                        return (
                                                                                                            <div className="bg-amber-50/50 p-4 rounded-md border border-amber-900/10 space-y-4">
                                                                                                                {logicTargets.length === 0 ? (
                                                                                                                    <p className="text-sm text-red-500">No previous multiple-choice questions found. Add one above to use conditional logic.</p>
                                                                                                                ) : (
                                                                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                                                        <div className="space-y-1">
                                                                                                                            <Label className="text-xs">If Question...</Label>
                                                                                                                            <Select
                                                                                                                                value={question.visibility_logic.target_local_id || ''}
                                                                                                                                onValueChange={(val) => updateQuestion(sIndex, qIndex, 'visibility_logic', { ...question.visibility_logic, target_local_id: val, value: '' })}
                                                                                                                            >
                                                                                                                                <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Select target" /></SelectTrigger>
                                                                                                                                <SelectContent>
                                                                                                                                    {logicTargets.map(t => (
                                                                                                                                        <SelectItem key={t._id} value={t._id}>{t.label || 'Untitled Question'}</SelectItem>
                                                                                                                                    ))}
                                                                                                                                </SelectContent>
                                                                                                                            </Select>
                                                                                                                        </div>
                                                                                                                        <div className="space-y-1">
                                                                                                                            <Label className="text-xs">Condition</Label>
                                                                                                                            <Select
                                                                                                                                value={question.visibility_logic.operator || 'equals'}
                                                                                                                                onValueChange={(val) => updateQuestion(sIndex, qIndex, 'visibility_logic', { ...question.visibility_logic, operator: val })}
                                                                                                                            >
                                                                                                                                <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Condition" /></SelectTrigger>
                                                                                                                                <SelectContent>
                                                                                                                                    <SelectItem value="equals">Equals</SelectItem>
                                                                                                                                    <SelectItem value="not_equals">Does Not Equal</SelectItem>
                                                                                                                                </SelectContent>
                                                                                                                            </Select>
                                                                                                                        </div>
                                                                                                                        <div className="space-y-1">
                                                                                                                            <Label className="text-xs">Value is...</Label>
                                                                                                                            <Select
                                                                                                                                value={question.visibility_logic.value || ''}
                                                                                                                                onValueChange={(val) => updateQuestion(sIndex, qIndex, 'visibility_logic', { ...question.visibility_logic, value: val })}
                                                                                                                                disabled={!selectedTarget}
                                                                                                                            >
                                                                                                                                <SelectTrigger className="bg-white text-sm"><SelectValue placeholder="Option value" /></SelectTrigger>
                                                                                                                                <SelectContent>
                                                                                                                                    {selectedTarget?.choices?.map((c: any) => (
                                                                                                                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                                                                                                    ))}
                                                                                                                                    {!selectedTarget && <SelectItem value="none" disabled>Select target</SelectItem>}
                                                                                                                                </SelectContent>
                                                                                                                            </Select>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )
                                                                                                    })()}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            )
                                                                        })
                                                                    )}
                                                                    {provided.placeholder}
                                                                </div>
                                                            )}
                                                        </Droppable>

                                                        <Button type="button" variant="outline" onClick={() => addQuestion(sIndex)} className="w-full border-dashed py-6 text-muted-foreground hover:text-primary">
                                                            <Plus className="mr-2 h-4 w-4" /> Add Question
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    <div className="flex justify-center pt-2">
                        <Button type="button" variant="secondary" size="lg" onClick={addSection} className="shadow-sm">
                            <Plus className="mr-2 h-5 w-5" /> Add New Section
                        </Button>
                    </div>

                    <div className="pt-6 border-t flex justify-end space-x-4">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('forms.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" size="lg" disabled={processing || data.sections.length === 0}>
                            Update & Version Form
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
