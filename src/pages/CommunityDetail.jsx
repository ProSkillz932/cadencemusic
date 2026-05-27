const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppAuth } from '@/lib/useAppAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Pin, Lock, Globe, Copy, RefreshCw, VolumeX, AlertTriangle, UserX, Shield, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityDetail() {
  const { id } = useParams();
  const { email, isAdmin } = useAppAuth();
  const qc = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('info');
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [showPostForm, setShowPostForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [adminWarningText, setAdminWarningText] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [editImage, setEditImage] = useState(null);

  const { data: community, isLoading } = useQuery({ queryKey: ['community', id], queryFn: () => db.entities.Community.get(id) });

  useEffect(() => {
    if (community && !editForm) {
      setEditForm({ name: community.name, description: community.description || '', is_private: !!community.is_private, auto_join: community.auto_join !== false });
      setAdminWarningText(community.admin_warning || '');
    }
  }, [community?.id]);

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-membership', id, email],
    queryFn: () => db.entities.CommunityMember.filter({ community_id: id, user_email: email }),
    enabled: !!email,
  });
  const myMembership = myMemberships[0];
  const isMember = myMembership && !['pending', 'removed'].includes(myMembership.status);
  const isOwner = myMembership?.role === 'owner';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const isMuted = myMembership?.status === 'muted' && myMembership.mute_until && new Date(myMembership.mute_until) > new Date();
  const canPost = (isMember || isAdmin) && !isMuted;

  const { data: myProfiles = [] } = useQuery({ queryKey: ['profile', email], queryFn: () => db.entities.UserProfile.filter({ user_email: email }), enabled: !!email });
  const myUsername = myProfiles[0]?.username || email;

  const { data: allPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['community-posts', id],
    queryFn: () => db.entities.CommunityPost.filter({ community_id: id }, '-created_date', 100),
    enabled: !!id && (isMember || isAdmin || (community && !community.is_private)),
  });
  const posts = [...allPosts].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  const { data: members = [] } = useQuery({
    queryKey: ['community-members', id],
    queryFn: () => db.entities.CommunityMember.filter({ community_id: id }),
    enabled: isOwnerOrAdmin,
  });
  const pendingMembers = members.filter(m => m.status === 'pending');
  const activeMembers = members.filter(m => !['pending', 'removed'].includes(m.status));

  const createPost = useMutation({
    mutationFn: () => db.entities.CommunityPost.create({
      ...postForm, community_id: id, user_email: email, username: myUsername,
      profile_image: myProfiles[0]?.profile_image || '',
      is_pinned: false, upvotes: 0, downvotes: 0, reply_count: 0,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community-posts', id] }); setPostForm({ title: '', content: '' }); setShowPostForm(false); toast.success('Posted!'); },
  });

  const joinCommunity = useMutation({
    mutationFn: async () => {
      if (community.is_private) {
        if (joinCode.toUpperCase() !== community.invite_code) throw new Error('Invalid invite code');
        await db.entities.CommunityMember.create({ community_id: id, user_email: email, role: 'member', status: 'active' });
      } else {
        const status = community.auto_join !== false ? 'active' : 'pending';
        await db.entities.CommunityMember.create({ community_id: id, user_email: email, role: 'member', status });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-membership', id, email] }); qc.invalidateQueries({ queryKey: ['community-members', id] }); toast.success('Joined!'); },
    onError: (e) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: (post) => db.entities.CommunityPost.update(post.id, { is_pinned: !post.is_pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts', id] }),
  });

  const muteUser = useMutation({
    mutationFn: (memberId) => db.entities.CommunityMember.update(memberId, { status: 'muted', mute_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community-members', id] }); toast.success('User muted for 24h'); },
  });

  const unmuteUser = useMutation({
    mutationFn: (memberId) => db.entities.CommunityMember.update(memberId, { status: 'active', mute_until: '' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-members', id] }),
  });

  const warnUser = useMutation({
    mutationFn: ({ memberId, reason, current }) => db.entities.CommunityMember.update(memberId, { warn_count: (current || 0) + 1, last_warn_reason: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community-members', id] }); toast.success('Warning issued'); },
  });

  const removeUser = useMutation({
    mutationFn: (memberId) => db.entities.CommunityMember.update(memberId, { status: 'removed' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community-members', id] }); toast.success('Member removed'); },
  });

  const approveMember = useMutation({ mutationFn: (mId) => db.entities.CommunityMember.update(mId, { status: 'active' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['community-members', id] }) });
  const denyMember = useMutation({ mutationFn: (mId) => db.entities.CommunityMember.update(mId, { status: 'removed' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['community-members', id] }) });

  const regenerateCode = useMutation({
    mutationFn: () => db.entities.Community.update(id, { invite_code: Math.random().toString(36).substring(2, 8).toUpperCase() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community', id] }); toast.success('New code generated'); },
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      let profile_image = community.profile_image || '';
      if (editImage) { const res = await db.integrations.Core.UploadFile({ file: editImage }); profile_image = res.file_url; }
      return db.entities.Community.update(id, { ...editForm, profile_image });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['community', id] }); setEditImage(null); toast.success('Settings saved!'); },
  });

  const takedownCommunity = useMutation({ mutationFn: () => db.entities.Community.update(id, { status: 'taken_down' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['community', id] }) });
  const restoreCommunity = useMutation({ mutationFn: () => db.entities.Community.update(id, { status: 'active' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['community', id] }) });
  const sendAdminWarning = useMutation({ mutationFn: () => db.entities.Community.update(id, { admin_warning: adminWarningText }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['community', id] }); toast.success('Warning sent'); } });

  if (isLoading) return <div className="py-20 flex justify-center"><div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /></div>;
  if (!community) return <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3"><p className="text-muted-foreground">Community not found</p><Link to="/forum"><Button variant="outline" size="sm">Back to Forum</Button></Link></div>;

  if (community.status === 'taken_down' && !isAdmin) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
      <Shield size={32} className="mx-auto text-muted-foreground" strokeWidth={1.5} />
      <p className="text-muted-foreground">This community has been taken down by an administrator.</p>
      <Link to="/forum"><Button variant="outline" size="sm">Back to Forum</Button></Link>
    </div>
  );

  const showAccessGate = community.is_private && !isMember && !isAdmin;
  const showPublicJoin = !community.is_private && !isMember && !isAdmin;
  const showPosts = (isMember || isAdmin || (!community.is_private && community.auto_join !== false)) && !showAccessGate;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/forum" className="text-muted-foreground hover:text-foreground mt-1"><ArrowLeft size={16} /></Link>
        <div className="flex items-center gap-3 flex-1">
          {community.profile_image ? <img src={community.profile_image} className="w-12 h-12 rounded-full object-cover" alt={community.name} /> : <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{community.name[0]}</div>}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-medium">{community.name}</h1>
              {community.status === 'taken_down' && <Badge variant="destructive" className="text-xs">Taken Down</Badge>}
              {community.is_private ? <Lock size={12} className="text-muted-foreground" /> : <Globe size={12} className="text-muted-foreground" />}
            </div>
            {community.description && <p className="text-sm text-muted-foreground">{community.description}</p>}
            {community.admin_warning && (isMember || isAdmin) && <div className="mt-1 text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={10} /> Admin notice: {community.admin_warning}</div>}
          </div>
        </div>
        {isOwnerOrAdmin && <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setShowSettings(s => !s)}><Settings size={13} /> {showSettings ? 'Close' : 'Settings'}</Button>}
      </div>

      {/* Public join banner */}
      {showPublicJoin && (
        <div className="border border-border rounded-lg p-6 text-center space-y-3">
          <Globe size={28} className="mx-auto text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm">{community.auto_join !== false ? 'Anyone can join this public community.' : 'Request access to join this community.'}</p>
          <Button onClick={() => joinCommunity.mutate()} disabled={joinCommunity.isPending}>{community.auto_join !== false ? 'Join Community' : 'Request Access'}</Button>
          {myMembership?.status === 'pending' && <p className="text-xs text-muted-foreground">Your request is pending approval.</p>}
        </div>
      )}

      {/* Private access gate */}
      {showAccessGate && (
        <div className="border border-border rounded-lg p-6 text-center space-y-4">
          <Lock size={28} className="mx-auto text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm">This is a private community. Enter an invite code to join.</p>
          {myMembership?.status === 'pending' ? <p className="text-sm text-muted-foreground">Your request is pending approval.</p> : (
            <div className="flex gap-2 max-w-xs mx-auto">
              <Input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="INVITE CODE" className="text-center font-mono tracking-widest" />
              <Button onClick={() => joinCommunity.mutate()} disabled={!joinCode || joinCommunity.isPending}>Join</Button>
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && isOwnerOrAdmin && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex border-b border-border">
            {[['info', 'Community Info'], ['members', `Members (${activeMembers.length})`], ['requests', `Requests (${pendingMembers.length})`], ...(isAdmin ? [['admin', 'Admin Controls']] : [])].map(([key, label]) => (
              <button key={key} onClick={() => setSettingsTab(key)} className={`px-3 py-2 text-xs border-b-2 transition-colors ${settingsTab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>
            ))}
          </div>
          <div className="p-4">
            {settingsTab === 'info' && editForm && (
              <form onSubmit={e => { e.preventDefault(); saveSettings.mutate(); }} className="space-y-3">
                <div className="space-y-1.5"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.is_private} onChange={e => setEditForm(f => ({ ...f, is_private: e.target.checked }))} /> Private (invite only)</label>
                  {!editForm.is_private && <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editForm.auto_join} onChange={e => setEditForm(f => ({ ...f, auto_join: e.target.checked }))} /> Auto-approve requests</label>}
                </div>
                <div className="border border-dashed border-border rounded p-2 text-center cursor-pointer hover:bg-muted/30" onClick={() => document.getElementById('edit-comm-img').click()}>
                  <p className="text-xs text-muted-foreground">{editImage ? editImage.name : 'Change community picture'}</p>
                  <input id="edit-comm-img" type="file" accept="image/*" className="hidden" onChange={e => setEditImage(e.target.files[0])} />
                </div>
                <div className="space-y-1.5">
                  <Label>Invite Code</Label>
                  <div className="flex gap-2 items-center">
                    <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono flex-1 text-center tracking-widest">{community.invite_code || '—'}</code>
                    <Button type="button" size="icon" variant="outline" className="w-8 h-8" onClick={() => { navigator.clipboard.writeText(community.invite_code); toast.success('Copied!'); }}><Copy size={12} /></Button>
                    <Button type="button" size="icon" variant="outline" className="w-8 h-8" onClick={() => regenerateCode.mutate()}><RefreshCw size={12} /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this code to invite members directly.</p>
                </div>
                <Button type="submit" size="sm" disabled={saveSettings.isPending}>Save Changes</Button>
              </form>
            )}
            {settingsTab === 'members' && (
              <div className="space-y-2">
                {activeMembers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No active members yet.</p>
                  : activeMembers.map(m => <MemberRow key={m.id} member={m} isOwnerOrAdmin={isOwnerOrAdmin} currentEmail={email} onMute={() => muteUser.mutate(m.id)} onUnmute={() => unmuteUser.mutate(m.id)} onWarn={(r) => warnUser.mutate({ memberId: m.id, reason: r, current: m.warn_count })} onRemove={() => removeUser.mutate(m.id)} />)}
              </div>
            )}
            {settingsTab === 'requests' && (
              <div className="space-y-2">
                {pendingMembers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No pending requests.</p>
                  : pendingMembers.map(m => (
                    <div key={m.id} className="flex items-center justify-between border border-border rounded px-3 py-2">
                      <span className="text-sm">{m.user_email}</span>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => approveMember.mutate(m.id)}><CheckCircle size={11} /> Approve</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => denyMember.mutate(m.id)}><XCircle size={11} /> Deny</Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {settingsTab === 'admin' && isAdmin && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {community.status === 'active' ? <Button variant="destructive" size="sm" onClick={() => takedownCommunity.mutate()}>Take Down Community</Button> : <Button variant="outline" size="sm" onClick={() => restoreCommunity.mutate()}>Restore Community</Button>}
                </div>
                <div className="space-y-1.5">
                  <Label>Warning to Community Owner</Label>
                  <Textarea value={adminWarningText} onChange={e => setAdminWarningText(e.target.value)} placeholder="Message displayed to members and owner..." rows={3} />
                  <Button size="sm" variant="outline" onClick={() => sendAdminWarning.mutate()}>Send Warning</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posts */}
      {showPosts && (
        <div className="space-y-4">
          {canPost && <div className="flex justify-end"><Button size="sm" className="gap-1.5" onClick={() => setShowPostForm(s => !s)}>+ New Post</Button></div>}
          {isMuted && <div className="text-center text-sm text-muted-foreground border border-border rounded-lg py-3">You are muted until {new Date(myMembership.mute_until).toLocaleString()}.</div>}
          {showPostForm && (
            <form onSubmit={e => { e.preventDefault(); createPost.mutate(); }} className="border border-border rounded-lg p-4 space-y-3">
              <Input value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (optional)" />
              <Textarea value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your post..." rows={4} required />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createPost.isPending}>Post</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPostForm(false)}>Cancel</Button>
              </div>
            </form>
          )}
          <div className="divide-y divide-border border border-border rounded-lg">
            {postsLoading ? <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /></div>
              : posts.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No posts yet.</div>
              : posts.map(post => <CommunityPostRow key={post.id} post={post} email={email} myUsername={myUsername} isOwnerOrAdmin={isOwnerOrAdmin} onTogglePin={() => togglePin.mutate(post)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, isOwnerOrAdmin, currentEmail, onMute, onUnmute, onWarn, onRemove }) {
  const [showWarn, setShowWarn] = useState(false);
  const [warnReason, setWarnReason] = useState('');
  const isSelf = member.user_email === currentEmail;
  const isOwnerRole = member.role === 'owner';
  const isMutedNow = member.status === 'muted' && member.mute_until && new Date(member.mute_until) > new Date();

  return (
    <div className="border border-border rounded px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{member.user_email}</span>
          {isOwnerRole && <Badge variant="outline" className="text-[10px]">owner</Badge>}
          {isMutedNow && <Badge variant="secondary" className="text-[10px]">muted</Badge>}
          {member.warn_count > 0 && <span className="text-xs text-amber-600">{member.warn_count} warn(s)</span>}
        </div>
        {!isSelf && !isOwnerRole && isOwnerOrAdmin && (
          <div className="flex gap-1">
            {isMutedNow ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onUnmute}><VolumeX size={10} className="mr-1" />Unmute</Button>
              : <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onMute}><VolumeX size={10} className="mr-1" />Mute 24h</Button>}
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowWarn(s => !s)}><AlertTriangle size={10} className="mr-1" />Warn</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={onRemove}><UserX size={10} className="mr-1" />Remove</Button>
          </div>
        )}
      </div>
      {showWarn && (
        <div className="flex gap-2">
          <Input value={warnReason} onChange={e => setWarnReason(e.target.value)} placeholder="Reason for warning..." className="text-xs h-7" />
          <Button size="sm" className="h-7 text-xs" onClick={() => { onWarn(warnReason); setShowWarn(false); setWarnReason(''); }}>Send</Button>
        </div>
      )}
    </div>
  );
}

function CommunityPostRow({ post, isOwnerOrAdmin, onTogglePin }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-2">
        {post.is_pinned && <Pin size={11} className="text-amber-600 mt-1.5 shrink-0" />}
        <Link to={`/post/${post.id}`} className="flex-1 group min-w-0">
          <div className="text-sm font-medium group-hover:underline truncate">{post.title || '(untitled)'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {post.username || post.user_email}
            {post.created_date && <span className="ml-2">{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>↑ {post.upvotes || 0}</span>
            <span>↓ {post.downvotes || 0}</span>
            <span>💬 {post.reply_count || 0}</span>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {isOwnerOrAdmin && (
            <button onClick={onTogglePin} className={`text-[10px] px-2 py-1 rounded border transition-colors ${post.is_pinned ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground'}`}>
              {post.is_pinned ? 'Unpin' : 'Pin'}
            </button>
          )}
          <Link to={`/post/${post.id}`} className="text-muted-foreground hover:text-foreground ml-1">
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}