import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { usePermission } from '@/hooks/user-permissions';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState, createContext, useContext } from 'react';

const ActiveHrefContext = createContext<string | null>(null);

export type NavSection = {
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
	iconName?: string | null;
	items: NavItem[];
	groups?: {
		label: string;
		icon?: React.ComponentType<{ className?: string }>;
		items: NavItem[];
	}[];
};

export function NavMain({ sections = [] as NavSection[], items = [] as NavItem[] }: { sections?: NavSection[]; items?: NavItem[] }) {
	const { can } = usePermission();
	const page = usePage();

	// Backwards compatibility: if sections not provided, render flat items under a default section
	const sectionsToRender: NavSection[] = sections.length ? sections : [{ label: 'Platform', items }];

	const activeHref = useMemo(() => {
		const path = page.url.split('?')[0];
		let bestMatch = '';

		for (const section of sectionsToRender) {
			const itemsToSearch = [...(section.items || [])];
			if (section.groups) {
				for (const group of section.groups) {
					if (group.items) itemsToSearch.push(...group.items);
				}
			}

			for (const item of itemsToSearch) {
				const href = item.href;
				if (!href) continue;

				if (path === href) {
					return href;
				}

				if (path.startsWith(href + '/')) {
					if (href.length > bestMatch.length) {
						bestMatch = href;
					}
				}
			}
		}
		return bestMatch || null;
	}, [page.url, sectionsToRender]);

	return (
		<ActiveHrefContext.Provider value={activeHref}>
			{sectionsToRender.map((section) => {
				// Filter items by permission
				const filterItems = (itemsToFilter: NavItem[]) =>
					itemsToFilter.filter((item) => {
						const permission = item.permission ?? '';
						if (!permission) return true;
						const perms = permission
							.split('|')
							.map((p) => p.trim())
							.filter(Boolean);
						return perms.some((p) => can(p));
					});

				const visibleItems = filterItems(section.items ?? []);
				const visibleGroups =
					section.groups
						?.map((group) => ({
							...group,
							items: filterItems(group.items ?? []),
						}))
						.filter((group) => group.items.length > 0) ?? [];

				if (visibleItems.length === 0 && visibleGroups.length === 0) return null;

				return <NavSection key={section.label} section={section} visibleItems={visibleItems} visibleGroups={visibleGroups} />;
			})}
		</ActiveHrefContext.Provider>
	);
}

function NavSection({ section, visibleItems, visibleGroups }: { section: NavSection; visibleItems: NavItem[]; visibleGroups: NavSection['groups'] }) {
	const activeHref = useContext(ActiveHrefContext);
	const page = usePage();
	const storageKey = `sidebar-section-${section.label}`;

	const isSectionActive = useMemo(() => {
		const itemActive = visibleItems.some((item) => item.href && item.href === activeHref);
		const groupActive = visibleGroups?.some((group) => group.items.some((item) => item.href && item.href === activeHref)) ?? false;

		return itemActive || groupActive;
	}, [activeHref, visibleItems, visibleGroups]);

	const [isOpen, setIsOpen] = useState(() => {
		if (typeof window === 'undefined') return isSectionActive;
		const stored = localStorage.getItem(storageKey);
		if (stored !== null) return stored === 'true';
		return isSectionActive;
	});

	useEffect(() => {
		if (isSectionActive) {
			setIsOpen(true);
		}
	}, [isSectionActive]);

	// Persist state to localStorage when it changes
	useEffect(() => {
		localStorage.setItem(storageKey, String(isOpen));
	}, [isOpen, storageKey]);

	return (
		<SidebarGroup className="px-2 py-0">
			<SidebarMenu>
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
					<SidebarMenuItem>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton tooltip={section.label}>
								{section.icon && <section.icon />}
								<span className="font-semibold">{section.label}</span>
								<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
							</SidebarMenuButton>
						</CollapsibleTrigger>
						<CollapsibleContent>
							{visibleItems.length > 0 && (
								<SidebarMenuSub>
									{visibleItems.map((item) => {
										const href = item.href ?? '';
										const isExternalLink = item.external ?? /^https?:\/\//.test(href);
										const target = item.target ?? (isExternalLink ? '_blank' : undefined);
										const rel = item.rel ?? (isExternalLink ? 'noreferrer noopener' : undefined);
										return (
											<SidebarMenuSubItem key={`${section.label}-${item.title}`}>
												<SidebarMenuSubButton
													asChild
													isActive={!isExternalLink && item.href === activeHref}
													tooltip={item.title}
												>
													{isExternalLink ? (
														<a href={href} target={target} rel={rel}>
															{item.icon && <item.icon />}
															<span>{item.title}</span>
															<ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
														</a>
													) : (
														<Link href={href} prefetch>
															{item.icon && <item.icon />}
															<span>{item.title}</span>
														</Link>
													)}
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										);
									})}
								</SidebarMenuSub>
							)}

							{visibleGroups && visibleGroups.length > 0 && (
								<SidebarMenuSub>
									{visibleGroups.map((group) => (
										<NavGroup key={`${section.label}-${group.label}`} sectionLabel={section.label} group={group} />
									))}
								</SidebarMenuSub>
							)}
						</CollapsibleContent>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>
		</SidebarGroup>
	);
}

type NavGroupData = NonNullable<NavSection['groups']>[number];

function NavGroup({ sectionLabel, group }: { sectionLabel: string; group: NavGroupData }) {
	const activeHref = useContext(ActiveHrefContext);
	const storageKey = `sidebar-group-${sectionLabel}-${group.label}`;

	const isGroupActive = useMemo(() => group.items.some((item) => item.href && item.href === activeHref), [group.items, activeHref]);

	const [isOpen, setIsOpen] = useState(() => {
		if (typeof window === 'undefined') return isGroupActive;
		const stored = localStorage.getItem(storageKey);
		if (stored !== null) return stored === 'true';
		return isGroupActive;
	});

	useEffect(() => {
		if (isGroupActive) {
			setIsOpen(true);
		}
	}, [isGroupActive]);

	useEffect(() => {
		localStorage.setItem(storageKey, String(isOpen));
	}, [isOpen, storageKey]);

	return (
		<SidebarMenuSubItem>
			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/nested-collapsible">
				<CollapsibleTrigger asChild>
					<SidebarMenuSubButton tooltip={group.label} className="h-8">
						{group.icon && <group.icon className="shrink-0" />}
						<span className="min-w-0 flex-1 truncate font-semibold whitespace-nowrap">{group.label}</span>
						<ChevronRight className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/nested-collapsible:rotate-90" />
					</SidebarMenuSubButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{group.items.map((item) => {
							const href = item.href ?? '';
							const isExternalLink = item.external ?? /^https?:\/\//.test(href);
							const target = item.target ?? (isExternalLink ? '_blank' : undefined);
							const rel = item.rel ?? (isExternalLink ? 'noreferrer noopener' : undefined);

							return (
								<SidebarMenuSubItem key={`${sectionLabel}-${group.label}-${item.title}`}>
									<SidebarMenuSubButton asChild isActive={!isExternalLink && item.href === activeHref} tooltip={item.title}>
										{isExternalLink ? (
											<a href={href} target={target} rel={rel}>
												{item.icon && <item.icon />}
												<span>{item.title}</span>
												<ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
											</a>
										) : (
											<Link href={href} prefetch>
												{item.icon && <item.icon />}
												<span>{item.title}</span>
											</Link>
										)}
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							);
						})}
					</SidebarMenuSub>
				</CollapsibleContent>
			</Collapsible>
		</SidebarMenuSubItem>
	);
}
