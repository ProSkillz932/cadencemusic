import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Logo from '../components/Logo';
import { ArrowRight, Music, Crown, Eye } from 'lucide-react';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="py-24 md:py-36 text-center space-y-6">
        <Logo size="lg" />
        <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">
          Your minimalist library for sheet music.<br />
          Browse, view, and download — beautifully simple.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/library">
            <Button size="lg" className="gap-2">
              Browse Library <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to="/subscriptions">
            <Button size="lg" variant="outline" className="gap-2">
              <Crown size={16} /> Go Premium
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-border">
        <h2 className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            { icon: Music, title: 'Browse', desc: 'Explore our curated collection of sheet music across genres and difficulty levels.' },
            { icon: Eye, title: 'Watch & View', desc: 'Watch 5 short ads to unlock any piece for viewing — completely free.' },
            { icon: Crown, title: 'Subscribe', desc: 'Get a free premium subscription to view and download instantly, no ads.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center mx-auto">
                <Icon size={18} strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}