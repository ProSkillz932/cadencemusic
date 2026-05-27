const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { useAppAuth } from '@/lib/useAppAuth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, LifeBuoy, Clock, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = { open: 'destructive', in_progress: 'secondary', closed: 'outline' };

export default function Support() {
  const { email: authEmail } = useAppAuth();
  const [form, setForm] = useState({ name: '', email: authEmail || '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('new');

  useEffect(() => { if (authEmail) setForm(f => ({ ...f, email: authEmail })); }, [authEmail]);

  const { data: myTickets = [] } = useQuery({
    queryKey: ['my-tickets', authEmail],
    queryFn: () => db.entities.SupportTicket.filter({ email: authEmail }, '-created_date'),
    enabled: !!authEmail,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await db.entities.SupportTicket.create({ ...form, status: 'open' });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <CheckCircle size={40} className="mx-auto text-foreground" strokeWidth={1.5} />
        <h2 className="text-xl font-medium">Ticket submitted</h2>
        <p className="text-sm text-muted-foreground">We'll get back to you at <strong>{form.email}</strong> as soon as possible.</p>
        <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setForm({ name: '', email: authEmail || '', subject: '', message: '' }); setTab('tickets'); }}>
          View my tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3">
        <LifeBuoy size={20} strokeWidth={1.5} />
        <div>
          <h1 className="text-2xl font-medium">Support</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Submit a ticket and our team will respond.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[['new', 'New Ticket'], ['tickets', `My Tickets (${myTickets.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-3 py-2 text-sm border-b-2 transition-colors ${tab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Subject *</Label>
            <Input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief description of your issue" />
          </div>
          <div className="space-y-1.5">
            <Label>Message *</Label>
            <Textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your issue in detail..." rows={5} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </form>
      )}

      {tab === 'tickets' && (
        <div className="space-y-3">
          {myTickets.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No tickets submitted yet.</div>
          ) : myTickets.map(t => (
            <div key={t.id} className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.created_date ? formatDistanceToNow(new Date(t.created_date), { addSuffix: true }) : ''}
                  </div>
                </div>
                <Badge variant={STATUS_COLORS[t.status] || 'outline'} className="text-xs shrink-0">{t.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
              {t.admin_response && (
                <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs space-y-1">
                  <div className="font-medium flex items-center gap-1"><MessageSquare size={10} /> Admin response</div>
                  <p className="text-muted-foreground">{t.admin_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}