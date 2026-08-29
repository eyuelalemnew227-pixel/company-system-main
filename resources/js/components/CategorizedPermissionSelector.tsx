import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPermissionLabel, groupPermissionsList } from '@/lib/permission-categories';
import { GroupedPermissions } from '@/types/role_permission';
import {
    Award,
    CheckSquare,
    ChevronDown,
    ChevronUp,
    DollarSign,
    FileText,
    Filter,
    GraduationCap,
    Package,
    PhoneCall,
    Search,
    Send,
    Settings,
    ShieldCheck,
    ShoppingBag,
    Square,
    Ticket,
    Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface CategorizedPermissionSelectorProps {
    allPermissions: string[];
    groupedPermissions?: GroupedPermissions;
    selectedPermissions: string[];
    onChange: (permissions: string[]) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Tickets & Support': <Ticket className="h-4 w-4 text-sky-500" />,
    'Memos & Documents': <FileText className="h-4 w-4 text-emerald-500" />,
    'Training & LMS': <GraduationCap className="h-4 w-4 text-indigo-500" />,
    'User & Organization': <Users className="h-4 w-4 text-blue-500" />,
    'Roles & Access Control': <ShieldCheck className="h-4 w-4 text-purple-500" />,
    'Budget & Finance': <DollarSign className="h-4 w-4 text-amber-500" />,
    'Inventory & Assets': <Package className="h-4 w-4 text-orange-500" />,
    'Evaluations & Performance': <Award className="h-4 w-4 text-pink-500" />,
    'Pre-Orders & Sales': <ShoppingBag className="h-4 w-4 text-rose-500" />,
    'Telecom & SMS': <PhoneCall className="h-4 w-4 text-teal-500" />,
    'Telegram Integration': <Send className="h-4 w-4 text-cyan-500" />,
    'System & General': <Settings className="h-4 w-4 text-slate-500" />,
};

export default function CategorizedPermissionSelector({
    allPermissions,
    groupedPermissions: serverGrouped,
    selectedPermissions,
    onChange,
}: CategorizedPermissionSelectorProps) {
    const [search, setSearch] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const categoryGroups = useMemo(() => {
        if (serverGrouped && Object.keys(serverGrouped).length > 0) {
            return serverGrouped;
        }
        return groupPermissionsList(allPermissions);
    }, [allPermissions, serverGrouped]);

    // Categories list
    const categories = useMemo(() => Object.keys(categoryGroups), [categoryGroups]);

    // Filter permissions by search query and category tab
    const filteredGroups = useMemo(() => {
        const result: GroupedPermissions = {};
        const query = search.trim().toLowerCase();

        categories.forEach((cat) => {
            if (activeCategoryFilter !== 'ALL' && activeCategoryFilter !== cat) {
                return;
            }

            const perms = categoryGroups[cat] || [];
            const matchingPerms = perms.filter((p) => {
                if (!query) return true;
                return p.toLowerCase().includes(query) || cat.toLowerCase().includes(query);
            });

            if (matchingPerms.length > 0) {
                result[cat] = matchingPerms;
            }
        });

        return result;
    }, [categoryGroups, categories, search, activeCategoryFilter]);

    const totalPermissionsCount = allPermissions.length;
    const selectedCount = selectedPermissions.length;

    // Toggle single permission
    const togglePermission = (perm: string) => {
        if (selectedPermissions.includes(perm)) {
            onChange(selectedPermissions.filter((p) => p !== perm));
        } else {
            onChange([...selectedPermissions, perm]);
        }
    };

    // Category specific select/deselect all
    const isCategoryFullySelected = (catPerms: string[]) => {
        return catPerms.every((p) => selectedPermissions.includes(p));
    };

    const isCategoryPartiallySelected = (catPerms: string[]) => {
        const count = catPerms.filter((p) => selectedPermissions.includes(p)).length;
        return count > 0 && count < catPerms.length;
    };

    const toggleCategory = (catPerms: string[]) => {
        if (isCategoryFullySelected(catPerms)) {
            // Remove all
            onChange(selectedPermissions.filter((p) => !catPerms.includes(p)));
        } else {
            // Add remaining
            const toAdd = catPerms.filter((p) => !selectedPermissions.includes(p));
            onChange([...selectedPermissions, ...toAdd]);
        }
    };

    // Global Select All / Deselect All
    const selectAllVisible = () => {
        const visiblePerms = Object.values(filteredGroups).flat();
        const combined = Array.from(new Set([...selectedPermissions, ...visiblePerms]));
        onChange(combined);
    };

    const deselectAllVisible = () => {
        const visiblePerms = Object.values(filteredGroups).flat();
        onChange(selectedPermissions.filter((p) => !visiblePerms.includes(p)));
    };

    const toggleCollapseCategory = (cat: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [cat]: !prev[cat],
        }));
    };

    const expandAll = () => setCollapsedCategories({});
    const collapseAll = () => {
        const next: Record<string, boolean> = {};
        categories.forEach((c) => (next[c] = true));
        setCollapsedCategories(next);
    };

    return (
        <div className="space-y-4">
            {/* Header Control Toolbar */}
            <div className="flex flex-col gap-3 rounded-lg border bg-slate-50/50 p-4 dark:bg-slate-900/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search permissions by name or category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-950"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={selectAllVisible}
                            className="h-9 gap-1 text-xs"
                        >
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                            Select All {search ? 'Filtered' : ''}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={deselectAllVisible}
                            className="h-9 gap-1 text-xs"
                        >
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                            Deselect All
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={Object.keys(collapsedCategories).length > 0 ? expandAll : collapseAll}
                            className="h-9 text-xs"
                        >
                            {Object.keys(collapsedCategories).length > 0 ? 'Expand All' : 'Collapse All'}
                        </Button>
                    </div>
                </div>

                {/* Category Pills / Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs scrollbar-none">
                    <span className="flex items-center gap-1 text-muted-foreground font-medium pr-1">
                        <Filter className="h-3.5 w-3.5" /> Filter:
                    </span>
                    <button
                        type="button"
                        onClick={() => setActiveCategoryFilter('ALL')}
                        className={`rounded-full px-3 py-1 font-medium transition-colors whitespace-nowrap ${
                            activeCategoryFilter === 'ALL'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                        All Modules ({totalPermissionsCount})
                    </button>

                    {categories.map((cat) => {
                        const count = categoryGroups[cat]?.length || 0;
                        const catSelected = categoryGroups[cat]?.filter((p) => selectedPermissions.includes(p)).length || 0;
                        const isActive = activeCategoryFilter === cat;

                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setActiveCategoryFilter(cat)}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors whitespace-nowrap ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-slate-200/70 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{cat}</span>
                                <span
                                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                        catSelected > 0
                                            ? isActive
                                                ? 'bg-white/30 text-white'
                                                : 'bg-primary/20 text-primary font-bold'
                                            : 'bg-slate-300/60 dark:bg-slate-700'
                                    }`}
                                >
                                    {catSelected}/{count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selection Overview Banner */}
            <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {selectedCount} of {totalPermissionsCount} permissions selected
                    </span>
                </div>
                <Badge variant={selectedCount > 0 ? 'default' : 'outline'}>
                    {Math.round((selectedCount / (totalPermissionsCount || 1)) * 100)}% Granted
                </Badge>
            </div>

            {/* Category Cards List */}
            {Object.keys(filteredGroups).length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">No permissions match your search filter</p>
                    <p className="text-xs">Try searching for a different keyword or resetting your module filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(filteredGroups).map(([cat, perms]) => {
                        const isCollapsed = !!collapsedCategories[cat];
                        const isFullySelected = isCategoryFullySelected(perms);
                        const isPartiallySelected = isCategoryPartiallySelected(perms);
                        const selectedInCat = perms.filter((p) => selectedPermissions.includes(p)).length;

                        return (
                            <Card key={cat} className="overflow-hidden border transition-all">
                                <CardHeader className="flex flex-row items-center justify-between bg-slate-100/70 p-3.5 dark:bg-slate-800/60">
                                    <div
                                        className="flex cursor-pointer items-center gap-2.5 select-none"
                                        onClick={() => toggleCollapseCategory(cat)}
                                    >
                                        {CATEGORY_ICONS[cat] || <ShieldCheck className="h-4 w-4 text-slate-500" />}
                                        <CardTitle className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                            {cat}
                                        </CardTitle>
                                        <Badge
                                            variant={isFullySelected ? 'default' : isPartiallySelected ? 'secondary' : 'outline'}
                                            className="ml-1 text-xs"
                                        >
                                            {selectedInCat} / {perms.length}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs font-medium"
                                            onClick={() => toggleCategory(perms)}
                                        >
                                            {isFullySelected ? (
                                                <>
                                                    <Square className="h-3.5 w-3.5 text-slate-400" />
                                                    Deselect Category
                                                </>
                                            ) : (
                                                <>
                                                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                                    Select All ({perms.length})
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => toggleCollapseCategory(cat)}
                                        >
                                            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </CardHeader>

                                {!isCollapsed && (
                                    <CardContent className="p-4 pt-3">
                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {perms.map((permission) => {
                                                const isChecked = selectedPermissions.includes(permission);
                                                return (
                                                    <div
                                                        key={permission}
                                                        onClick={() => togglePermission(permission)}
                                                        className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-all select-none ${
                                                            isChecked
                                                                ? 'border-primary/50 bg-primary/5 shadow-xs dark:bg-primary/10'
                                                                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900'
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            id={`perm-${permission}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => togglePermission(permission)}
                                                            className="mt-0.5"
                                                        />
                                                        <div className="grid gap-0.5 text-xs leading-tight">
                                                            <Label
                                                                htmlFor={`perm-${permission}`}
                                                                className="cursor-pointer font-medium text-slate-800 dark:text-slate-200"
                                                            >
                                                                {formatPermissionLabel(permission)}
                                                            </Label>
                                                            <span className="font-mono text-[10px] text-muted-foreground break-all">
                                                                {permission}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
