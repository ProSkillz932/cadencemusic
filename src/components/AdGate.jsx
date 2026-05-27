const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Eye, Check } from 'lucide-react';

const AD_DURATION = 5;
const TOTAL_ADS = 5;

export default function AdGate({ onComplete }) {
  const [adsWatched, setAdsWatched] = useState(0);
  const [watching, setWatching] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentAd, setCurrentAd] = useState(null);

  const { data: ads = [] } = useQuery({
    queryKey: ['ads'],
    queryFn: () => db.entities.Ad.list(),
  });

  useEffect(() => {
    if (!watching) return;
    if (countdown <= 0) {
      setWatching(false);
      const next = adsWatched + 1;
      setAdsWatched(next);
      if (next >= TOTAL_ADS) onComplete();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [watching, countdown]);

  const startAd = () => {
    if (ads.length > 0) {
      setCurrentAd(ads[Math.floor(Math.random() * ads.length)]);
    }
    setWatching(true);
    setCountdown(AD_DURATION);
  };

  return (
    <div className="max-w-sm mx-auto text-center space-y-6 py-12">
      <div className="space-y-2">
        <Eye size={32} className="mx-auto text-muted-foreground" />
        <h2 className="text-lg font-medium">Watch ads to unlock</h2>
        <p className="text-sm text-muted-foreground">
          View {TOTAL_ADS} short ads to access this sheet music, or subscribe for instant access.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{adsWatched} of {TOTAL_ADS} ads watched</span>
          <span>{Math.round((adsWatched / TOTAL_ADS) * 100)}%</span>
        </div>
        <Progress value={(adsWatched / TOTAL_ADS) * 100} className="h-1.5" />
      </div>

      {watching ? (
        <div className="border border-border rounded-lg p-4 bg-muted/50 space-y-3">
          {currentAd ? (
            currentAd.media_type === 'video' ? (
              <video src={currentAd.file_url} className="w-full aspect-video rounded object-cover" autoPlay muted playsInline />
            ) : (
              <img src={currentAd.file_url} alt={currentAd.title} className="w-full aspect-video object-cover rounded" />
            )
          ) : (
            <div className="w-full aspect-video bg-foreground/5 rounded flex items-center justify-center">
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Ad playing...</div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            {countdown}s remaining
          </div>
        </div>
      ) : adsWatched < TOTAL_ADS ? (
        <Button onClick={startAd} className="gap-2">
          <Play size={14} />
          Watch Ad {adsWatched + 1} of {TOTAL_ADS}
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600">
          <Check size={16} />
          All ads watched! Loading sheet music...
        </div>
      )}
    </div>
  );
}