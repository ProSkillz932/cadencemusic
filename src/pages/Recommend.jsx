const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppAuth } from '@/lib/useAppAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Crown, CheckCircle, Clock, XCircle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_ICONS = { pending: Clock, added: CheckCircle, declined: XCircle };
const STATUS_COLORS = { pending: 'secondary', added: 'default', declined: 'destructive' };

export default function Recommend() {
  const { email, isAdmin } = useAppAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', composer: '', notes: '' });

  const { data: subs = [] } = useQuery({
    queryKey: ['subscription', email],
    queryFn: () => db.entities.Subscription.filter({ user_email: email, status: 'active' }),
    enabled: !!email && !isAdmin,
  });
  const isPremium = subs.length > 0 || isAdmin;

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ['recommendations', email],
    queryFn: () => db.entities.Recommendation.filter({ user_email: email }, '-created_date'),
    enabled: !!email,
  });

  const submit = useMutation({
    mutationFn: (data) => db.entities.Recommendation.create({ ...data, user_email: email, status: 'pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', email] });
      setForm({ title: '', composer: '', notes: '' });
      toast.success('Recommendation submitted!');
    },
  });

  return (
    <div className="relative max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Premium gate overlay */}
      {!isPremium && (
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background border border-border rounded-xl shadow-lg p-8 max-w-sm mx-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Lock size={20} className="text-muted-foreground" />
              </div>
              <h2 className="text-lg font-medium">Premium Feature</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Recommending sheets to be added to the Cadence library is a Premium exclusive. Upgrade for free during beta.
              </p>
              <Link to="/subscriptions">
                <Button className="gap-2 w-full">
                  <Crown size={14} /> Unlock Premium — Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-medium">Recommend a Sheet</h1>
        <p className="text-sm text-muted-foreground mt-1">Suggest music you'd like to see added to the Cadence library.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); if (isPremium) submit.mutate(form); }} className="space-y-4 border border-border rounded-lg p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Clair de Lune" />
          </div>
          <div className="space-y-1.5">
            <Label>Composer</Label>
            <Input value={form.composer} onChange={e => setForm(f => ({ ...f, composer: e.target.value }))} placeholder="e.g. Debussy" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional context..." rows={3} />
        </div>
        <Button type="submit" disabled={submit.isPending || !isPremium}>
          {submit.isPending ? 'Submitting...' : 'Submit Recommendation'}
        </Button>
      </form>

      {recs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Recommendations</h2>
          <div className="space-y-2">
            {recs.map(rec => {
              const Icon = STATUS_ICONS[rec.status] || Clock;
              return (
                <div key={rec.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{rec.title}</div>
                    {rec.composer && <div className="text-xs text-muted-foreground">{rec.composer}</div>}
                    {rec.admin_response && (
                      <div className="text-xs text-muted-foreground mt-1 italic">Response: {rec.admin_response}</div>
                    )}
                  </div>
                  <Badge variant={STATUS_COLORS[rec.status] || 'secondary'} className="gap-1 text-xs">
                    <Icon size={10} /> {rec.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}