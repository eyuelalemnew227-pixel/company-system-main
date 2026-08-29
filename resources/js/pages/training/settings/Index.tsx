import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import {
    BookOpen,
    FileText,
    HelpCircle,
    Loader2,
    Package,
    Plus,
    Save,
    Settings,
    Star,
    Trash2,
    Users,
} from 'lucide-react';
import React, { useState } from 'react';

type QuestionMetric = {
    key: string;
    title: string;
    description: string;
};

type AgendaLabels = {
    title_label: string;
    objectives_label: string;
    outline_label: string;
    roles_label: string;
    method_label: string;
    resources_label: string;
};

type PageProps = {
    questionnaire: QuestionMetric[];
    deliveryMethods: string[];
    targetRoles: string[];
    resourceCategories: string[];
    agendaTitles: AgendaLabels;
    instructions: string;
};

export default function TrainingSettingsIndex({
    questionnaire = [],
    deliveryMethods = [],
    targetRoles = [],
    resourceCategories = [],
    agendaTitles = {
        title_label: '1. የስልጠናው ርዕስ (Training Title / Topic)',
        objectives_label: '2. የስልጠናው ዓላማ (Training Objectives)',
        outline_label: '3. የስልጠናው ይዘት (Training Content Outline)',
        roles_label: '4. የስልጠናው ተሳታፊዎች (Target Trainee Roles)',
        method_label: '5. የስልጠናው አሰጣጥ ዘዴ (Delivery Method)',
        resources_label: '6. የስልጠናው የሚያስፈልጉ ግብአቶች (Required Resources)',
    },
    instructions = '',
}: PageProps) {
    const [activeTab, setActiveTab] = useState<'agenda' | 'feedback'>('agenda');

    const { data, setData, post, processing, errors } = useForm({
        questionnaire: questionnaire,
        deliveryMethods: deliveryMethods,
        targetRoles: targetRoles,
        resourceCategories: resourceCategories,
        agendaTitles: agendaTitles,
        instructions: instructions,
    });

    const handleQuestionChange = (index: number, field: 'title' | 'description', val: string) => {
        const updated = [...data.questionnaire];
        updated[index][field] = val;
        setData('questionnaire', updated);
    };

    const handleAddQuestion = () => {
        setData('questionnaire', [
            ...data.questionnaire,
            {
                key: `custom_${Date.now()}`,
                title: 'New Evaluation Criterion',
                description: 'Enter evaluation criteria description for evaluators...',
            },
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        setData(
            'questionnaire',
            data.questionnaire.filter((_, i) => i !== index)
        );
    };

    const handleDeliveryChange = (index: number, val: string) => {
        const updated = [...data.deliveryMethods];
        updated[index] = val;
        setData('deliveryMethods', updated);
    };

    const handleAddDelivery = () => {
        setData('deliveryMethods', [...data.deliveryMethods, 'New Delivery Method']);
    };

    const handleRemoveDelivery = (index: number) => {
        setData(
            'deliveryMethods',
            data.deliveryMethods.filter((_, i) => i !== index)
        );
    };

    const handleRoleChange = (index: number, val: string) => {
        const updated = [...data.targetRoles];
        updated[index] = val;
        setData('targetRoles', updated);
    };

    const handleAddRole = () => {
        setData('targetRoles', [...data.targetRoles, 'New Target Role']);
    };

    const handleRemoveRole = (index: number) => {
        setData(
            'targetRoles',
            data.targetRoles.filter((_, i) => i !== index)
        );
    };

    const handleResourceChange = (index: number, val: string) => {
        const updated = [...data.resourceCategories];
        updated[index] = val;
        setData('resourceCategories', updated);
    };

    const handleAddResource = () => {
        setData('resourceCategories', [...data.resourceCategories, 'New Equipment / Resource Item']);
    };

    const handleRemoveResource = (index: number) => {
        setData(
            'resourceCategories',
            data.resourceCategories.filter((_, i) => i !== index)
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/training/settings');
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Training Settings', href: '/training/settings' },
            ]}
        >
            <Head title="Training Management Settings" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Settings className="h-6 w-6 text-purple-600" /> Training Management Settings
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Configure Department Agenda proposal templates, training manuals, resource categories, and trainer feedback questionnaires
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border">
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === 'agenda' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('agenda')}
                            className={activeTab === 'agenda' ? 'bg-purple-700 hover:bg-purple-800 text-xs' : 'text-xs'}
                        >
                            <BookOpen className="h-3.5 w-3.5 mr-1" /> Agenda & Manual
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={activeTab === 'feedback' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('feedback')}
                            className={activeTab === 'feedback' ? 'bg-purple-700 hover:bg-purple-800 text-xs' : 'text-xs'}
                        >
                            <Star className="h-3.5 w-3.5 mr-1 text-amber-400" /> Feedback Questionnaire
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'agenda' && (
                        <div className="space-y-6">
                            {/* Form Guidelines & Manual Text */}
                            <Card className="border-2 border-slate-300 dark:border-slate-800 shadow-sm">
                                <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <BookOpen className="h-4 w-4 text-purple-600" /> Department Agenda Guidelines & Manual Text
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Instruction guidelines displayed to department heads when submitting training proposals
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <Label className="font-bold text-xs">Submission Help Text & Manual Guidelines</Label>
                                        <Textarea
                                            rows={3}
                                            value={data.instructions}
                                            onChange={(e) => setData('instructions', e.target.value)}
                                            placeholder="Enter guidelines..."
                                            className="mt-1 text-xs font-medium"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section Titles Customization */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-purple-600" /> Department Agenda Form Labels
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Customize form labels for training proposals
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold">Title Field Label</Label>
                                        <Input
                                            value={data.agendaTitles.title_label}
                                            onChange={(e) => setData('agendaTitles', { ...data.agendaTitles, title_label: e.target.value })}
                                            className="mt-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Objectives Field Label</Label>
                                        <Input
                                            value={data.agendaTitles.objectives_label}
                                            onChange={(e) => setData('agendaTitles', { ...data.agendaTitles, objectives_label: e.target.value })}
                                            className="mt-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Content Outline Field Label</Label>
                                        <Input
                                            value={data.agendaTitles.outline_label}
                                            onChange={(e) => setData('agendaTitles', { ...data.agendaTitles, outline_label: e.target.value })}
                                            className="mt-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Target Roles Field Label</Label>
                                        <Input
                                            value={data.agendaTitles.roles_label}
                                            onChange={(e) => setData('agendaTitles', { ...data.agendaTitles, roles_label: e.target.value })}
                                            className="mt-1 text-xs"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Delivery Methods & Target Roles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Delivery Methods */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-purple-600" /> Delivery Methods List
                                                </CardTitle>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAddDelivery} className="h-7 text-xs">
                                                <Plus className="h-3.5 w-3.5" /> Add
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {data.deliveryMethods.map((dm, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    value={dm}
                                                    onChange={(e) => handleDeliveryChange(idx, e.target.value)}
                                                    className="text-xs font-semibold"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveDelivery(idx)}
                                                    className="text-rose-500 h-8 w-8"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Target Trainee Roles */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-purple-600" /> Target Trainee Roles List
                                                </CardTitle>
                                            </div>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAddRole} className="h-7 text-xs">
                                                <Plus className="h-3.5 w-3.5" /> Add
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {data.targetRoles.map((role, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    value={role}
                                                    onChange={(e) => handleRoleChange(idx, e.target.value)}
                                                    className="text-xs font-semibold"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveRole(idx)}
                                                    className="text-rose-500 h-8 w-8"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Required Training Equipment & Resources List */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <Package className="h-4 w-4 text-purple-600" /> Default Training Equipment & Material Categories
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Equipment items available in the agenda required resources table
                                            </CardDescription>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddResource} className="h-7 text-xs">
                                            <Plus className="h-3.5 w-3.5" /> Add Equipment
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {data.resourceCategories.map((res, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <Input
                                                value={res}
                                                onChange={(e) => handleResourceChange(idx, e.target.value)}
                                                className="text-xs font-semibold"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveResource(idx)}
                                                className="text-rose-500 h-8 w-8"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'feedback' && (
                        /* Feedback Questionnaire Settings */
                        <Card className="border-2 border-purple-200 dark:border-purple-900 shadow-sm">
                            <CardHeader className="bg-purple-50/50 dark:bg-purple-950/20 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-900 dark:text-purple-200">
                                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                            Trainer Feedback Questionnaire Criteria
                                        </CardTitle>
                                        <CardDescription>
                                            Customize evaluation rating criteria shown to Super Admins & Branch Managers
                                        </CardDescription>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddQuestion}
                                        className="gap-1.5 text-xs border-purple-300 text-purple-800 dark:text-purple-300"
                                    >
                                        <Plus className="h-4 w-4" /> Add Questionnaire Criterion
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {data.questionnaire.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <Badge variant="outline" className="font-mono text-xs">
                                                Criterion #{idx + 1}
                                            </Badge>
                                            {data.questionnaire.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveQuestion(idx)}
                                                    className="text-rose-500 hover:text-rose-700 h-7 text-xs"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <Label className="text-xs font-bold">Question Title / Heading</Label>
                                                <Input
                                                    value={item.title}
                                                    onChange={(e) => handleQuestionChange(idx, 'title', e.target.value)}
                                                    placeholder="e.g. የስልጠናው ይዘት ግልፅነትና ጠቃሚነት..."
                                                    className="mt-1 font-semibold text-xs"
                                                />
                                            </div>

                                            <div>
                                                <Label className="text-xs font-semibold text-muted-foreground">
                                                    Question Subtitle / Description
                                                </Label>
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => handleQuestionChange(idx, 'description', e.target.value)}
                                                    placeholder="Explanation for evaluator..."
                                                    className="mt-1 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Save Button */}
                    <div className="flex items-center justify-end border-t pt-4">
                        <Button type="submit" disabled={processing} className="gap-2 bg-purple-700 hover:bg-purple-800">
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            <span>Save Training Settings & Guidelines</span>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
