const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppAuth } from '@/lib/useAppAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageSquare, Crown, Edit2, Trash2, AtSign, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

function UserAvatar({ profileImage, username, size = 8 }) {
  const initials = (username || '?')[0].toUpperCase();
  return profileImage
    ? <img src={profileImage} className={`w-${size} h-${size} rounded-full object-cover border border-border shrink-0`} alt={username} />
    : <div className={`w-${size} h-${size} rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium shrink-0`}>{initials}</div>;
}

async function createMentionNotifications(content, fromEmail, fromUsername, postId) {
  const mentions = content.match(/@(\w+)/g);
  if (!mentions) return;
  const uniqueMentions = [...new Set(mentions.map(m => m.slice(1)))];
  for (const uname of uniqueMentions) {
    const profiles = await db.entities.UserProfile.filter({ username: uname });
    if (profiles[0] && profiles[0].user_email !== fromEmail) {
      await db.entities.Notification.create({
        user_email: profiles[0].user_email,
        type: 'mention',
        title: `${fromUsername || fromEmail} mentioned you`,
        body: content.slice(0, 100),
        link: `/post/${postId}`,
        from_email: fromEmail,
      });
    }
  }
}

export default function PostDetail() {
  const { postId } = useParams();
  const { email, isAdmin } = useAppAuth();
  const qc = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyingToUser, setReplyingToUser] = useState('');
  const [editingPostContent, setEditingPostContent] = useState('');
  const [editingPost, setEditingPost] = useState(false);
  const [lastReplyTime, setLastReplyTime] = useState(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef(null);

  const { data: post } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => db.entities.CommunityPost.get(postId),
    enabled: !!postId,
  });

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ['replies', postId],
    queryFn: () => db.entities.CommunityReply.filter({ post_id: postId }, 'created_date', 200),
    enabled: !!postId,
    refetchInterval: 5000,
  });

  const { data: myProfiles = [] } = useQuery({
    queryKey: ['profile', email],
    queryFn: () => db.entities.UserProfile.filter({ user_email: email }),
    enabled: !!email,
  });
  const myProfile = myProfiles[0];
  const myUsername = myProfile?.username || email;
  const myProfileImage = myProfile?.profile_image || '';

  const { data: subs = [] } = useQuery({
    queryKey: ['subscription', email],
    queryFn: () => db.entities.Subscription.filter({ user_email: email, status: 'active' }),
    enabled: !!email && !isAdmin,
  });
  const isPremium = subs.length > 0 || isAdmin;

  // All community members for @ mention autocomplete
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-mention'],
    queryFn: () => db.entities.UserProfile.list('-created_date', 100),
    enabled: !!email,
  });
  const premiumEmails = new Set(allProfiles.filter(p => p.is_premium).map(p => p.user_email));

  const { data: myVotes = [] } = useQuery({
    queryKey: ['my-votes-post', postId, email],
    queryFn: () => db.entities.PostVote.filter({ post_id: postId, user_email: email }),
    enabled: !!postId && !!email,
  });

  const handleReplyInput = (val) => {
    setReplyContent(val);
    const atIndex = val.lastIndexOf('@');
    if (atIndex !== -1) {
      const search = val.slice(atIndex + 1).split(' ')[0];
      setMentionSearch(search);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username) => {
    const atIndex = replyContent.lastIndexOf('@');
    const newContent = replyContent.slice(0, atIndex) + `@${username} `;
    setReplyContent(newContent);
    setShowMentions(false);
  };

  const filteredMentions = allProfiles.filter(p =>
    p.username && p.username.toLowerCase().startsWith(mentionSearch.toLowerCase()) && p.user_email !== email
  ).slice(0, 5);

  const replyCooldownLeft = () => {
    if (!lastReplyTime) return 0;
    const diff = 5000 - (Date.now() - lastReplyTime);
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  };

  const addReply = useMutation({
    mutationFn: async () => {
      const parent = replyingToId || null;
      const reply = await db.entities.CommunityReply.create({
        post_id: postId,
        parent_reply_id: parent,
        user_email: email,
        username: myUsername,
        profile_image: myProfileImage,
        content: replyContent,
        upvotes: 0,
        downvotes: 0,
      });
      // Update post reply count
      if (post) {
        await db.entities.CommunityPost.update(postId, { reply_count: (post.reply_count || 0) + 1 });
      }
      // Notify post author
      if (post && post.user_email !== email) {
        await db.entities.Notification.create({
          user_email: post.user_email,
          type: 'mention',
          title: `${myUsername} replied to your post`,
          body: replyContent.slice(0, 100),
          link: `/post/${postId}`,
          from_email: email,
        });
      }
      // Notify parent reply author
      if (parent) {
        const parentReply = replies.find(r => r.id === parent);
        if (parentReply && parentReply.user_email !== email) {
          await db.entities.Notification.create({
            user_email: parentReply.user_email,
            type: 'reply_to_reply',
            title: `${myUsername} replied to your comment`,
            body: replyContent.slice(0, 100),
            link: `/post/${postId}`,
            from_email: email,
          });
        }
      }
      // Mention notifications
      await createMentionNotifications(replyContent, email, myUsername, postId);
      return reply;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['replies', postId] });
      qc.invalidateQueries({ queryKey: ['post', postId] });
      setReplyContent('');
      setReplyingToId(null);
      setReplyingToUser('');
      setLastReplyTime(Date.now());
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePost = useMutation({
    mutationFn: () => db.entities.CommunityPost.update(postId, { content: editingPostContent }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['post', postId] }); setEditingPost(false); toast.success('Post updated!'); },
  });

  const deletePost = useMutation({
    mutationFn: () => db.entities.CommunityPost.delete(postId),
    onSuccess: () => { window.history.back(); toast.success('Post deleted'); },
  });

  const votePost = useMutation({
    mutationFn: async (voteType) => {
      const existingVote = myVotes.find(v => !v.reply_id);
      if (existingVote) {
        if (existingVote.vote === voteType) {
          await db.entities.PostVote.delete(existingVote.id);
          const delta = voteType === 'up' ? -1 : 1;
          await db.entities.CommunityPost.update(postId, {
            upvotes: Math.max(0, (post.upvotes || 0) + (voteType === 'up' ? -1 : 0)),
            downvotes: Math.max(0, (post.downvotes || 0) + (voteType === 'down' ? -1 : 0)),
          });
        } else {
          await db.entities.PostVote.update(existingVote.id, { vote: voteType });
          await db.entities.CommunityPost.update(postId, {
            upvotes: Math.max(0, (post.upvotes || 0) + (voteType === 'up' ? 1 : -1)),
            downvotes: Math.max(0, (post.downvotes || 0) + (voteType === 'down' ? 1 : -1)),
          });
        }
      } else {
        await db.entities.PostVote.create({ post_id: postId, user_email: email, vote: voteType });
        await db.entities.CommunityPost.update(postId, {
          upvotes: (post.upvotes || 0) + (voteType === 'up' ? 1 : 0),
          downvotes: (post.downvotes || 0) + (voteType === 'down' ? 1 : 0),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post', postId] });
      qc.invalidateQueries({ queryKey: ['my-votes-post', postId, email] });
    },
  });

  if (!post) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="py-20 flex justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const isMyPost = post.user_email === email || isAdmin;
  const myPostVote = myVotes.find(v => !v.reply_id);
  const topLevelReplies = replies.filter(r => !r.parent_reply_id);
  const childReplies = (parentId) => replies.filter(r => r.parent_reply_id === parentId);
  const cooldown = replyCooldownLeft();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* Post */}
      <div className="border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <UserAvatar profileImage={post.profile_image} username={post.username} size={9} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{post.username || post.user_email}</span>
              {(premiumEmails.has(post.user_email) || (post.user_email === email && isPremium)) && <Crown size={11} className="text-amber-500" />}
              <span className="text-xs text-muted-foreground">
                {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
              </span>
            </div>
            {post.title && <h1 className="text-xl font-semibold mt-1">{post.title}</h1>}
          </div>
          {isMyPost && !editingPost && (
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => { setEditingPostContent(post.content); setEditingPost(true); }}>
                <Edit2 size={13} />
              </Button>
              <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => { if (confirm('Delete this post?')) deletePost.mutate(); }}>
                <Trash2 size={13} />
              </Button>
            </div>
          )}
        </div>

        {editingPost ? (
          <div className="space-y-2">
            <Textarea value={editingPostContent} onChange={e => setEditingPostContent(e.target.value)} rows={4} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => updatePost.mutate()} disabled={updatePost.isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingPost(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}

        {/* Vote row */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={() => votePost.mutate('up')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${myPostVote?.vote === 'up' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ThumbsUp size={13} /> {post.upvotes || 0}
          </button>
          <button
            onClick={() => votePost.mutate('down')}
            className={`flex items-center gap-1.5 text-xs transition-colors ${myPostVote?.vote === 'down' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ThumbsDown size={13} /> {post.downvotes || 0}
          </button>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare size={13} /> {post.reply_count || replies.length} replies
          </span>
        </div>
      </div>

      {/* Reply box */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          {replyingToId ? (
            <>
              <CornerDownRight size={14} className="text-muted-foreground" />
              Replying to <span className="text-foreground">@{replyingToUser}</span>
              <button onClick={() => { setReplyingToId(null); setReplyingToUser(''); }} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">cancel</button>
            </>
          ) : 'Leave a reply'}
        </div>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={replyContent}
            onChange={e => handleReplyInput(e.target.value)}
            placeholder={`Reply... Use @username to mention someone`}
            rows={3}
          />
          {showMentions && filteredMentions.length > 0 && (
            <div className="absolute z-10 bottom-full mb-1 left-0 w-56 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              {filteredMentions.map(p => (
                <button
                  key={p.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => insertMention(p.username)}
                >
                  <UserAvatar profileImage={p.profile_image} username={p.username} size={5} />
                  {p.username}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => addReply.mutate()}
          disabled={!replyContent.trim() || addReply.isPending || cooldown > 0}
        >
          {cooldown > 0 ? `Wait ${cooldown}s` : addReply.isPending ? 'Posting...' : 'Post Reply'}
        </Button>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{replies.length} replies</h2>
        {repliesLoading ? (
          <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /></div>
        ) : topLevelReplies.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No replies yet. Be the first!</div>
        ) : topLevelReplies.map(reply => (
          <ReplyCard
            key={reply.id}
            reply={reply}
            depth={0}
            email={email}
            isAdmin={isAdmin}
            postId={postId}
            allProfiles={allProfiles}
            premiumEmails={premiumEmails}
            onReply={(id, uname) => { setReplyingToId(id); setReplyingToUser(uname); setReplyContent(`@${uname} `); }}
            childReplies={childReplies}
            qc={qc}
          />
        ))}
      </div>
    </div>
  );
}

function ReplyCard({ reply, depth, email, isAdmin, postId, allProfiles, premiumEmails = new Set(), onReply, childReplies, qc }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const isOwn = reply.user_email === email || isAdmin;
  const children = childReplies(reply.id);

  const updateReply = useMutation({
    mutationFn: () => db.entities.CommunityReply.update(reply.id, { content: editContent }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['replies', postId] }); setEditing(false); },
  });

  const deleteReply = useMutation({
    mutationFn: () => db.entities.CommunityReply.delete(reply.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['replies', postId] }),
  });

  const voteReply = useMutation({
    mutationFn: async (voteType) => {
      const existingVotes = await db.entities.PostVote.filter({ reply_id: reply.id, user_email: email });
      if (existingVotes[0]) {
        if (existingVotes[0].vote === voteType) {
          await db.entities.PostVote.delete(existingVotes[0].id);
          await db.entities.CommunityReply.update(reply.id, {
            upvotes: Math.max(0, (reply.upvotes || 0) + (voteType === 'up' ? -1 : 0)),
            downvotes: Math.max(0, (reply.downvotes || 0) + (voteType === 'down' ? -1 : 0)),
          });
        } else {
          await db.entities.PostVote.update(existingVotes[0].id, { vote: voteType });
          await db.entities.CommunityReply.update(reply.id, {
            upvotes: Math.max(0, (reply.upvotes || 0) + (voteType === 'up' ? 1 : -1)),
            downvotes: Math.max(0, (reply.downvotes || 0) + (voteType === 'down' ? 1 : -1)),
          });
        }
      } else {
        await db.entities.PostVote.create({ reply_id: reply.id, user_email: email, vote: voteType });
        await db.entities.CommunityReply.update(reply.id, {
          upvotes: (reply.upvotes || 0) + (voteType === 'up' ? 1 : 0),
          downvotes: (reply.downvotes || 0) + (voteType === 'down' ? 1 : 0),
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['replies', postId] }),
  });

  return (
    <div className={`${depth > 0 ? 'ml-6 pl-4 border-l border-border' : ''}`}>
      <div className="border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-start gap-3">
          <UserAvatar profileImage={reply.profile_image} username={reply.username} size={7} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{reply.username || reply.user_email}</span>
              {premiumEmails.has(reply.user_email) && <Crown size={9} className="text-amber-500" />}
              <span className="text-xs text-muted-foreground">
                {reply.created_date ? formatDistanceToNow(new Date(reply.created_date), { addSuffix: true }) : ''}
              </span>
            </div>
            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={2} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 text-xs" onClick={() => updateReply.mutate()} disabled={updateReply.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
            )}
          </div>
          {isOwn && !editing && (
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => { setEditContent(reply.content); setEditing(true); }}><Edit2 size={11} /></Button>
              <Button size="icon" variant="ghost" className="w-6 h-6 text-destructive" onClick={() => deleteReply.mutate()}><Trash2 size={11} /></Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={() => voteReply.mutate('up')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ThumbsUp size={11} /> {reply.upvotes || 0}
          </button>
          <button onClick={() => voteReply.mutate('down')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ThumbsDown size={11} /> {reply.downvotes || 0}
          </button>
          {depth < 3 && (
            <button
              onClick={() => onReply(reply.id, reply.username || reply.user_email)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CornerDownRight size={11} /> Reply
            </button>
          )}
        </div>
      </div>
      {/* Nested replies */}
      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map(child => (
            <ReplyCard
              key={child.id}
              reply={child}
              depth={depth + 1}
              email={email}
              isAdmin={isAdmin}
              postId={postId}
              allProfiles={allProfiles}
              premiumEmails={premiumEmails}
              onReply={onReply}
              childReplies={childReplies}
              qc={qc}
            />
          ))}
        </div>
      )}
    </div>
  );
}