const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppAuth } from '@/lib/useAppAuth';

import SheetMusicCard from '../components/SheetMusicCard';
import FavouriteButton from '../components/FavouriteButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Music, Heart } from 'lucide-react';

const CATEGORIES = ['All', 'Classical', 'Jazz', 'Pop', 'Film', 'Contemporary', 'Folk'];

export default function Library() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { isAdmin, email } = useAppAuth();
  const [showFavourites, setShowFavourites] = useState(false);
  const queryClient = useQueryClient();

  const { data: favourites = [] } = useQuery({
    queryKey: ['favourites', email],
    queryFn: () => db.entities.Favourite.filter({ user_email: email }),
    enabled: !!email,
  });
  const favouriteIds = new Set(favourites.map(f => f.sheet_music_id));
  const deletePiece = useMutation({
    mutationFn: (id) => db.entities.SheetMusic.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sheetmusic'] }),
  });

  const { data: pieces = [], isLoading } = useQuery({
    queryKey: ['sheetmusic'],
    queryFn: () => db.entities.SheetMusic.list('-created_date', 100),
  });

  const filtered = pieces.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.composer?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || p.category === category;
    const matchFav = !showFavourites || favouriteIds.has(p.id);
    return matchSearch && matchCat && matchFav;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium">Library</h1>
        <p className="text-sm text-muted-foreground">Browse our collection of sheet music</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or composer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={showFavourites ? 'secondary' : 'ghost'}
            size="sm"
            className="text-xs h-9 gap-1"
            onClick={() => { setShowFavourites(s => !s); setCategory('All'); }}
          >
            <Heart size={11} fill={showFavourites ? 'currentColor' : 'none'} /> Favourites
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={category === cat ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-9"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <Music size={32} className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No sheet music found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(piece => (
            <div key={piece.id} className="relative group/card">
              <SheetMusicCard piece={piece} />
              <FavouriteButton piece={piece} className="absolute bottom-10 right-2 bg-background/80 rounded-full p-1 opacity-0 group-hover/card:opacity-100 transition-opacity" />
              {isAdmin && (
                <button
                  onClick={() => deletePiece.mutate(piece.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold shadow"
                  title="Delete"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}