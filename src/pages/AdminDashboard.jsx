const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Megaphone, LifeBuoy, Star, Upload, Trash2, Check, Flag, Globe, ShieldAlert, RefreshCw, Bell, Crown, Ban, CheckCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const TABS = [
  { key: 'accounts', label: 'Accounts', icon: Users },
  { key: 'ads', label: 'Ads', icon: Megaphone },
  { key: 'tickets', label: 'Support', icon: LifeBuoy },
  { key: 'recommendations', label: 'Recommendations', icon: Star },
  { key: 'users', label: 'User Moderation', icon: Flag },
  { key: 'communities', label: 'Communities', icon: Globe },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

function Spinner() {
  return <div className="py-12 flex justify-center"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /></div>;
}

// --- Accounts Tab ---
function AccountsTab() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => db.entities.User.list('-created_date', 100),
  });
  const { data: subs = [] } = useQuery({
    queryKey: ['all-subs'],
    queryFn: () => db.entities.Subscription.filter({ status: 'active' }),
  });
  const subsMap = Object.fromEntries(subs.map(s => [s.user_email, s]));

  if (isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{users.length} registered account(s)</p>
      <div className="divide-y divide-border border border-border rounded-lg">
        {users.map(u => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">{u.full_name || '—'}</div>
                {subsMap[u.email] && <Crown size={12} className="text-foreground" title="Premium" />}
              </div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
              <div className="text-xs text-muted-foreground">
                Joined {u.created_date ? formatDistanceToNow(new Date(u.created_date), { addSuffix: true }) : '—'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{u.role || 'user'}</Badge>
              <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" title="Delete account" onClick={() => {
                if (confirm('Delete this account?')) db.entities.User.delete(u.id).then(() => qc.invalidateQueries({ queryKey: ['admin-users'] }));
              }}><Trash2 size={12} /></Button>
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No accounts found</div>}
      </div>
    </div>
  );
}

// --- Ads Tab ---
function AdsTab() {
  const qc = useQueryClient();
  const { data: ads = [], isLoading } = useQuery({ queryKey: ['ads'], queryFn: () => db.entities.Ad.list('-created_date') });
  const [form, setForm] = useState({ title: '', media_type: 'image' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const deleteAd = useMutation({
    mutationFn: (id) => db.entities.Ad.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a file');
    setUploading(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    await db.entities.Ad.create({ ...form, file_url });
    qc.invalidateQueries({ queryKey: ['ads'] });
    setForm({ title: '', media_type: 'image' });
    setFile(null);
    setUploading(false);
    toast.success('Ad uploaded!');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium">Upload New Ad</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ad title" />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.media_type} onValueChange={v => setForm(f => ({ ...f, media_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="border border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/30" onClick={() => document.getElementById('ad-file').click()}>
          <Upload size={16} className="mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">{file ? file.name : 'Click to select image or video file'}</p>
          <input id="ad-file" type="file" accept="image/*,video/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
        </div>
        <Button type="submit" size="sm" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Ad'}</Button>
      </form>

      {isLoading ? <Spinner /> : (
        <div className="divide-y divide-border border border-border rounded-lg">
          {ads.map(ad => (
            <div key={ad.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {ad.media_type === 'image' && ad.file_url && <img src={ad.file_url} alt={ad.title} className="w-12 h-8 object-cover rounded" />}
                {ad.media_type === 'video' && <div className="w-12 h-8 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">VIDEO</div>}
                <div>
                  <div className="text-sm font-medium">{ad.title}</div>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{ad.media_type}</Badge>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => deleteAd.mutate(ad.id)}>
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
          {ads.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No ads uploaded yet</div>}
        </div>
      )}
    </div>
  );
}

// --- Support Tab ---
function TicketsTab() {
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['tickets'], queryFn: () => db.entities.SupportTicket.list('-created_date', 100) });
  const [responses, setResponses] = useState({});
  const [expandedTicket, setExpandedTicket] = useState(null);

  const updateTicket = useMutation({
    mutationFn: ({ id, status, admin_response }) => db.entities.SupportTicket.update(id, { status, ...(admin_response !== undefined ? { admin_response } : {}) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      if (vars.admin_response !== undefined) toast.success('Response sent!');
      // Send notification to ticket submitter
      if (vars.admin_response) {
        const ticket = tickets.find(t => t.id === vars.id);
        if (ticket?.email) {
          db.entities.Notification.create({
            user_email: ticket.email,
            type: 'ticket_update',
            title: 'Support ticket update',
            body: vars.admin_response.slice(0, 100),
            from_email: 'admin@cadence.app',
          });
        }
      }
    },
  });

  const STATUS_COLORS = { open: 'destructive', in_progress: 'secondary', closed: 'outline' };

  if (isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{tickets.length} ticket(s)</p>
      <div className="divide-y divide-border border border-border rounded-lg">
        {tickets.map(t => (
          <div key={t.id} className="px-4 py-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <button className="text-left flex-1" onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}>
                <div className="text-sm font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">{t.email}{t.name ? ` · ${t.name}` : ''}</div>
              </button>
              <Select value={t.status} onValueChange={v => updateTicket.mutate({ id: t.id, status: v })}>
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {expandedTicket === t.id && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded p-3">{t.message}</p>
                {t.admin_response && (
                  <div className="text-xs bg-muted/50 rounded p-3">
                    <span className="font-medium">Admin response:</span> {t.admin_response}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Reply to this ticket</Label>
                  <Textarea
                    value={responses[t.id] || ''}
                    onChange={e => setResponses(r => ({ ...r, [t.id]: e.target.value }))}
                    placeholder="Type your response..."
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!responses[t.id]}
                    onClick={() => updateTicket.mutate({ id: t.id, status: t.status, admin_response: responses[t.id] })}
                  >
                    <MessageSquare size={12} /> Send Response
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No tickets yet</div>}
      </div>
    </div>
  );
}

// --- Recommendations Tab ---
function RecommendationsTab() {
  const qc = useQueryClient();
  const { data: recs = [], isLoading } = useQuery({ queryKey: ['all-recommendations'], queryFn: () => db.entities.Recommendation.list('-created_date', 100) });
  const [responses, setResponses] = useState({});

  const updateRec = useMutation({
    mutationFn: ({ id, status, admin_response }) => db.entities.Recommendation.update(id, { status, ...(admin_response !== undefined ? { admin_response } : {}) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['all-recommendations'] });
      // Notify user
      const rec = recs.find(r => r.id === vars.id);
      if (rec?.user_email) {
        db.entities.Notification.create({
          user_email: rec.user_email,
          type: 'recommendation_update',
          title: `Your recommendation was ${vars.status}`,
          body: vars.admin_response || `"${rec.title}" — status: ${vars.status}`,
          from_email: 'admin@cadence.app',
        });
      }
    },
  });

  if (isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{recs.length} recommendation(s)</p>
      <div className="divide-y divide-border border border-border rounded-lg">
        {recs.map(r => (
          <div key={r.id} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{r.title}{r.composer ? ` — ${r.composer}` : ''}</div>
                <div className="text-xs text-muted-foreground">{r.user_email}{r.notes ? ` · ${r.notes}` : ''}</div>
              </div>
              <Select value={r.status} onValueChange={v => updateRec.mutate({ id: r.id, status: v, admin_response: responses[r.id] })}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="added">Added</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={responses[r.id] || ''}
              onChange={e => setResponses(rs => ({ ...rs, [r.id]: e.target.value }))}
              placeholder="Optional response to user..."
              className="text-xs h-8"
            />
          </div>
        ))}
        {recs.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No recommendations yet</div>}
      </div>
    </div>
  );
}

// --- Users Moderation Tab ---
function UsersTab() {
  const qc = useQueryClient();
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => db.entities.UserProfile.list('-created_date', 200),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => db.entities.User.list('-created_date', 200),
  });
  const { data: subs = [] } = useQuery({
    queryKey: ['all-subs'],
    queryFn: () => db.entities.Subscription.filter({ status: 'active' }),
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, data }) => db.entities.UserProfile.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-profiles'] }),
  });

  const togglePremium = useMutation({
    mutationFn: async ({ userEmail, grant }) => {
      if (grant) {
        const existing = await db.entities.Subscription.filter({ user_email: userEmail });
        if (!existing.find(s => s.status === 'active')) {
          await db.entities.Subscription.create({ user_email: userEmail, plan: 'free_premium', status: 'active' });
        }
        const prof = profiles.find(p => p.user_email === userEmail);
        if (prof) await db.entities.UserProfile.update(prof.id, { is_premium: true });
      } else {
        const active = subs.filter(s => s.user_email === userEmail);
        for (const s of active) await db.entities.Subscription.update(s.id, { status: 'cancelled' });
        const prof = profiles.find(p => p.user_email === userEmail);
        if (prof) await db.entities.UserProfile.update(prof.id, { is_premium: false });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-subs'] }); qc.invalidateQueries({ queryKey: ['all-profiles'] }); toast.success('Premium status updated'); },
  });

  const sendWarning = useMutation({
    mutationFn: async ({ userEmail, reason }) => {
      await db.entities.Notification.create({
        user_email: userEmail,
        type: 'warning',
        title: 'You have received a warning',
        body: reason,
        from_email: 'admin@cadence.app',
      });
    },
    onSuccess: () => toast.success('Warning sent'),
  });

  const subsSet = new Set(subs.map(s => s.user_email));

  // Merge users (platform) and profiles to ensure all show up
  const allEmails = new Set([...profiles.map(p => p.user_email), ...users.map(u => u.email)]);
  const mergedUsers = [...allEmails].map(em => {
    const profile = profiles.find(p => p.user_email === em);
    const user = users.find(u => u.email === em);
    return { email: em, profile, user, hasPremium: subsSet.has(em) };
  }).filter(u => u.email && u.email !== 'admin@cadence.app');

  if (isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{mergedUsers.length} user(s)</p>
      <div className="divide-y divide-border border border-border rounded-lg">
        {mergedUsers.map(({ email: userEmail, profile: p, hasPremium }) => (
          <div key={userEmail} className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-3">
              {p?.profile_image ? <img src={p.profile_image} className="w-8 h-8 rounded-full object-cover" alt="" /> : <div className="w-8 h-8 rounded-full bg-muted" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{p?.username || '(no username)'}</div>
                  {hasPremium && <Crown size={11} className="text-foreground" />}
                  {p?.is_flagged && <Badge variant="destructive" className="text-xs">Flagged</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{userEmail}</div>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {p?.is_flagged
                ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateProfile.mutate({ id: p.id, data: { is_flagged: false, flagged_reason: '' } })}>Unflag</Button>
                : p && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { const r = prompt('Flag reason:'); if (r) updateProfile.mutate({ id: p.id, data: { is_flagged: true, flagged_reason: r } }); }}>Flag User</Button>}
              {p && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateProfile.mutate({ id: p.id, data: { username: '' } })}>Clear Username</Button>}
              {p?.profile_image && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateProfile.mutate({ id: p.id, data: { profile_image: '' } })}>Remove Avatar</Button>}
              <Button size="sm" variant={hasPremium ? 'outline' : 'secondary'} className="h-7 text-xs gap-1" onClick={() => togglePremium.mutate({ userEmail, grant: !hasPremium })}>
                <Crown size={10} /> {hasPremium ? 'Revoke Premium' : 'Grant Premium'}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600" onClick={() => { const r = prompt('Warning message:'); if (r) sendWarning.mutate({ userEmail, reason: r }); }}>Warn User</Button>
            </div>
          </div>
        ))}
        {mergedUsers.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users yet</div>}
      </div>
    </div>
  );
}

// --- Communities Tab ---
function CommunitiesTab() {
  const qc = useQueryClient();
  const { data: communities = [], isLoading } = useQuery({ queryKey: ['all-communities'], queryFn: () => db.entities.Community.list('-created_date', 100) });
  const updateCommunity = useMutation({
    mutationFn: ({ id, data }) => db.entities.Community.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-communities'] }),
  });
  if (isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{communities.length} community/ies</p>
      <div className="divide-y divide-border border border-border rounded-lg">
        {communities.map(c => (
          <div key={c.id} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">Owner: {c.owner_email}</div>
                {c.admin_warning && <div className="text-xs text-amber-600 mt-0.5">Warning: {c.admin_warning}</div>}
              </div>
              <Badge variant={c.status === 'taken_down' ? 'destructive' : 'outline'} className="text-xs">{c.status}</Badge>
            </div>
            <div className="flex gap-1 flex-wrap">
              {c.status === 'active'
                ? <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateCommunity.mutate({ id: c.id, data: { status: 'taken_down' } })}>Take Down</Button>
                : <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateCommunity.mutate({ id: c.id, data: { status: 'active' } })}>Restore</Button>}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { const w = prompt('Warning message to owner:'); if (w) updateCommunity.mutate({ id: c.id, data: { admin_warning: w } }); }}>Warn Owner</Button>
              {c.admin_warning && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateCommunity.mutate({ id: c.id, data: { admin_warning: '' } })}>Clear Warning</Button>}
            </div>
          </div>
        ))}
        {communities.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No communities yet</div>}
      </div>
    </div>
  );
}

// --- Notifications Tab ---
function NotificationsTab() {
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => db.entities.User.list('-created_date', 200),
  });
  const [target, setTarget] = useState('all');
  const [specificEmail, setSpecificEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    if (target === 'all') {
      for (const u of users) {
        await db.entities.Notification.create({
          user_email: u.email,
          type: 'admin_message',
          title,
          body,
          from_email: 'admin@cadence.app',
        });
      }
      toast.success(`Notification sent to ${users.length} users`);
    } else {
      await db.entities.Notification.create({
        user_email: specificEmail,
        type: 'admin_message',
        title,
        body,
        from_email: 'admin@cadence.app',
      });
      toast.success('Notification sent!');
    }
    setTitle('');
    setBody('');
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSend} className="border border-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-medium">Send Notification</h3>
        <div className="space-y-1.5">
          <Label>Send to</Label>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={target === 'all' ? 'secondary' : 'outline'} onClick={() => setTarget('all')}>All Users</Button>
            <Button type="button" size="sm" variant={target === 'specific' ? 'secondary' : 'outline'} onClick={() => setTarget('specific')}>Specific User</Button>
          </div>
        </div>
        {target === 'specific' && (
          <div className="space-y-1.5">
            <Label>Email address</Label>
            <Input value={specificEmail} onChange={e => setSpecificEmail(e.target.value)} placeholder="user@example.com" required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" />
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Optional message body..." rows={3} />
        </div>
        <Button type="submit" size="sm" disabled={sending} className="gap-1.5">
          <Bell size={13} /> {sending ? 'Sending...' : 'Send Notification'}
        </Button>
      </form>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('accounts');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage accounts, ads, support and recommendations.</p>
      </div>
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <div>
        {tab === 'accounts' && <AccountsTab />}
        {tab === 'ads' && <AdsTab />}
        {tab === 'tickets' && <TicketsTab />}
        {tab === 'recommendations' && <RecommendationsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'communities' && <CommunitiesTab />}
        {tab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  );
}