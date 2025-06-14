import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Users, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/vendor/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Products',
      href: '/vendor/products',
      icon: Package,
      badge: null,
    },
    {
      name: 'Orders',
      href: '/vendor/orders',
      icon: ShoppingCart,
      badge: '3',
    },
    {
      name: 'Analytics',
      href: '/vendor/analytics',
      icon: BarChart3,
      badge: null,
    },
    {
      name: 'Customers',
      href: '/vendor/customers',
      icon: Users,
      badge: null,
    },
    {
      name: 'Reports',
      href: '/vendor/reports',
      icon: FileText,
      badge: null,
    },
    {
      name: 'Settings',
      href: '/vendor/settings',
      icon: Settings,
      badge: null,
    },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className={`bg-background border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex flex-col h-full`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">LF</span>
              </div>
              <div>
                <h2 className="font-semibold text-sm">Vendor Portal</h2>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <Button className="w-full justify-start" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-1">Need Help?</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Contact our vendor support team
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs">
              Get Support
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;