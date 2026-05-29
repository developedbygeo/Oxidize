import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  Minimize2,
  Sparkles,
  Wand2,
  History,
  Workflow,
  Sun,
  Moon,
  FileVideo,
  Film,
  Crop,
  Music,
  Scissors,
  Keyboard,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { Page } from '@/pages/registry';

type NavItem = {
  id: Page;
  label: string;
  description: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type AppSidebarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenHelp: () => void;
};

const navGroups: NavGroup[] = [
  {
    label: 'Image',
    items: [
      { id: 'convert', label: 'Convert', description: 'Change formats', icon: ArrowRightLeft },
      { id: 'compress', label: 'Compress', description: 'Reduce size', icon: Minimize2 },
      { id: 'beautify', label: 'Beautify', description: 'Enhance images', icon: Sparkles },
      { id: 'effects', label: 'Effects', description: 'Apply filters', icon: Wand2 },
      { id: 'pipeline', label: 'Pipeline', description: 'Chain operations', icon: Workflow },
    ],
  },
  {
    label: 'Video',
    items: [
      { id: 'video-convert', label: 'Convert', description: 'Change video format', icon: FileVideo },
      { id: 'video-compress', label: 'Compress', description: 'Shrink video files', icon: Film },
      { id: 'video-resize', label: 'Resize', description: 'Change dimensions', icon: Crop },
      { id: 'video-trim', label: 'Trim', description: 'Cut a portion out', icon: Scissors },
      { id: 'extract-audio', label: 'Extract audio', description: 'Pull audio from video', icon: Music },
    ],
  },
];

const footerItem: NavItem = {
  id: 'history',
  label: 'History',
  description: 'View past operations',
  icon: History,
};

const AppSidebar = ({ currentPage, onNavigate, onOpenHelp }: AppSidebarProps) => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const renderItem = (item: NavItem) => {
    const isActive = currentPage === item.id;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => onNavigate(item.id)}
          isActive={isActive}
          tooltip={item.label}
          size="default"
          className={cn(
            'relative transition-colors duration-150 rounded-md h-9',
            'group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <item.icon
            className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : '')}
            strokeWidth={1.75}
          />
          <span
            className={cn(
              'text-sm group-data-[collapsible=icon]:hidden',
              isActive ? 'font-medium' : ''
            )}
          >
            {item.label}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4 pb-3 group-data-[collapsible=icon]:p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center animate-fade-in">
          <div className="relative shrink-0">
            <img src="/logo.png" alt="Oxidize" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm tracking-tight text-foreground">Oxidize</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Media Studio</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1.5">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-2 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
                {group.items.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
              {renderItem(footerItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2 space-y-0.5">
        <button
          onClick={onOpenHelp}
          title="Keyboard shortcuts (Ctrl + /)"
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5'
          )}
        >
          <Keyboard className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="text-sm group-data-[collapsible=icon]:hidden">Shortcuts</span>
        </button>
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5'
          )}
        >
          {isDark ? (
            <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          )}
          <span className="text-sm group-data-[collapsible=icon]:hidden">
            {isDark ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
};

AppSidebar.displayName = 'AppSidebar';

export { AppSidebar };
