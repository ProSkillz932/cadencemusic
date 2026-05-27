const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';

import { useAppAuth } from '@/lib/useAppAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { email } = useAppAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', email],
    queryFn: () => db.entities.Notification.filter({ user_email: email }, '-created_date', 30),
    enabled: !!email,
    refetchInterval: 15000,
  });

  const unread = notifications.filter(n => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: (id) => db.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', email] }),
  });

  const markAllRead = async () => {
    const unreadItems = notifications.filter(n => !n.is_read);
    for (const n of unreadItems) {
      await db.entities.Notification.update(n.id, { is_read: true });
    }
    qc.invalidateQueries({ queryKey: ['notifications', email] });
  };

  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (!email) return null;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="relative gap-1.5 text-xs"
        onClick={() => setOpen(o => !o)}
      >
        <Bell size={13} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground text-background rounded-full text-[9px] flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${!n.is_read ? 'bg-muted/20' : ''}`}
                onClick={() => { if (!n.is_read) markRead.mutate(n.id); setOpen(false); }}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1.5 shrink-0" />}
                  <div className={`flex-1 ${n.is_read ? 'ml-3.5' : ''}`}>
                    <div className="text-xs font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}