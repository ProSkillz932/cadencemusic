const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { useAppAuth } from '@/lib/useAppAuth';
import AdGate from '../components/AdGate';
import FavouriteButton from '../components/FavouriteButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Crown, FileText } from 'lucide-react';

export default function SheetMusicView() {
  const { id } = useParams();
  const { user } = useAuth();
  const { isAdmin, email: userEmail } = useAppAuth();
  const [unlocked, setUnlocked] = useState(isAdmin);

  const { data: piece, isLoading } = useQuery({
    queryKey: ['sheetmusic', id],
    queryFn: () => db.entities.SheetMusic.get(id),
  });

  const { data: subs = [] } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: () => db.entities.Subscription.filter({ user_email: user?.email, status: 'active' }),
    enabled: !!user?.email,
  });

  const hasSubscription = subs.length > 0 || isAdmin;

  useEffect(() => {
    if (hasSubscription) setUnlocked(true);
  }, [hasSubscription]);

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!piece) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-muted-foreground">Sheet music not found</p>
        <Link to="/library"><Button variant="outline" size="sm">Back to Library</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <style>{`
        .drm-zone { user-select: none; -webkit-user-select: none; }
        @media print { .drm-zone { display: none !important; } }
      `}</style>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link to="/library" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft size={12} /> Back to Library
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium">{piece.title}</h1>
            <FavouriteButton piece={piece} />
          </div>
          <p className="text-sm text-muted-foreground">{piece.composer}</p>
          <div className="flex gap-1.5 pt-1">
            <Badge variant="outline" className="text-[10px]">{piece.category}</Badge>
            {piece.difficulty && <Badge variant="secondary" className="text-[10px]">{piece.difficulty}</Badge>}
            {piece.instrument && <Badge variant="secondary" className="text-[10px]">{piece.instrument}</Badge>}
          </div>
        </div>
        {(hasSubscription || isAdmin) && piece.file_url && (
          <div className="flex flex-col items-end gap-1">
            <a href={piece.file_url} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5"><Download size={14} /> Download PDF</Button>
            </a>
            <p className="text-[10px] text-muted-foreground">For personal use only — redistribution is prohibited.</p>
          </div>
        )}
      </div>

      {!unlocked ? (
        <div className="border border-border rounded-lg p-6">
          <AdGate onComplete={() => setUnlocked(true)} />
          <div className="text-center pt-4 border-t border-border mt-6">
            <p className="text-xs text-muted-foreground mb-2">Or skip the ads</p>
            <Link to="/subscriptions">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Crown size={14} /> Get Premium — Free
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="drm-zone border border-border rounded-lg overflow-hidden relative"
          onContextMenu={e => e.preventDefault()}
        >
          {hasSubscription && (
            <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Crown size={12} /> Premium access — viewing &amp; download enabled
            </div>
          )}

          {!hasSubscription && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              aria-hidden
            >
              <div className="rotate-[-30deg] opacity-[0.07] text-lg font-bold tracking-widest whitespace-nowrap">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>{userEmail} &middot; CADENCE &middot; {userEmail} &middot; CADENCE</div>
                ))}
              </div>
            </div>
          )}

          {piece.preview_image ? (
            <img
              src={piece.preview_image}
              alt={piece.title}
              className="w-full pointer-events-none"
              draggable={false}
            />
          ) : piece.file_url ? (
            <iframe
              src={piece.file_url}
              className="w-full h-[80vh]"
              title={piece.title}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="aspect-[3/4] flex items-center justify-center bg-muted/30">
              <div className="text-center space-y-2 text-muted-foreground">
                <FileText size={48} strokeWidth={1} />
                <p className="text-sm">Sheet music preview</p>
                <p className="text-xs">Upload a file to display the full score</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}