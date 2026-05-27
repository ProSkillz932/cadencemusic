const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppAuth } from '@/lib/useAppAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Crown, Camera, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInHours } from 'date-fns';

export default function Profile() {
  const { email, isAdmin } = useAppAuth();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ['profile', email],
    queryFn: () => db.entities.UserProfile.filter({ user_email: email }),
    enabled: !!email,
  });
  const profile = profiles[0];

  const { data: subs = [] } = useQuery({
    queryKey: ['subscription', email],
    queryFn: () => db.entities.Subscription.filter({ user_email: email, status: 'active' }),
    enabled: !!email && !isAdmin,
  });
  const isPremium = subs.length > 0 || isAdmin;

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile?.id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Check username cooldown (1 day)
  const canChangeUsername = () => {
    if (!profile?.username_changed_at) return true;
    const hours = differenceInHours(new Date(), new Date(profile.username_changed_at));
    return hours >= 24;
  };

  const usernameChangeCooldownMsg = () => {
    if (!profile?.username_changed_at) return '';
    const hours = differenceInHours(new Date(), new Date(profile.username_changed_at));
    if (hours >= 24) return '';
    const remaining = 24 - hours;
    return `Username can be changed again in ${remaining} hour(s).`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!email) return;

    // Validate username
    if (username && username.includes(' ')) {
      toast.error('Username must not contain spaces.');
      return;
    }

    const usernameChanged = username !== (profile?.username || '');
    if (usernameChanged && !canChangeUsername()) {
      toast.error(usernameChangeCooldownMsg());
      return;
    }

    setSaving(true);
    let profile_image = profile?.profile_image || '';
    if (imageFile) {
      const res = await db.integrations.Core.UploadFile({ file: imageFile });
      profile_image = res.file_url;
    }

    const updateData = {
      username,
      bio,
      profile_image,
      ...(usernameChanged ? { username_changed_at: new Date().toISOString() } : {}),
    };

    if (profile) {
      await db.entities.UserProfile.update(profile.id, updateData);
    } else {
      await db.entities.UserProfile.create({ user_email: email, ...updateData });
    }

    // If username changed, update all posts and replies
    if (usernameChanged && username) {
      const posts = await db.entities.CommunityPost.filter({ user_email: email });
      for (const p of posts) {
        await db.entities.CommunityPost.update(p.id, { username, profile_image });
      }
      const replies = await db.entities.CommunityReply.filter({ user_email: email });
      for (const r of replies) {
        await db.entities.CommunityReply.update(r.id, { username, profile_image });
      }
    }

    qc.invalidateQueries({ queryKey: ['profile', email] });
    setImageFile(null);
    setImagePreview(null);
    setSaving(false);
    toast.success('Profile updated!');
  };

  const handleSendResetEmail = async () => {
    if (!email) return;
    setResetLoading(true);
    try {
      await db.auth.resetPasswordRequest(email);
    } catch (_) {}
    setResetSent(true);
    setResetLoading(false);
  };

  const displayImage = imagePreview || profile?.profile_image;
  const cooldownMsg = usernameChangeCooldownMsg();

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-medium">Your Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings.</p>
      </div>

      {isPremium && (
        <div className="flex items-center gap-2 border border-border rounded-lg px-4 py-3 bg-muted/20">
          <Crown size={14} className="text-foreground" />
          <span className="text-sm font-medium">Premium Member</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {displayImage ? (
              <img
                src={displayImage}
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
                alt="Profile"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                <User size={36} className="text-muted-foreground" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
              <Camera size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
          {imageFile && <p className="text-xs text-muted-foreground">{imageFile.name}</p>}
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Choose a username (no spaces)"
          />
          {cooldownMsg && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle size={11} />
              {cooldownMsg}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Usernames cannot contain spaces. Can only be changed once per day.</p>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label>Bio</Label>
          <Textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell the community a bit about yourself..."
            rows={3}
          />
        </div>

        <div className="text-xs text-muted-foreground">Email: {email}</div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>

      {/* Password Reset */}
      <div className="border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Key size={14} />
          <span className="text-sm font-medium">Change Password</span>
        </div>
        <p className="text-xs text-muted-foreground">We'll send a password reset link to your email address.</p>
        {!showResetPassword ? (
          <Button variant="outline" size="sm" onClick={() => setShowResetPassword(true)}>
            Send Reset Link
          </Button>
        ) : resetSent ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle size={14} className="text-green-600" />
            Reset link sent to {email}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Send a reset link to: <strong>{email}</strong></p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSendResetEmail} disabled={resetLoading}>
                {resetLoading ? 'Sending...' : 'Confirm Send'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowResetPassword(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}