import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Music, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SheetMusicCard({ piece }) {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (!isLoadingAuth && !user) {
      e.preventDefault();
      navigate('/register');
    }
  };
  return (
    <Link
      to={`/view/${piece.id}`}
      onClick={handleClick}
      className="group block border border-border rounded-lg overflow-hidden hover:border-foreground/30 transition-all duration-200"
    >
      <div className="aspect-[3/4] bg-muted flex items-center justify-center relative overflow-hidden">
        {piece.preview_image ? (
          <img src={piece.preview_image} alt={piece.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileText size={32} strokeWidth={1} />
            <span className="text-[10px] uppercase tracking-widest">Sheet Music</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-medium truncate group-hover:underline">{piece.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{piece.composer}</p>
        <div className="flex gap-1.5 pt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{piece.category}</Badge>
          {piece.difficulty && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{piece.difficulty}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}