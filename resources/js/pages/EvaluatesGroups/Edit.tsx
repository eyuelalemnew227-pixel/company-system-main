import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type QuestionGroup } from '@/types/question-groups.d';
import { type EvaluatesGroup, type EvaluatesGroupEmployee, type Branch, type Department, type OtherEvaluable } from '@/types/evaluates-group.d';
import { Head, Link, useForm } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import { Search, CheckSquare, XSquare } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Evaluates Groups',
        href: '/evaluates-groups',
    },
    {
        title: 'Edit Evaluates Group',
        href: null,
    },
];

export default function EditEvaluatesGroup({
    evaluatesGroup,
    questionGroups,
    employees,
    branches,
    departments,
    otherEvaluables,
}: {
    evaluatesGroup: EvaluatesGroup;
    questionGroups: QuestionGroup[];
    employees: EvaluatesGroupEmployee[];
    branches: Branch[];
    departments: Department[];
    otherEvaluables: OtherEvaluable[];
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBranch, setFilterBranch] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');

    const { data, setData, put, errors, processing } = useForm({
        name: evaluatesGroup.name || '',
        question_group_id: evaluatesGroup.question_group_id?.toString() || '',
        evaluable_type: evaluatesGroup.evaluable_type || 'employee',
        entity_ids: (evaluatesGroup.selected_entities || []) as number[],
    });

    // Filter employees
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            if (!emp) return false;
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
            const email = (emp.email || '').toLowerCase();
            const query = searchQuery.toLowerCase();
            const matchesSearch = fullName.includes(query) || email.includes(query);
            const matchesBranch = filterBranch === 'all' || emp.branch_id?.toString() === filterBranch;
            const matchesDepartment = filterDepartment === 'all' || emp.department_id?.toString() === filterDepartment;
            return matchesSearch && matchesBranch && matchesDepartment;
        });
    }, [employees, searchQuery, filterBranch, filterDepartment]);

    // Filter departments
    const filteredDepartments = useMemo(() => {
        return departments.filter((dept: any) => {
            const matchesSearch = (dept.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            // Check if department has any branch with the selected branch_id
            const matchesBranch = filterBranch === 'all' || 
                (dept.branches && dept.branches.some((b: any) => b.id.toString() === filterBranch));
            return matchesSearch && matchesBranch;
        });
    }, [departments, searchQuery, filterBranch]);

    // Filter branches
    const filteredBranches = useMemo(() => {
        return branches.filter((branch) => {
            return (branch.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [branches, searchQuery]);

    // Filter other evaluables
    const filteredOthers = useMemo(() => {
        return otherEvaluables.filter((other) => {
            const query = searchQuery.toLowerCase();
            return (other.name || '').toLowerCase().includes(query) || 
                   (other.description && other.description.toLowerCase().includes(query));
        });
    }, [otherEvaluables, searchQuery]);

    function toggleEntity(id: number, checked: boolean | string) {
        setData('entity_ids', checked ? [...data.entity_ids, id] : data.entity_ids.filter((x) => x !== id));
    }

    function selectAll() {
        let allIds: number[] = [];
        switch (data.evaluable_type) {
            case 'employee':
                allIds = filteredEmployees.map(e => e.id);
                break;
            case 'department':
                allIds = filteredDepartments.map(d => d.id);
                break;
            case 'branch':
                allIds = filteredBranches.map(b => b.id);
                break;
            case 'other':
                allIds = filteredOthers.map(o => o.id);
                break;
        }
        setData('entity_ids', allIds);
    }

    function deselectAll() {
        setData('entity_ids', []);
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        put(`/evaluates-groups/${evaluatesGroup.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Evaluates Group" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Edit Evaluates Group</CardTitle>
                        <CardAction>
                            <Link href={'/evaluates-groups'}>
                                <Button variant={'default'}>Go Back</Button>
                            </Link>
                        </CardAction>
                    </CardHeader>
                    <hr />
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Q1 Performance Review"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="question_group_id">Question Group</Label>
                                <Select
                                    value={data.question_group_id.toString()}
                                    onValueChange={(value) => setData('question_group_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select question group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {questionGroups.map((group) => (
                                            <SelectItem key={group.id} value={group.id.toString()}>
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.question_group_id} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="evaluable_type">What to Evaluate?</Label>
                                <Select
                                    value={data.evaluable_type}
                                    onValueChange={(value: 'employee' | 'department' | 'branch' | 'other') => {
                                        setData('evaluable_type', value);
                                        setData('entity_ids', []);
                                        setSearchQuery('');
                                        setFilterBranch('all');
                                        setFilterDepartment('all');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select evaluation type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">Employees</SelectItem>
                                        <SelectItem value="department">Departments</SelectItem>
                                        <SelectItem value="branch">Branches</SelectItem>
                                        <SelectItem value="other">Other Evaluables</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.evaluable_type} />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Select {data.evaluable_type === 'employee' ? 'Employees' : data.evaluable_type === 'department' ? 'Departments' : data.evaluable_type === 'branch' ? 'Branches' : 'Other Evaluables'} ({data.entity_ids.length} selected)</Label>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                                            <CheckSquare className="mr-1 h-4 w-4" />
                                            Select All
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
                                            <XSquare className="mr-1 h-4 w-4" />
                                            Deselect All
                                        </Button>
                                    </div>
                                </div>

                                {/* Search and Filters */}
                                {data.evaluable_type === 'employee' && (
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                placeholder="Search employees..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                        <Select value={filterBranch} onValueChange={setFilterBranch}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filter by branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Branches</SelectItem>
                                                {branches.map((branch) => (
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                                        {branch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filter by department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Departments</SelectItem>
                                                {departments.map((dept) => (
                                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                                        {dept.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {data.evaluable_type === 'department' && (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                placeholder="Search departments..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9"
                                            />
                                        </div>
                                        <Select value={filterBranch} onValueChange={setFilterBranch}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filter by branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Branches</SelectItem>
                                                {branches.map((branch) => (
                                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                                        {branch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {(data.evaluable_type === 'branch' || data.evaluable_type === 'other') && (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            placeholder={`Search ${data.evaluable_type === 'branch' ? 'branches' : 'other evaluables'}...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                )}

                                {/* Entity Lists */}
                                <div className="max-h-96 overflow-y-auto rounded-md border p-4">
                                    {data.evaluable_type === 'employee' && (
                                        <div className="space-y-3">
                                            {filteredEmployees.length === 0 ? (
                                                <p className="py-8 text-center text-sm text-gray-500">No employees found</p>
                                            ) : (
                                                filteredEmployees.map((emp) => {
                                                    const checked = data.entity_ids.includes(emp.id);
                                                    return (
                                                        <label key={emp.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            <Checkbox checked={checked} onCheckedChange={(c) => toggleEntity(emp.id, c)} />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                                                                <p className="text-xs text-gray-500">{emp.email}</p>
                                                                <div className="mt-1 flex gap-2">
                                                                    {emp.branch && (
                                                                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                            {emp.branch.name}
                                                                        </span>
                                                                    )}
                                                                    {emp.department && (
                                                                        <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                                            {emp.department.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {data.evaluable_type === 'department' && (
                                        <div className="space-y-3">
                                            {filteredDepartments.length === 0 ? (
                                                <p className="py-8 text-center text-sm text-gray-500">No departments found</p>
                                            ) : (
                                                filteredDepartments.map((dept: any) => {
                                                    const checked = data.entity_ids.includes(dept.id);
                                                    return (
                                                        <label key={dept.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            <Checkbox checked={checked} onCheckedChange={(c) => toggleEntity(dept.id, c)} />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{dept.name}</p>
                                                                {dept.branches && dept.branches.length > 0 && (
                                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                                        {dept.branches.map((branch: any) => (
                                                                            <span key={branch.id} className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                                {branch.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {data.evaluable_type === 'branch' && (
                                        <div className="space-y-3">
                                            {filteredBranches.length === 0 ? (
                                                <p className="py-8 text-center text-sm text-gray-500">No branches found</p>
                                            ) : (
                                                filteredBranches.map((branch) => {
                                                    const checked = data.entity_ids.includes(branch.id);
                                                    return (
                                                        <label key={branch.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            <Checkbox checked={checked} onCheckedChange={(c) => toggleEntity(branch.id, c)} />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{branch.name}</p>
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    {data.evaluable_type === 'other' && (
                                        <div className="space-y-3">
                                            {filteredOthers.length === 0 ? (
                                                <p className="py-8 text-center text-sm text-gray-500">No other evaluables found</p>
                                            ) : (
                                                filteredOthers.map((other) => {
                                                    const checked = data.entity_ids.includes(other.id);
                                                    return (
                                                        <label key={other.id} className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            <Checkbox checked={checked} onCheckedChange={(c) => toggleEntity(other.id, c)} />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{other.name}</p>
                                                                {other.description && (
                                                                    <p className="text-xs text-gray-500">{other.description}</p>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                <InputError message={errors.entity_ids as any} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={processing}>
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
