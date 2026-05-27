const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppAuth } from '@/lib/useAppAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Plus, Lock, Globe, Crown, ThumbsUp, ThumbsDown, ArrowRight, Clock, TrendingUp, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

function UserAvatar({ profileImage, username, size = 7 }) {
  const initials = (username || '?')[0].toUpperCase();
  return profileImage
    ? <img src={profileImage} className={`w-${size} h-${size} rounded-full object-cover border border-border shrink-0`} alt={username} />
    : <div className={`w-${size} h-${size} rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium shrink-0`}>{initials}</div>;
}

export default function Forum() {
  const { email, isAdmin } = useAppAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('general');
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [communityForm, setCommunityForm] = useState({ name: '', description: '', is_private: false, visibility: 'public_open', auto_join: true });
  const [communityImage, setCommunityImage] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [sortMode, setSortMode] = useState('newest');
  const [lastPostTime, setLastPostTime] = useState(null);

  const { data: subs = [] } = useQuery({
    queryKey: ['subscription', email],
    queryFn: () => db.entities.Subscription.filter({ user_email: email, status: 'active' }),
    enabled: !!email && !isAdmin,
  });
  const isPro = subs.length > 0 || isAdmin;

  const { data: myProfiles = [] } = useQuery({
    queryKey: ['profile', email],
    queryFn: () => db.entities.UserProfile.filter({ user_email: email }),
    enabled: !!email,
  });
  const myProfile = myProfiles[0];
  const myUsername = myProfile?.username || email;
  const myProfileImage = myProfile?.profile_image || '';

  const { data: generalPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['general-posts'],
    queryFn: () => db.entities.CommunityPost.filter({ community_id: 'general' }, '-created_date', 100),
    enabled: tab === 'general',
    refetchInterval: tab === 'general' ? 10000 : false,
  });

  const { data: premiumProfiles = [] } = useQuery({
    queryKey: ['premium-profiles'],
    queryFn: () => db.entities.UserProfile.filter({ is_premium: true }),
    enabled: tab === 'general',
  });
  const premiumEmails = new Set(premiumProfiles.map(p => p.user_email));

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => db.entities.Community.filter({ status: 'active' }, '-created_date', 50),
    enabled: tab === 'communities',
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', email],
    queryFn: () => db.entities.CommunityMember.filter({ user_email: email }),
    enabled: !!email && tab === 'communities',
  });
  const myActiveCommunityIds = new Set(myMemberships.filter(m => !['pending', 'removed'].includes(m.status)).map(m => m.community_id));

  const postCooldownLeft = () => {
    if (!lastPostTime) return 0;
    const diff = 5 * 60 * 1000 - (Date.now() - lastPostTime);
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  };

  const createPost = useMutation({
    mutationFn: () => db.entities.CommunityPost.create({
      ...postForm,
      community_id: 'general',
      user_email: email,
      username: myUsername,
      profile_image: myProfileImage,
      upvotes: 0,
      downvotes: 0,
      reply_count: 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['general-posts'] });
      setPostForm({ title: '', content: '' });
      setShowPostForm(false);
      setLastPostTime(Date.now());
      toast.success('Post created!');
    },
  });

  const createCommunity = useMutation({
    mutationFn: async () => {
      let profile_image = '';
      if (communityImage) {
        const res = await db.integrations.Core.UploadFile({ file: communityImage });
        profile_image = res.file_url;
      }
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const vis = communityForm.visibility;
      const community = await db.entities.Community.create({
        name: communityForm.name,
        description: communityForm.description,
        owner_email: email,
        profile_image,
        invite_code: code,
        status: 'active',
        is_private: vis === 'private_invite' || vis === 'private_approval',
        auto_join: vis === 'public_open',
        visibility: vis,
      });
      await db.entities.CommunityMember.create({ community_id: community.id, user_email: email, role: 'owner', status: 'active' });
      return community;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      qc.invalidateQueries({ queryKey: ['my-memberships', email] });
      setCommunityForm({ name: '', description: '', is_private: false, visibility: 'public_open', auto_join: true });
      setCommunityImage(null);
      setShowCreateCommunity(false);
      toast.success('Community created!');
    },
  });

  const joinWithCode = useMutation({
    mutationFn: async () => {
      const matching = await db.entities.Community.filter({ invite_code: joinCodeInput.toUpperCase(), status: 'active' });
      if (!matching.length) throw new Error('Invalid invite code');
      const community = matching[0];
      const existing = await db.entities.CommunityMember.filter({ community_id: community.id, user_email: email });
      if (existing.filter(m => !['removed'].includes(m.status)).length) throw new Error('Already a member or pending');
      await db.entities.CommunityMember.create({ community_id: community.id, user_email: email, role: 'member', status: 'active' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-memberships', email] }); setJoinCodeInput(''); toast.success('Joined community!'); },
    onError: (e) => toast.error(e.message),
  });

  const joinPublic = useMutation({
    mutationFn: async (community) => {
      const existing = await db.entities.CommunityMember.filter({ community_id: community.id, user_email: email });
      if (existing.filter(m => !['removed'].includes(m.status)).length) return;
      const status = community.auto_join !== false ? 'active' : 'pending';
      await db.entities.CommunityMember.create({ community_id: community.id, user_email: email, role: 'member', status });
      return status;
    },
    onSuccess: (status) => { qc.invalidateQueries({ queryKey: ['my-memberships', email] }); toast.success(status === 'active' ? 'Joined!' : 'Access requested — awaiting approval'); },
  });

  const sortedPosts = [...generalPosts].sort((a, b) => {
    if (sortMode === 'newest') return new Date(b.created_date) - new Date(a.created_date);
    if (sortMode === 'top') return ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0));
    if (sortMode === 'controversial') {
      const scoreA = (a.downvotes || 0) + (a.upvotes || 0);
      const scoreB = (b.downvotes || 0) + (b.upvotes || 0);
      return scoreB - scoreA;
    }
    return 0;
  });

  const visibleCommunities = communities.filter(c => {
    if (isAdmin) return true;
    if (!c.is_private) return true;
    return myActiveCommunityIds.has(c.id);
  });

  const cooldown = postCooldownLeft();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Forum</h1>
        <p className="text-sm text-muted-foreground mt-1">Discuss music, join communities, and connect with others.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[['general', 'General Discussion', MessageSquare], ['communities', 'Communities', Users]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${tab === key ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            {/* Sort */}
            <div className="flex gap-1">
              {[['newest', Clock, 'Newest'], ['top', TrendingUp, 'Top'], ['controversial', Flame, 'Controversial']].map(([key, Icon, label]) => (
                <Button key={key} size="sm" variant={sortMode === key ? 'secondary' : 'ghost'} className="gap-1.5 h-8 text-xs" onClick={() => setSortMode(key)}>
                  <Icon size={11} /> {label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {cooldown > 0 && <span className="text-xs text-muted-foreground">New post in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}</span>}
              <Button size="sm" className="gap-1.5" onClick={() => setShowPostForm(s => !s)} disabled={cooldown > 0}>
                <Plus size={13} /> New Post
              </Button>
            </div>
          </div>

          {showPostForm && (
            <form onSubmit={e => { e.preventDefault(); createPost.mutate(); }} className="border border-border rounded-xl p-5 space-y-3">
              <div className="space-y-1.5"><Label>Title</Label><Input value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))} placeholder="Your question or topic" required /></div>
              <div className="space-y-1.5"><Label>Content</Label><Textarea value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))} placeholder="Share more details..." rows={4} required /></div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createPost.isPending}>Post</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPostForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {postsLoading ? (
              <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /></div>
            ) : sortedPosts.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground border border-border rounded-xl">No posts yet — be the first!</div>
            ) : sortedPosts.map(post => <PostRow key={post.id} post={post} premiumEmails={premiumEmails} />)}
          </div>
        </div>
      )}

      {tab === 'communities' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              <Input value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value)} placeholder="Invite code..." className="w-36 h-9 text-sm font-mono uppercase" />
              <Button size="sm" variant="outline" onClick={() => joinWithCode.mutate()} disabled={!joinCodeInput || joinWithCode.isPending}>Join</Button>
            </div>
            {isPro ? (
              <Button size="sm" className="gap-1.5" onClick={() => setShowCreateCommunity(s => !s)}><Plus size={13} /> Create Community</Button>
            ) : (
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Crown size={11} /><Link to="/subscriptions" className="underline underline-offset-2">Premium to create communities</Link></div>
            )}
          </div>

          {showCreateCommunity && (
            <form onSubmit={e => { e.preventDefault(); createCommunity.mutate(); }} className="border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-medium">Create Community</h3>
              <div className="space-y-1.5"><Label>Name *</Label><Input required value={communityForm.name} onChange={e => setCommunityForm(f => ({ ...f, name: e.target.value }))} placeholder="Community name" /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={communityForm.description} onChange={e => setCommunityForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this community about?" rows={2} /></div>
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {[
                    ['public_open', 'Public — Anyone can join'],
                    ['public_approval', 'Public — Manual approval'],
                    ['private_invite', 'Private — Invite code only'],
                    ['private_approval', 'Private — Invite + approval'],
                  ].map(([key, label]) => (
                    <label key={key} className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer transition-colors ${communityForm.visibility === key ? 'border-foreground bg-muted/30' : 'border-border'}`}>
                      <input
                        type="radio"
                        name="visibility"
                        value={key}
                        checked={communityForm.visibility === key}
                        onChange={() => setCommunityForm(f => ({ ...f, visibility: key }))}
                        className="shrink-0"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="border border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/30" onClick={() => document.getElementById('comm-img').click()}>
                <p className="text-xs text-muted-foreground">{communityImage ? communityImage.name : 'Community picture (optional)'}</p>
                <input id="comm-img" type="file" accept="image/*" className="hidden" onChange={e => setCommunityImage(e.target.files[0])} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createCommunity.isPending}>Create</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreateCommunity(false)}>Cancel</Button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleCommunities.map(community => {
              const isMember = myActiveCommunityIds.has(community.id);
              const myMembership = myMemberships.find(m => m.community_id === community.id);
              const isPending = myMembership?.status === 'pending';
              return (
                <div key={community.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {community.profile_image ? <img src={community.profile_image} className="w-10 h-10 rounded-full object-cover" alt={community.name} /> : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{community.name[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{community.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">{community.is_private ? <Lock size={10} /> : <Globe size={10} />}{community.is_private ? 'Private' : 'Public'}</div>
                    </div>
                  </div>
                  {community.description && <p className="text-xs text-muted-foreground line-clamp-2">{community.description}</p>}
                  {isMember ? (
                    <Link to={`/community/${community.id}`}><Button size="sm" variant="outline" className="w-full">Open →</Button></Link>
                  ) : isPending ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>Request Pending</Button>
                  ) : !community.is_private ? (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => joinPublic.mutate(community)}>{community.auto_join !== false ? 'Join' : 'Request Access'}</Button>
                  ) : null}
                </div>
              );
            })}
            {visibleCommunities.length === 0 && <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">No communities yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function PostRow({ post, premiumEmails = new Set() }) {
  const isPremiumAuthor = premiumEmails.has(post.user_email);
  return (
    <Link to={`/post/${post.id}`}>
      <div className="border border-border rounded-xl px-5 py-4 hover:bg-muted/20 transition-colors group">
        <div className="flex items-start gap-3">
          <UserAvatar profileImage={post.profile_image} username={post.username} size={8} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{post.username || post.user_email}</span>
              {isPremiumAuthor && <Crown size={10} className="text-amber-500" />}
              <span className="text-xs text-muted-foreground">
                {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
              </span>
            </div>
            <div className="text-sm font-semibold mt-1">{post.title || '(untitled)'}</div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ThumbsUp size={11} /> {post.upvotes || 0}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ThumbsDown size={11} /> {post.downvotes || 0}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare size={11} /> {post.reply_count || 0}
              </span>
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}