import { useState, useEffect } from 'react';
import { ArrowRightLeft, Minimize2, Sparkles, Wand2, History, Workflow, Sun, Moon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

type Page = 'convert' | 'compress' | 'beautify' | 'effects' | 'pipeline' | 'history';

type AppSidebarProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
};

const navItems = [
  {
    id: 'convert' as const,
    label: 'Convert',
    description: 'Change formats',
    icon: ArrowRightLeft,
  },
  {
    id: 'compress' as const,
    label: 'Compress',
    description: 'Reduce size',
    icon: Minimize2,
  },
  {
    id: 'beautify' as const,
    label: 'Beautify',
    description: 'Enhance images',
    icon: Sparkles,
  },
  {
    id: 'effects' as const,
    label: 'Effects',
    description: 'Apply filters',
    icon: Wand2,
  },
  {
    id: 'pipeline' as const,
    label: 'Pipeline',
    description: 'Chain operations',
    icon: Workflow,
  },
  {
    id: 'history' as const,
    label: 'History',
    description: 'View past operations',
    icon: History,
  },
];

const AppSidebar = ({ currentPage, onNavigate }: AppSidebarProps) => {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-4 pb-3 group-data-[collapsible=icon]:p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center animate-fade-in">
          <div className="relative shrink-0">
            <img src="/logo.png" alt="Oxidize" className="w-8 h-8 rounded-lg" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm tracking-tight text-foreground">Oxidize</span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">Image Studio</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1.5">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
              {navItems.map((item) => {
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
                        className={cn(
                          'w-4 h-4 shrink-0',
                          isActive ? 'text-primary' : ''
                        )}
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
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
export type { Page };
