import {
  SidebarGroup,
  SidebarGroupLabel,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useEffect } from 'react';

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

  // Backwards compatibility: if sections not provided, render flat items under a default section
  const sectionsToRender: NavSection[] = sections.length
    ? sections
    : [{ label: 'Platform', items }];

  return (
    <>
      {sectionsToRender.map((section) => {
        // Filter items by permission
        const filterItems = (itemsToFilter: NavItem[]) =>
          itemsToFilter.filter((item) => {
            const permission = item.permission ?? '';
            if (!permission) return true;
            const perms = permission.split('|').map((p) => p.trim()).filter(Boolean);
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
    </>
  );
}

function NavSection({
  section,
  visibleItems,
  visibleGroups,
}: {
  section: NavSection;
  visibleItems: NavItem[];
  visibleGroups: NavSection['groups'];
}) {
  const page = usePage();
  const storageKey = `sidebar-section-${section.label}`;
  
  // Get initial state from localStorage, default to false (collapsed)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(storageKey);
    return stored === 'true';
  });

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
                          isActive={!isExternalLink && page.url.startsWith(href)}
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
                <div className="space-y-1 pt-1">
                  {visibleGroups.map((group) => (
                    <div key={`${section.label}-${group.label}`}>
                      <div className="px-3 pb-1 pt-2 text-xs font-semibold text-sidebar-foreground/70 flex items-center gap-2">
                        {group.icon && <group.icon className="h-4 w-4" />}
                        <span>{group.label}</span>
                      </div>
                      <SidebarMenuSub>
                        {group.items.map((item) => {
                          const href = item.href ?? '';
                          const isExternalLink = item.external ?? /^https?:\/\//.test(href);
                          const target = item.target ?? (isExternalLink ? '_blank' : undefined);
                          const rel = item.rel ?? (isExternalLink ? 'noreferrer noopener' : undefined);
                          return (
                            <SidebarMenuSubItem key={`${section.label}-${group.label}-${item.title}`}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={!isExternalLink && page.url.startsWith(href)}
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
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
