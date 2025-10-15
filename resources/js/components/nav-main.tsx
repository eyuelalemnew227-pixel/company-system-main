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
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState, useEffect } from 'react';

export type NavSection = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

export function NavMain({ sections = [] as NavSection[], items = [] as NavItem[] }: { sections?: NavSection[]; items?: NavItem[] }) {
  const page = usePage();
  const { can } = usePermission();

  // Backwards compatibility: if sections not provided, render flat items under a default section
  const sectionsToRender: NavSection[] = sections.length
    ? sections
    : [{ label: 'Platform', items }];

  return (
    <>
      {sectionsToRender.map((section) => {
        // Filter items by permission
        const visibleItems = section.items.filter((item) => {
          const permission = item.permission ?? '';
          return can(permission);
        });

        if (visibleItems.length === 0) return null;

        return <NavSection key={section.label} section={section} visibleItems={visibleItems} />;
      })}
    </>
  );
}

function NavSection({ section, visibleItems }: { section: NavSection; visibleItems: NavItem[] }) {
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
              <SidebarMenuSub>
                {visibleItems.map((item) => {
                  const href = item.href ?? '';
                  return (
                    <SidebarMenuSubItem key={`${section.label}-${item.title}`}>
                      <SidebarMenuSubButton asChild isActive={page.url.startsWith(href)} tooltip={item.title}>
                        <Link href={href} prefetch>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}
