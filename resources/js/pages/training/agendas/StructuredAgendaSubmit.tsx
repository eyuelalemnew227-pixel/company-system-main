import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Layers,
    ListPlus,
    Loader2,
    PackagePlus,
    Plus,
    Send,
    Trash2,
    Users,
} from 'lucide-react';
import React, { useState } from 'react';

type Department = { id: number; name: string };

type RequiredMaterial = {
    item: string;
    specification: string;
    quantity: string;
    ratio: string;
};

type PageProps = {
    departments: Department[];
    userDepartment?: Department | null;
};

export default function StructuredAgendaSubmit({ departments = [], userDepartment }: PageProps) {
    const [deptSearch, setDeptSearch] = useState('');
    const [objectivesList, setObjectivesList] = useState<string[]>(['', '']);
    const [contentList, setContentList] = useState<string[]>(['', '']);
    const [targetRolesList, setTargetRolesList] = useState<string[]>(['Branch Managers', 'Store Keepers', 'Cashiers']);
    const [newRole, setNewRole] = useState('');

    const [materials, setMaterials] = useState<RequiredMaterial[]>([
        { item: '', specification: '', quantity: '', ratio: '' },
    ]);

    const filteredDepartments = departments.filter((d) =>
        d.name.toLowerCase().includes(deptSearch.toLowerCase())
    );

    const { data, setData, post, processing, errors } = useForm({
        department_id: userDepartment?.id ? String(userDepartment.id) : (departments[0]?.id ? String(departments[0].id) : ''),
        title: '',
        allocated_minutes: 35,
        description: '',
        objectives: [] as string[],
        content_outline: [] as string[],
        target_trainees: [] as string[],
        delivery_method: 'In-Person (የገፅ ለገፅ ስልጠና)',
        required_resources: [] as RequiredMaterial[],
    });

    const handleAddObjective = () => setObjectivesList([...objectivesList, '']);
    const handleRemoveObjective = (index: number) => setObjectivesList(objectivesList.filter((_, i) => i !== index));

    const handleAddContent = () => setContentList([...contentList, '']);
    const handleRemoveContent = (index: number) => setContentList(contentList.filter((_, i) => i !== index));

    const handleAddRole = () => {
        if (newRole.trim() && !targetRolesList.includes(newRole.trim())) {
            setTargetRolesList([...targetRolesList, newRole.trim()]);
            setNewRole('');
        }
    };
    const handleRemoveRole = (role: string) => setTargetRolesList(targetRolesList.filter((r) => r !== role));

    const handleAddMaterial = () => {
        setMaterials([...materials, { item: '', specification: '', quantity: '', ratio: '' }]);
    };
    const handleRemoveMaterial = (index: number) => {
        setMaterials(materials.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const filteredObjectives = objectivesList.filter((item) => item.trim() !== '');
        const filteredContent = contentList.filter((item) => item.trim() !== '');
        const filteredMaterials = materials.filter((m) => m.item.trim() !== '');

        setData('objectives', filteredObjectives);
        setData('content_outline', filteredContent);
        setData('target_trainees', targetRolesList);
        setData('required_resources', filteredMaterials);

        post('/training/agendas');
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Training Agendas', href: '/training/agendas' },
                { title: 'Submit Structured Agenda', href: '#' },
            ]}
        >
            <Head title="Submit Department Structured Training Format" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/training/agendas">
                            <Button variant="outline" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Department Training Agenda Proposal</h1>
                            <p className="text-xs text-muted-foreground">
                                Fill and submit training objectives, agenda topics, and materials for Training Department review
                            </p>
                        </div>
                    </div>
                </div>

                <Card className="border-2 border-slate-300 dark:border-slate-800 shadow-md">
                    <CardHeader className="bg-slate-100 dark:bg-slate-900 border-b p-4 text-center rounded-t-xl">
                        <div className="font-extrabold text-xl tracking-widest text-slate-800 dark:text-slate-100">
                            KALDIS COFFEE
                        </div>
                        <div className="inline-block bg-slate-200 dark:bg-slate-800 px-4 py-1 rounded font-bold text-sm text-slate-700 dark:text-slate-300 mt-1 uppercase tracking-wider">
                            DEPARTMENT TRAINING FORM (የስልጠና መዋቅራዊ ፎርማት)
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="p-6 space-y-6">
                            {/* Title & Department */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="title" className="font-bold text-sm">
                                        1. የስልጠናው ርዕስ (Training Title / Topic) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Sale / Deposit document submission procedure (በምርትና ዴፖዚት ሰነድ መላክ ላይ)"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="mt-1 font-semibold"
                                        required
                                    />
                                    <InputError message={errors.title} />
                                </div>

                                <div>
                                    <Label htmlFor="department_id" className="font-bold text-sm">
                                        2. ዲፓርትመንት (Department) <span className="text-rose-500">*</span>
                                    </Label>
                                    {userDepartment ? (
                                        <div className="mt-1 p-2 bg-purple-50 dark:bg-purple-950/40 rounded-md border border-purple-200 dark:border-purple-800 flex items-center justify-between font-bold text-purple-900 dark:text-purple-200 text-sm">
                                            <span>🏢 {userDepartment.name}</span>
                                            <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900">Logged-in User Dept</Badge>
                                        </div>
                                    ) : (
                                        <div className="mt-1">
                                            <SearchableSelect
                                                options={departments}
                                                value={data.department_id}
                                                onValueChange={(val) => setData('department_id', val)}
                                                placeholder="Select Department..."
                                                searchPlaceholder="Search department..."
                                                className="w-full"
                                            />
                                        </div>
                                    )}
                                    <InputError message={errors.department_id} />
                                </div>

                                <div>
                                    <Label htmlFor="allocated_minutes" className="font-bold text-sm">
                                        3. የሚወስደው ሰዓት (Duration in Minutes) <span className="text-rose-500">*</span>
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input
                                            id="allocated_minutes"
                                            type="number"
                                            min={5}
                                            max={480}
                                            value={data.allocated_minutes}
                                            onChange={(e) => setData('allocated_minutes', parseInt(e.target.value) || 35)}
                                            className="w-32 font-mono font-bold"
                                            required
                                        />
                                        <span className="text-sm font-medium text-muted-foreground">ደቂቃ (e.g. 35m)</span>
                                    </div>
                                    <InputError message={errors.allocated_minutes} />
                                </div>

                                <div>
                                    <Label htmlFor="delivery_method" className="font-bold text-sm">
                                        5. ስልጠናው የሚሰጥበት መንገድ (Delivery Method) <span className="text-rose-500">*</span>
                                    </Label>
                                    <select
                                        id="delivery_method"
                                        value={data.delivery_method}
                                        onChange={(e) => setData('delivery_method', e.target.value)}
                                        className="mt-1 w-full rounded-md border border-input bg-white p-2 text-sm dark:bg-slate-950"
                                    >
                                        <option value="In-Person (የገፅ ለገፅ ስልጠና)">In-Person (የገፅ ለገፅ ስልጠና)</option>
                                        <option value="On-the-Job (የስራ ላይ ስልጠና)">On-the-Job (የስራ ላይ ስልጠና)</option>
                                        <option value="Off-the-Job (ከስራ ውጭ ስልጠና)">Off-the-Job (ከስራ ውጭ ስልጠና)</option>
                                        <option value="Online / Hybrid (በቴሌግራም/ኦንላይን)">Online / Hybrid (በቴሌግራም/ኦንላይን)</option>
                                    </select>
                                </div>
                            </div>

                            <hr />

                            {/* Short Description */}
                            <div>
                                <Label htmlFor="description" className="font-bold text-sm">
                                    6. የስልጠናው አጭር መግለጫ (Short Overview / Summary)
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={2}
                                    placeholder="Brief overview of what this training will cover..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            {/* Training Objectives */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="font-bold text-sm">
                                        7. የስልጠናው ዓላማ (Training Objectives / Goals)
                                    </Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddObjective} className="gap-1 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Add Goal
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    ከዚህ ስልጠና በኋላ ሰልጣኞች የሚከተሉትን ሃሳቦች ማወቅ ይጠበቅባቸዋል፡
                                </p>
                                <div className="space-y-2">
                                    {objectivesList.map((obj, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="font-bold text-sm w-6">{idx + 1}.</span>
                                            <Input
                                                placeholder={`Objective ${idx + 1}...`}
                                                value={obj}
                                                onChange={(e) => {
                                                    const updated = [...objectivesList];
                                                    updated[idx] = e.target.value;
                                                    setObjectivesList(updated);
                                                }}
                                                className="flex-1"
                                            />
                                            {objectivesList.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-rose-500"
                                                    onClick={() => handleRemoveObjective(idx)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Training Content / Topics */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="font-bold text-sm">
                                        8. የስልጠናው ይዘት (Training Content / Key Topics)
                                    </Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddContent} className="gap-1 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Add Topic
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {contentList.map((content, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="font-mono text-sm w-6">•</span>
                                            <Input
                                                placeholder={`Topic item ${idx + 1}... e.g. Cash flow አሞላል`}
                                                value={content}
                                                onChange={(e) => {
                                                    const updated = [...contentList];
                                                    updated[idx] = e.target.value;
                                                    setContentList(updated);
                                                }}
                                                className="flex-1"
                                            />
                                            {contentList.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-rose-500"
                                                    onClick={() => handleRemoveContent(idx)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Target Trainees */}
                            <div>
                                <Label className="font-bold text-sm mb-2 block">
                                    9. የስልጠናው ተሳታፊዎች (Target Trainee Roles)
                                </Label>
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    {targetRolesList.map((role) => (
                                        <Badge key={role} variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
                                            {role}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRole(role)}
                                                className="text-rose-500 hover:text-rose-700 font-bold"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 max-w-md">
                                    <Input
                                        placeholder="Add role e.g. Cashier, Store keeper..."
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddRole();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={handleAddRole}>
                                        Add Role
                                    </Button>
                                </div>
                            </div>

                            <hr />

                            {/* Required Resources Table (Image 1 Table) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="font-bold text-sm">
                                        10. ለስልጠናው የሚያስፈልጉ ግብአቶች (Required Training Materials & Resources)
                                    </Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial} className="gap-1 text-xs">
                                        <Plus className="h-3.5 w-3.5" /> Add Material
                                    </Button>
                                </div>

                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 dark:bg-slate-900 border-b">
                                            <tr>
                                                <th className="p-2 w-10 text-center">ተ.ቁ</th>
                                                <th className="p-2">ግብአት (Item)</th>
                                                <th className="p-2">አይነት (Specification)</th>
                                                <th className="p-2 w-28">ብዛት (Quantity)</th>
                                                <th className="p-2 w-36">መጠን (Ratio: Item/Trainee)</th>
                                                <th className="p-2 w-12 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {materials.map((m, idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="p-2 text-center font-bold">{idx + 1}</td>
                                                    <td className="p-2">
                                                        <Input
                                                            placeholder="Item name..."
                                                            value={m.item}
                                                            onChange={(e) => {
                                                                const updated = [...materials];
                                                                updated[idx].item = e.target.value;
                                                                setMaterials(updated);
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            placeholder="Spec/model..."
                                                            value={m.specification}
                                                            onChange={(e) => {
                                                                const updated = [...materials];
                                                                updated[idx].specification = e.target.value;
                                                                setMaterials(updated);
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            placeholder="Qty..."
                                                            value={m.quantity}
                                                            onChange={(e) => {
                                                                const updated = [...materials];
                                                                updated[idx].quantity = e.target.value;
                                                                setMaterials(updated);
                                                            }}
                                                            className="h-8 text-xs font-mono"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            placeholder="1 per trainee..."
                                                            value={m.ratio}
                                                            onChange={(e) => {
                                                                const updated = [...materials];
                                                                updated[idx].ratio = e.target.value;
                                                                setMaterials(updated);
                                                            }}
                                                            className="h-8 text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-rose-500"
                                                            onClick={() => handleRemoveMaterial(idx)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex items-center justify-end gap-3 border-t">
                                <Link href="/training/agendas">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="gap-2 bg-purple-700 hover:bg-purple-800">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span>Submit Structured Agenda & Notify Training Dept</span>
                                </Button>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
