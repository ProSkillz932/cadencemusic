const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { useAppAuth } from '@/lib/useAppAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Eye, Download, Zap, Users, Star } from 'lucide-react';
import { toast } from 'sonner';

export default function Subscriptions() {
  const { user } = useAuth();
  const { isAdmin, email } = useAppAuth();
  const qc = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['subscription', email],
    queryFn: () => db.entities.Subscription.filter({ user_email: email }),
    enabled: !!email,
  });

  const activeSub = subs.find(s => s.status === 'active');

  const subscribe = useMutation({
    mutationFn: async () => {
      // Cancel any old subs first
      const existing = subs.filter(s => s.status !== 'active');
      for (const s of existing) {
        await db.entities.Subscription.delete(s.id);
      }
      return db.entities.Subscription.create({ user_email: email, plan: 'free_premium', status: 'active' });
    },
    onSuccess: async (newSub) => {
      // Also mark profile as premium
      const profiles = await db.entities.UserProfile.filter({ user_email: email });
      if (profiles[0]) {
        await db.entities.UserProfile.update(profiles[0].id, { is_premium: true });
      }
      qc.invalidateQueries({ queryKey: ['subscription', email] });
      qc.invalidateQueries({ queryKey: ['profile', email] });
      toast.success('Premium activated!');
    },
  });

  const cancel = useMutation({
    mutationFn: () => db.entities.Subscription.update(activeSub.id, { status: 'cancelled' }),
    onSuccess: async () => {
      // Update profile
      const profiles = await db.entities.UserProfile.filter({ user_email: email });
      if (profiles[0]) {
        await db.entities.UserProfile.update(profiles[0].id, { is_premium: false });
      }
      qc.invalidateQueries({ queryKey: ['subscription', email] });
      qc.invalidateQueries({ queryKey: ['profile', email] });
      toast.success('Subscription cancelled');
    },
  });

  const features = [
    { icon: Eye, label: 'View all sheet music instantly, no ads' },
    { icon: Download, label: 'Download sheet music as PDF files' },
    { icon: Zap, label: 'Skip all ads — instant access' },
    { icon: Users, label: 'Create and manage communities' },
    { icon: Star, label: 'Recommend sheets to be added to the library' },
  ];

  if (isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <Crown size={32} className="mx-auto" strokeWidth={1.5} />
        <h1 className="text-2xl font-medium">Premium</h1>
        <p className="text-sm text-muted-foreground">As an admin, you have all premium perks automatically.</p>
        <Badge className="bg-foreground text-background">Admin — Full Access</Badge>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 space-y-8">
      <div className="text-center space-y-2">
        <Crown size={32} className="mx-auto" strokeWidth={1.5} />
        <h1 className="text-2xl font-medium">Premium</h1>
        <p className="text-sm text-muted-foreground">Unlimited access to the entire Cadence library</p>
      </div>

      <div className="border border-border rounded-lg p-6 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-light">$0</div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Free during beta</p>
        </div>

        <div className="space-y-3">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon size={12} />
              </div>
              {label}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeSub ? (
          <div className="space-y-3 text-center">
            <Badge className="bg-foreground text-background">Active</Badge>
            <p className="text-xs text-muted-foreground">You have premium access</p>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelling...' : 'Cancel subscription'}
            </Button>
          </div>
        ) : (
          <Button className="w-full gap-2" onClick={() => subscribe.mutate()} disabled={subscribe.isPending}>
            <Check size={14} />
            {subscribe.isPending ? 'Activating...' : 'Activate Premium — Free'}
          </Button>
        )}
      </div>
    </div>
  );
}