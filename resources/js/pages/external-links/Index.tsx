import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type ExternalLinkSection, type PageProps } from '@/types';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import * as Icons from 'lucide-react';
import { ExternalLink, Link2, Pencil, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type SectionFormPayload = {
    label: string;
    icon: string;
    sort: number;
    is_active: boolean;
};

type LinkFormPayload = {
    external_link_section_id: number | '';
    title: string;
    href: string;
    icon: string;
    permission: string;
    is_external: boolean;
    is_active: boolean;
    sort: number;
};

type SectionWithLinks = ExternalLinkSection & {
    id: number;
    sort?: number;
    is_active?: boolean;
    links?: any[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'External Links', href: '/external-links' },
];

const iconLookup = Icons as Record<string, LucideIcon | undefined>;
const getIcon = (name?: string | null): LucideIcon => {
    if (!name) return Link2;
    return iconLookup[name] ?? Link2;
};

export default function ExternalLinksIndex() {
    const { props } = usePage<PageProps<{ sections: SectionWithLinks[] }>>();
    const sections = useMemo(() => props.sections ?? [], [props.sections]);

    // Section form
    const sectionForm = useForm<SectionFormPayload>({
        label: '',
        icon: '',
        sort: 0,
        is_active: true,
    });
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);

    // Link form
    const linkForm = useForm<LinkFormPayload>({
        external_link_section_id: sections[0]?.id ?? '',
        title: '',
        href: '',
        icon: 'ExternalLink',
        permission: '',
        is_external: true,
        is_active: true,
        sort: 0,
    });
    const [editingLinkId, setEditingLinkId] = useState<number | null>(null);

    useEffect(() => {
        if (!linkForm.data.external_link_section_id && sections.length > 0) {
            linkForm.setData('external_link_section_id', sections[0].id as number);
        }
    }, [sections]);

    const submitSection = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSectionId) {
            sectionForm.put(`/external-link-sections/${editingSectionId}`, {
                onSuccess: () => {
                    sectionForm.reset();
                    setEditingSectionId(null);
                },
            });
        } else {
            sectionForm.post('/external-link-sections', {
                onSuccess: () => sectionForm.reset(),
            });
        }
    };

    const submitLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLinkId) {
            linkForm.put(`/external-links/${editingLinkId}`, {
                onSuccess: () => {
                    resetLinkForm();
                },
            });
        } else {
            linkForm.post('/external-links', {
                onSuccess: () => resetLinkForm(),
            });
        }
    };

    const resetLinkForm = () => {
        linkForm.reset();
        linkForm.setData({
            external_link_section_id: sections[0]?.id ?? '',
            title: '',
            href: '',
            icon: '',
            permission: '',
            target: '_blank',
            rel: 'noreferrer noopener',
            is_external: true,
            is_active: true,
            sort: 0,
        });
        setEditingLinkId(null);
    };

    const startEditSection = (section: SectionWithLinks) => {
        setEditingSectionId(section.id);
        sectionForm.setData({
            label: section.label,
            icon: section.icon ?? '',
            sort: section.sort ?? 0,
            is_active: !!section.is_active,
        });
    };

    const startEditLink = (link: any) => {
        setEditingLinkId(link.id);
        linkForm.setData({
            external_link_section_id: link.external_link_section_id,
            title: link.title,
            href: link.href,
            icon: link.icon ?? '',
            permission: link.permission ?? '',
            is_external: !!link.is_external,
            is_active: !!link.is_active,
            sort: link.sort ?? 0,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="External Links" />
            <div className="flex flex-col gap-4 p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{editingSectionId ? 'Edit Section' : 'Add Section'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitSection} className="space-y-3">
                                <div>
                                    <Label htmlFor="section-label">Label</Label>
                                    <Input
                                        id="section-label"
                                        value={sectionForm.data.label}
                                        onChange={(e) => sectionForm.setData('label', e.target.value)}
                                        aria-invalid={!!sectionForm.errors.label}
                                    />
                                    <InputError message={sectionForm.errors.label} />
                                </div>
                                <div>
                                    <Label htmlFor="section-icon">Icon (Lucide name, optional)</Label>
                                    <Input
                                        id="section-icon"
                                        value={sectionForm.data.icon}
                                        onChange={(e) => sectionForm.setData('icon', e.target.value)}
                                        aria-invalid={!!sectionForm.errors.icon}
                                    />
                                    <InputError message={sectionForm.errors.icon} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <Label htmlFor="section-sort">Sort</Label>
                                        <Input
                                            id="section-sort"
                                            type="number"
                                            value={sectionForm.data.sort}
                                            onChange={(e) => sectionForm.setData('sort', Number(e.target.value))}
                                        />
                                        <InputError message={sectionForm.errors.sort} />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <Switch
                                            id="section-active"
                                            checked={sectionForm.data.is_active}
                                            onCheckedChange={(checked) => sectionForm.setData('is_active', checked)}
                                        />
                                        <Label htmlFor="section-active">Active</Label>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={sectionForm.processing}>
                                        {editingSectionId ? 'Update Section' : 'Create Section'}
                                    </Button>
                                    {editingSectionId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                sectionForm.reset();
                                                setEditingSectionId(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{editingLinkId ? 'Edit Link' : 'Add Link'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitLink} className="space-y-3">
                                <div>
                                    <Label htmlFor="link-section">Section</Label>
                                    <select
                                        id="link-section"
                                        className="w-full rounded-md border px-3 py-2"
                                        value={linkForm.data.external_link_section_id}
                                        onChange={(e) =>
                                            linkForm.setData(
                                                'external_link_section_id',
                                                e.target.value ? Number(e.target.value) : ''
                                            )
                                        }
                                    >
                                        <option value="">Select section</option>
                                        {sections.map((section) => (
                                            <option key={section.id} value={section.id}>
                                                {section.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={linkForm.errors.external_link_section_id as any} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="link-title">Title</Label>
                                        <Input
                                            id="link-title"
                                            value={linkForm.data.title}
                                            onChange={(e) => linkForm.setData('title', e.target.value)}
                                            aria-invalid={!!linkForm.errors.title}
                                        />
                                        <InputError message={linkForm.errors.title} />
                                    </div>
                                    <div>
                                        <Label htmlFor="link-icon">Icon (Lucide name)</Label>
                                        <Input
                                            id="link-icon"
                                            value={linkForm.data.icon}
                                            onChange={(e) => linkForm.setData('icon', e.target.value)}
                                            aria-invalid={!!linkForm.errors.icon}
                                        />
                                        <InputError message={linkForm.errors.icon} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="link-href">URL</Label>
                                    <Input
                                        id="link-href"
                                        value={linkForm.data.href}
                                        onChange={(e) => linkForm.setData('href', e.target.value)}
                                        aria-invalid={!!linkForm.errors.href}
                                        placeholder="https://..."
                                    />
                                    <InputError message={linkForm.errors.href} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="link-permission">Permission (optional)</Label>
                                        <Input
                                            id="link-permission"
                                            value={linkForm.data.permission}
                                            onChange={(e) => linkForm.setData('permission', e.target.value)}
                                            aria-invalid={!!linkForm.errors.permission}
                                            placeholder="e.g. view dashboard"
                                        />
                                        <InputError message={linkForm.errors.permission} />
                                    </div>
                                    <div className="flex items-end text-xs text-neutral-500">
                                        Opens in a new tab with safe defaults.
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 items-center">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="link-external"
                                            checked={linkForm.data.is_external}
                                            onCheckedChange={(checked) => linkForm.setData('is_external', checked)}
                                        />
                                        <Label htmlFor="link-external">Open externally</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            id="link-active"
                                            checked={linkForm.data.is_active}
                                            onCheckedChange={(checked) => linkForm.setData('is_active', checked)}
                                        />
                                        <Label htmlFor="link-active">Active</Label>
                                    </div>
                                    <div>
                                        <Label htmlFor="link-sort">Sort</Label>
                                        <Input
                                            id="link-sort"
                                            type="number"
                                            value={linkForm.data.sort}
                                            onChange={(e) => linkForm.setData('sort', Number(e.target.value))}
                                        />
                                        <InputError message={linkForm.errors.sort} />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={linkForm.processing}>
                                        {editingLinkId ? 'Update Link' : 'Create Link'}
                                    </Button>
                                    {editingLinkId && (
                                        <Button type="button" variant="ghost" onClick={resetLinkForm}>
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing Links</CardTitle>
                        <CardDescription>Quickly scan sections, statuses, and destinations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sections.length === 0 && <p className="text-sm text-neutral-500">No sections yet.</p>}
                        <div className="grid gap-3">
                            {sections.map((section) => {
                                const SectionIcon = getIcon(section.icon);
                                return (
                                    <div
                                        key={section.id}
                                        className="rounded-2xl border border-neutral-200 bg-gradient-to-r from-slate-50 via-white to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <SectionIcon className="h-5 w-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Section</p>
                                                    <p className="text-lg font-semibold leading-tight">{section.label}</p>
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                section.is_active
                                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                                                            }
                                                        >
                                                            {section.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                        <Badge variant="outline" className="border-neutral-200 bg-white text-neutral-600">
                                                            Sort {section.sort ?? 0}
                                                        </Badge>
                                                        {section.links?.length ? (
                                                            <Badge variant="secondary" className="border-transparent bg-primary/10 text-primary">
                                                                {section.links.length} link{section.links.length > 1 ? 's' : ''}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="border-dashed text-neutral-500">
                                                                Empty
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" className="gap-2" onClick={() => startEditSection(section)}>
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="gap-2 text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        if (confirm('Delete this section and its links?')) {
                                                            router.delete(`/external-link-sections/${section.id}`);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>

                                        {section.links && section.links.length > 0 ? (
                                            <div className="mt-3 space-y-2">
                                                {(section.links as any[])?.map((link: any) => {
                                                    const LinkIcon = getIcon(link.icon);
                                                    return (
                                                        <div
                                                            key={link.id}
                                                            className="group rounded-xl border border-neutral-200 bg-white/80 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex gap-3">
                                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                        <LinkIcon className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <p className="font-semibold leading-tight">{link.title}</p>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={
                                                                                    link.is_active
                                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                                        : 'border-rose-200 bg-rose-50 text-rose-700'
                                                                                }
                                                                            >
                                                                                {link.is_active ? 'Active' : 'Inactive'}
                                                                            </Badge>
                                                                            {link.permission ? (
                                                                                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                                                                                    <ShieldCheck className="h-3 w-3" />
                                                                                    {link.permission}
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="border-neutral-200 bg-neutral-50 text-neutral-700">
                                                                                    Public
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <a
                                                                            href={link.href}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline decoration-dotted underline-offset-4"
                                                                        >
                                                                            {link.href}
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <Link2 className="h-3.5 w-3.5" />
                                                                                {link.is_external ? 'Opens in new tab' : 'Internal link'}
                                                                            </span>
                                                                            <span className="inline-flex items-center gap-1">
                                                                                Sort {link.sort ?? 0}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-9 w-9"
                                                                        onClick={() => startEditLink(link)}
                                                                        aria-label={`Edit ${link.title}`}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-9 w-9 text-destructive hover:text-destructive"
                                                                        onClick={() => {
                                                                            if (confirm('Delete this link?')) {
                                                                                router.delete(`/external-links/${link.id}`);
                                                                            }
                                                                        }}
                                                                        aria-label={`Delete ${link.title}`}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-white/60 p-3 text-xs text-neutral-500">
                                                No links in this section yet.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
