const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Music, Shield, FileText, Headphones, LifeBuoy, Crown, Users, Star } from 'lucide-react';

const FEATURES = [
  { icon: Music, label: 'Curated Library', desc: 'Browse a carefully hand-picked selection of scores across all genres and difficulty levels.' },
  { icon: Headphones, label: 'Ad-Supported Access', desc: 'Watch a few short ads to unlock any piece for free, or go premium for instant access.' },
  { icon: FileText, label: 'Premium PDF Downloads', desc: 'Premium subscribers can download any score as a print-ready PDF for personal use.' },
  { icon: Shield, label: 'DRM Protected', desc: 'All content is digitally watermarked and protected against unauthorised distribution.' },
];

const HOW_IT_WORKS = [
  { icon: Music, step: '01', title: 'Browse the Library', desc: 'Explore our curated collection of sheet music across genres and difficulty levels.' },
  { icon: Headphones, step: '02', title: 'Watch & Unlock', desc: 'Watch 5 short ads to unlock any piece for viewing — completely free.' },
  { icon: Crown, step: '03', title: 'Go Premium', desc: 'Subscribe free during beta for instant downloads, no ads, community creation, and more.' },
];

export default function Start() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [regDone, setRegDone] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [regUsername, setRegUsername] = useState('');

  const handleUsernameLogin = (e) => {
    e.preventDefault();
    setError('');
    if (username === 'admin' && password === 'cadence') {
      localStorage.setItem('cadenceAdmin', '1');
      window.location.href = '/library';
    } else {
      setError('Incorrect username or password.');
    }
  };

  const handlePlatformLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await db.auth.loginViaEmailPassword(email, emailPassword);
      window.location.href = '/library';
    } catch (err) {
      setError(err?.message || 'Sign in failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (emailPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      await db.auth.register({ email, password: emailPassword });
      setOtpSent(true);
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await db.auth.verifyOtp({ email, otpCode: otp });
      db.auth.setToken(res.access_token);
      if (regUsername) {
        await db.entities.UserProfile.create({ user_email: email, username: regUsername });
      }
      window.location.href = '/library';
    } catch (err) {
      setError(err?.message || 'Verification failed. Please check your code.');
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await db.auth.resetPasswordRequest(email); } catch (_) {}
    setRegDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Learn more</a>
          <Link to="/support">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <LifeBuoy size={13} /> Contact Support
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left — About */}
        <div id="features" className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 max-w-2xl">
          <div className="space-y-3 mb-8">
            <h1 className="text-4xl font-heading leading-tight">Sheet music for<br />every musician.</h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md">
              Cadence is a curated digital sheet music platform. Browse a growing collection of scores — from classical masterworks to contemporary pieces — free or with a premium subscription.
            </p>
          </div>

          {/* How it works */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-5">How it works</p>
            <div className="space-y-4">
              {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center shrink-0 text-xs font-mono text-muted-foreground">{step}</div>
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-3">
                <div className="mt-0.5 w-8 h-8 rounded-md border border-border flex items-center justify-center shrink-0">
                  <Icon size={14} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block w-px bg-border my-8" />
        <div className="block lg:hidden h-px bg-border mx-8" />

        {/* Right — Auth */}
        <div className="flex-1 flex items-center justify-center px-8 py-12 lg:px-16">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex border border-border rounded-lg p-1 gap-1">
              {[['login', 'Sign in'], ['register', 'Sign up']].map(([key, label]) => (
                <button
                  key={key}
                  className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${mode === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => { setMode(key); setError(''); }}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'login' && (
              <div className="space-y-4">
                {/* Email sign in */}
                <form onSubmit={handlePlatformLogin} className="space-y-3">
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
                  <Input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="Password" required />
                  {error && email && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
                  <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2" onClick={() => { setMode('forgot'); setError(''); }}>
                    Forgot password?
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-2 text-xs text-muted-foreground">or sign in with username</span></div>
                </div>

                {/* Admin / username sign in */}
                <form onSubmit={handleUsernameLogin} className="space-y-3">
                  <div className="space-y-1.5">
                    <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" autoComplete="username" />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      className="pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(s => !s)}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {error && !email && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" variant="outline" className="w-full">Sign in with username</Button>
                </form>
              </div>
            )}

            {mode === 'register' && !otpSent && (
              <form onSubmit={handleRegister} className="space-y-3">
                <Input value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Choose a username" required />
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
                <div className="space-y-1">
                  <Input type="password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} placeholder="Password (min. 8 characters)" required />
                  {emailPassword.length > 0 && emailPassword.length < 8 && (
                    <p className="text-xs text-amber-600">Password must be at least 8 characters</p>
                  )}
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>Create account</Button>
              </form>
            )}

            {mode === 'register' && otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <p className="text-sm text-muted-foreground">We sent a verification code to <strong>{email}</strong>.</p>
                <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Verification code" required />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>Verify and sign in</Button>
                <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2" onClick={() => db.auth.resendOtp(email)}>
                  Resend code
                </button>
                <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2" onClick={() => { setOtpSent(false); setOtp(''); setError(''); setEmail(''); setRegUsername(''); }}>
                  ← Use a different email
                </button>
              </form>
            )}

            {mode === 'forgot' && !regDone && (
              <form onSubmit={handleForgot} className="space-y-3">
                <p className="text-sm text-muted-foreground">Enter your email and we will send a reset link.</p>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
                <Button type="submit" className="w-full" disabled={loading}>Send reset link</Button>
                <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2" onClick={() => setMode('login')}>Back to sign in</button>
              </form>
            )}
            {mode === 'forgot' && regDone && (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">If that email is registered, a reset link has been sent.</p>
                <button className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground" onClick={() => { setMode('login'); setRegDone(false); }}>Back to sign in</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        2026 Cadence Music Ltd. All rights reserved.
      </footer>
    </div>
  );
}