import { motion } from 'motion/react';
import { ArrowRightLeft, Minimize2, Sparkles, Wand2, History } from 'lucide-react';
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

type Page = 'convert' | 'compress' | 'beautify' | 'effects' | 'history';

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
    id: 'history' as const,
    label: 'History',
    description: 'View past operations',
    icon: History,
  },
];

const AppSidebar = ({ currentPage, onNavigate }: AppSidebarProps) => {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="p-5 pb-4 group-data-[collapsible=icon]:p-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
        >
          <div className="relative shrink-0">
            <motion.div
              className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-xl"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <img src="/logo.png" alt="Oxidize" className="relative w-10 h-10 rounded-full drop-shadow-lg" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-xl tracking-tight text-foreground">Oxidize</span>
            <span className="text-xs text-muted-foreground font-medium -mt-0.5">Image Studio</span>
          </div>
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="px-3 group-data-[collapsible=icon]:px-1.5">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3 group-data-[collapsible=icon]:items-center">
              {navItems.map((item, index) => {
                const isActive = currentPage === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, duration: 0.4, ease: 'easeOut' }}
                    >
                      <SidebarMenuButton
                        onClick={() => onNavigate(item.id)}
                        isActive={isActive}
                        tooltip={item.label}
                        size="lg"
                        className={cn(
                          'relative overflow-hidden transition-all duration-300 rounded-xl h-auto py-3',
                          'group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center',
                          isActive
                            ? 'bg-foreground shadow-lg shadow-foreground/25'
                            : 'hover:bg-sidebar-accent'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute inset-0 bg-linear-to-r from-sidebar-primary/0 via-sidebar-primary/10 to-sidebar-primary/0"
                            initial={false}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <div
                          className={cn(
                            'p-2 rounded-lg transition-colors shrink-0',
                            'group-data-[collapsible=icon]:p-2.5',
                            isActive ? 'bg-background/15' : 'bg-sidebar-accent'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'w-3 h-3 transition-colors',
                              'group-data-[collapsible=icon]:w-5 group-data-[collapsible=icon]:h-5',
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                          <span
                            className={cn(
                              'font-semibold text-sm',
                              isActive ? 'text-primary' : 'text-sidebar-foreground'
                            )}
                          >
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              'text-xs leading-tight',
                              isActive ? 'text-primary/70' : 'text-muted-foreground'
                            )}
                          >
                            {item.description}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="group-data-[collapsible=icon]:hidden"
        >
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Powered by <span className="font-semibold text-foreground">Rust</span> &{' '}
              <span className="font-semibold text-foreground">React</span>
            </p>
          </div>
        </motion.div>
      </SidebarFooter>
    </Sidebar>
  );
};

AppSidebar.displayName = 'AppSidebar';

export { AppSidebar };
export type { Page };
