const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Logo from './Logo';
import { Button } from '@/components/ui/button';
import { LogOut, Library, Crown, Upload, LifeBuoy, Star, LayoutDashboard, MessageSquare, User, Bell } from 'lucide-react';
import { useAppAuth } from '@/lib/useAppAuth';

import NotificationBell from './NotificationBell';

export default function Layout({ children }) {
  const { isAdmin } = useAppAuth();
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleSignOut = () => {
    localStorage.removeItem('cadenceAdmin');
    if (user) {
      db.auth.logout('/');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo — goes to /library when logged in, NOT to start page */}
          <Link to="/library" className="flex items-center gap-2 group hover:opacity-70 transition-opacity">
            <Logo size="sm" />
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/library">
              <Button variant={isActive('/library') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                <Library size={13} /> Library
              </Button>
            </Link>
            <Link to="/forum">
              <Button variant={isActive('/forum') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                <MessageSquare size={13} /> Forum
              </Button>
            </Link>
            <Link to="/subscriptions">
              <Button variant={isActive('/subscriptions') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                <Crown size={13} /> Premium
              </Button>
            </Link>
            <Link to="/recommend">
              <Button variant={isActive('/recommend') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                <Star size={13} /> Recommend
              </Button>
            </Link>
            <Link to="/support">
              <Button variant={isActive('/support') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                <LifeBuoy size={13} /> Support
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/upload">
                <Button variant={isActive('/upload') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                  <Upload size={13} /> Upload
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin">
                <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                  <LayoutDashboard size={13} /> Admin
                </Button>
              </Link>
            )}
            <NotificationBell />
            <Link to="/profile">
              <Button variant={isActive('/profile') ? 'secondary' : 'ghost'} size="sm" className="gap-1.5 text-xs">
                <User size={13} /> Profile
              </Button>
            </Link>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1.5"
              onClick={handleSignOut}
            >
              <LogOut size={13} /> Sign out
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children ?? <Outlet />}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground space-y-2">
        <div>© 2026 Cadence. All rights reserved.</div>
        <div>
          <Link to="/legal" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Legal &amp; Rights Management
          </Link>
        </div>
      </footer>
    </div>
  );
}