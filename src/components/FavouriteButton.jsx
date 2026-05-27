const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppAuth } from '@/lib/useAppAuth';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FavouriteButton({ piece, className }) {
  const { email } = useAppAuth();
  const qc = useQueryClient();

  const { data: favs = [] } = useQuery({
    queryKey: ['favourites', email],
    queryFn: () => db.entities.Favourite.filter({ user_email: email }),
    enabled: !!email,
  });

  const isFav = favs.some(f => f.sheet_music_id === piece.id);

  const toggle = useMutation({
    mutationFn: async () => {
      if (isFav) {
        const fav = favs.find(f => f.sheet_music_id === piece.id);
        await db.entities.Favourite.delete(fav.id);
      } else {
        await db.entities.Favourite.create({ user_email: email, sheet_music_id: piece.id, sheet_music_title: piece.title });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favourites', email] }),
  });

  if (!email) return null;

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle.mutate(); }}
      className={cn('transition-colors', isFav ? 'text-red-500' : 'text-muted-foreground hover:text-red-400', className)}
      title={isFav ? 'Remove from favourites' : 'Add to favourites'}
    >
      <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
    </button>
  );
}