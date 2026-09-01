import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Calendar, Search, UserCheck, UserX, Users, Building, GraduationCap, Filter } from 'lucide-react';
import React, { useState } from 'react';

type BranchOption = { id: number; name: string };
type DeptOption = { id: number; name: string };

type RosterItem = {
    id?: number | null;
    user_id?: number | null;
    branch_id?: number | null;
    department_id?: number | null;
    user_type: 'branch_manager' | 'trainer';
    name: string;
    branch_or_department?: string | null;
    session_date: string;
    is_attended: boolean;
    status: 'on_time' | 'late' | 'absent';
    notes?: string | null;
};

type AttendanceStats = {
    total: number;
    branch_managers: { on_time: number; late: number; absent: number };
    trainers: { on_time: number; late: number; absent: number };
};

type PageProps = {
    branchRoster: RosterItem[];
    deptRoster: RosterItem[];
    branches?: BranchOption[];
    departments?: DeptOption[];
    stats: AttendanceStats;
    selectedDate: string;
    filters?: {
        search: string;
        session_date: string;
    };
};

export default function AttendanceIndex({
    branchRoster = [],
    deptRoster = [],
    branches = [],
    departments = [],
    stats = { total: 0, branch_managers: { on_time: 0, late: 0, absent: 0 }, trainers: { on_time: 0, late: 0, absent: 0 } },
    selectedDate = new Date().toISOString().split('T')[0],
    filters = { search: '', session_date: '' },
}: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [sessionDate, setSessionDate] = useState(selectedDate);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
    const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

    const [localBranchRoster, setLocalBranchRoster] = useState<RosterItem[]>(branchRoster);
    const [localDeptRoster, setLocalDeptRoster] = useState<RosterItem[]>(deptRoster);

    React.useEffect(() => {
        setLocalBranchRoster(branchRoster);
    }, [branchRoster]);

    React.useEffect(() => {
        setLocalDeptRoster(deptRoster);
    }, [deptRoster]);

    const handleDateChange = (newDate: string) => {
        setSessionDate(newDate);
        router.get('/training/attendance', { session_date: newDate, search }, { preserveState: true, replace: true });
    };

    const handleToggleAttendance = (item: RosterItem) => {
        const nextAttended = !item.is_attended;
        const nextStatus: RosterItem['status'] = nextAttended ? 'on_time' : 'absent';

        // Instant 0ms optimistic UI update
        if (item.user_type === 'branch_manager') {
            setLocalBranchRoster((prev) =>
                prev.map((i) =>
                    (i.user_id && item.user_id && i.user_id === item.user_id) || i.name === item.name
                        ? { ...i, is_attended: nextAttended, status: nextStatus }
                        : i
                )
            );
        } else {
            setLocalDeptRoster((prev) =>
                prev.map((i) =>
                    (i.user_id && item.user_id && i.user_id === item.user_id) || i.name === item.name
                        ? { ...i, is_attended: nextAttended, status: nextStatus }
                        : i
                )
            );
        }

        router.post(
            '/training/attendance/toggle',
            {
                user_id: item.user_id,
                user_type: item.user_type,
                name: item.name,
                branch_or_department: item.branch_or_department,
                session_date: sessionDate,
                is_attended: nextAttended,
            },
            {
                preserveScroll: true,
                preserveState: true,
                only: [],
            }
        );
    };

    const filteredBranchRoster = React.useMemo(() => {
        let items = localBranchRoster;

        if (selectedBranchId !== 'all') {
            const targetBranch = branches.find((b) => String(b.id) === selectedBranchId);
            if (targetBranch) {
                const targetName = targetBranch.name.toLowerCase();
                items = items.filter(
                    (i) => (i.branch_id && String(i.branch_id) === selectedBranchId) ||
                           (i.branch_or_department && i.branch_or_department.toLowerCase().includes(targetName))
                );
            }
        }

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            items = items.filter(
                (i) => i.name.toLowerCase().includes(q) || (i.branch_or_department && i.branch_or_department.toLowerCase().includes(q))
            );
        }

        return items;
    }, [localBranchRoster, selectedBranchId, search, branches]);

    const filteredDeptRoster = React.useMemo(() => {
        let items = localDeptRoster;

        if (selectedDeptId !== 'all') {
            const targetDept = departments.find((d) => String(d.id) === selectedDeptId);
            if (targetDept) {
                const targetName = targetDept.name.toLowerCase();
                items = items.filter(
                    (i) => (i.department_id && String(i.department_id) === selectedDeptId) ||
                           (i.branch_or_department && i.branch_or_department.toLowerCase().includes(targetName))
                );
            }
        }

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            items = items.filter(
                (i) => i.name.toLowerCase().includes(q) || (i.branch_or_department && i.branch_or_department.toLowerCase().includes(q))
            );
        }

        return items;
    }, [localDeptRoster, selectedDeptId, search, departments]);

    const renderRosterTable = (items: RosterItem[], categoryTitle: string) => (
        <Table>
            <TableHeader className="bg-slate-800 text-white">
                <TableRow>
                    <TableHead className="w-12 text-center text-white font-bold">ተ.ቁ</TableHead>
                    <TableHead className="font-bold text-white">Category</TableHead>
                    <TableHead className="font-bold text-white">User / Manager Name (የተሳታፊ ስም)</TableHead>
                    <TableHead className="font-bold text-white">Branch / Department (ቅርንጫፍ / ዲፓርትመንት)</TableHead>
                    <TableHead className="font-bold text-white text-center w-56">Attendance (ተገኝቷል? Tik/Untik)</TableHead>
                    <TableHead className="font-bold text-white text-center w-36">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, idx) => (
                    <TableRow key={idx} className="odd:bg-muted/40 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                        <TableCell className="text-center font-bold text-xs">{idx + 1}</TableCell>
                        <TableCell>
                            <Badge
                                variant="outline"
                                className={
                                    item.user_type === 'branch_manager'
                                        ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                                        : 'bg-purple-50 text-purple-800 border-purple-200 font-semibold'
                                }
                            >
                                {item.user_type === 'branch_manager' ? '🏢 Branch User' : '🎓 Department User'}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.name}</TableCell>
                        <TableCell className="text-xs font-bold text-purple-900 dark:text-purple-300">
                            {item.branch_or_department || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                            <button
                                type="button"
                                onClick={() => handleToggleAttendance(item)}
                                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs font-extrabold transition-all shadow-sm cursor-pointer ${
                                    item.is_attended
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-400'
                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={item.is_attended}
                                    onChange={() => {}}
                                    className="h-4 w-4 rounded accent-emerald-600 pointer-events-none"
                                />
                                <span>{item.is_attended ? '✓ Attended (Tik)' : '✗ Not Attended (Untik)'}</span>
                            </button>
                        </TableCell>
                        <TableCell className="text-center">
                            {item.is_attended ? (
                                <Badge className="bg-emerald-600 font-bold gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Attended
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="font-bold gap-1 text-slate-500">
                                    <UserX className="h-3 w-3" /> Absent
                                </Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
                {items.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No {categoryTitle} users found matching your selected branch/department filter.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Training Management', href: '/training/dashboard' },
                { title: 'Attendance Roster List', href: '/training/attendance' },
            ]}
        >
            <Head title="Attendance Roster List" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
                {/* Header & Date Picker */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <UserCheck className="h-6 w-6 text-blue-700" /> Attendance Roster List
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Simple attendance checklist: Select a Branch or Department dropdown below to view and tick [✓] user attendance
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Calendar className="h-4 w-4 text-blue-600" /> Session Date:
                        </Label>
                        <Input
                            type="date"
                            value={sessionDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="h-9 w-44 font-mono font-bold text-xs bg-white dark:bg-slate-950 border-blue-300"
                        />
                    </div>
                </div>

                {/* Counter Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/20">
                        <CardHeader className="py-3 px-4 border-b border-blue-100 dark:border-blue-900 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-950 dark:text-blue-300">
                                <Building className="h-4 w-4 text-blue-700" /> 🏢 Branch Managers Roster
                            </CardTitle>
                            <Badge className="bg-blue-700 font-bold">{localBranchRoster.length} Branch Managers</Badge>
                        </CardHeader>
                        <CardContent className="p-4 flex items-center justify-around text-center">
                            <div>
                                <div className="text-2xl font-black text-emerald-600">
                                    {localBranchRoster.filter((b) => b.is_attended).length} / {localBranchRoster.length}
                                </div>
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">✓ Ticked (Attended)</div>
                            </div>
                            <div className="border-r h-8" />
                            <div>
                                <div className="text-2xl font-black text-slate-500">
                                    {localBranchRoster.filter((b) => !b.is_attended).length}
                                </div>
                                <div className="text-xs font-bold text-slate-500">✗ Unticked (Absent)</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/20">
                        <CardHeader className="py-3 px-4 border-b border-purple-100 dark:border-purple-900 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-purple-950 dark:text-purple-300">
                                <GraduationCap className="h-4 w-4 text-purple-700" /> 🎓 Head Office Departments Roster
                            </CardTitle>
                            <Badge className="bg-purple-700 font-bold">{localDeptRoster.length} HQ Departments</Badge>
                        </CardHeader>
                        <CardContent className="p-4 flex items-center justify-around text-center">
                            <div>
                                <div className="text-2xl font-black text-emerald-600">
                                    {localDeptRoster.filter((d) => d.is_attended).length} / {localDeptRoster.length}
                                </div>
                                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">✓ Ticked (Attended)</div>
                            </div>
                            <div className="border-r h-8" />
                            <div>
                                <div className="text-2xl font-black text-slate-500">
                                    {localDeptRoster.filter((d) => !d.is_attended).length}
                                </div>
                                <div className="text-xs font-bold text-slate-500">✗ Unticked (Absent)</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Controls Bar (Search + Branch Dropdown + Dept Dropdown) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search user name, branch, or department..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 text-xs h-9 bg-white dark:bg-slate-950 border-slate-300"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <Building className="h-3.5 w-3.5 text-blue-600" /> Select Branch:
                            </Label>
                            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                <SelectTrigger className="w-56 h-9 text-xs font-bold bg-white dark:bg-slate-950 border-blue-300">
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-bold">🏢 All Branches ({branches.length})</SelectItem>
                                    {branches.map((b) => (
                                        <SelectItem key={b.id} value={String(b.id)}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5 text-purple-600" /> Select Department:
                            </Label>
                            <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                                <SelectTrigger className="w-56 h-9 text-xs font-bold bg-white dark:bg-slate-950 border-purple-300">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="font-bold">🎓 All Departments ({departments.length})</SelectItem>
                                    {departments.map((d) => (
                                        <SelectItem key={d.id} value={String(d.id)}>
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Tabbed Roster Register Table */}
                <Card>
                    <CardHeader className="py-3 px-4 border-b">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-700" /> Full System Attendance Roster List
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <Tabs defaultValue="branches" className="space-y-4">
                            <TabsList className="bg-slate-100 dark:bg-slate-900 p-1">
                                <TabsTrigger value="branches" className="text-xs font-bold">
                                    🏢 Branch Users ({filteredBranchRoster.length})
                                </TabsTrigger>
                                <TabsTrigger value="departments" className="text-xs font-bold">
                                    🎓 Department Users ({filteredDeptRoster.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="branches" className="border rounded-lg overflow-hidden space-y-2">
                                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border-b flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                                        <Filter className="h-3.5 w-3.5 text-blue-600" />
                                        Showing users for: <span className="underline">{selectedBranchId === 'all' ? 'All Branches' : (branches.find(b => String(b.id) === selectedBranchId)?.name || 'Selected Branch')}</span>
                                    </span>
                                    {selectedBranchId !== 'all' && (
                                        <Badge variant="outline" className="cursor-pointer bg-white" onClick={() => setSelectedBranchId('all')}>
                                            Reset Branch Filter
                                        </Badge>
                                    )}
                                </div>
                                {renderRosterTable(filteredBranchRoster, 'Branch')}
                            </TabsContent>

                            <TabsContent value="departments" className="border rounded-lg overflow-hidden space-y-2">
                                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border-b flex items-center justify-between">
                                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                                        <Filter className="h-3.5 w-3.5 text-purple-600" />
                                        Showing users for: <span className="underline">{selectedDeptId === 'all' ? 'All Departments' : (departments.find(d => String(d.id) === selectedDeptId)?.name || 'Selected Department')}</span>
                                    </span>
                                    {selectedDeptId !== 'all' && (
                                        <Badge variant="outline" className="cursor-pointer bg-white" onClick={() => setSelectedDeptId('all')}>
                                            Reset Department Filter
                                        </Badge>
                                    )}
                                </div>
                                {renderRosterTable(filteredDeptRoster, 'Department')}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
