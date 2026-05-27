const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload as UploadIcon, Check, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

export default function Upload() {
  const { user } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ title: '', composer: '', category: '', difficulty: '', instrument: '', pages: '' });
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    let file_url = '';
    let preview_image = '';

    if (pdfFile) {
      const res = await db.integrations.Core.UploadFile({ file: pdfFile });
      file_url = res.file_url;
    }
    if (imageFile) {
      const res = await db.integrations.Core.UploadFile({ file: imageFile });
      preview_image = res.file_url;
    }

    await db.entities.SheetMusic.create({
      ...form,
      pages: form.pages ? Number(form.pages) : undefined,
      file_url,
      preview_image,
    });

    setSuccess(true);
    setUploading(false);
    toast.success('Sheet music uploaded!');
    setForm({ title: '', composer: '', category: '', difficulty: '', instrument: '', pages: '' });
    setPdfFile(null);
    setImageFile(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-medium">Upload Sheet Music</h1>
        <p className="text-sm text-muted-foreground mt-1">Add new pieces to the Cadence library.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Title *</Label>
          <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Nocturne Op. 9 No. 2" />
        </div>
        <div className="space-y-1.5">
          <Label>Composer *</Label>
          <Input required value={form.composer} onChange={e => setForm(f => ({ ...f, composer: e.target.value }))} placeholder="e.g. Frédéric Chopin" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select required value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {['Classical', 'Jazz', 'Pop', 'Film', 'Contemporary', 'Folk'].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {['Beginner', 'Intermediate', 'Advanced'].map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Instrument</Label>
            <Input value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} placeholder="e.g. Piano" />
          </div>
          <div className="space-y-1.5">
            <Label>Pages</Label>
            <Input type="number" value={form.pages} onChange={e => setForm(f => ({ ...f, pages: e.target.value }))} placeholder="e.g. 4" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Sheet Music (PDF)</Label>
          <div
            className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => document.getElementById('pdf-input').click()}
          >
            <UploadIcon size={20} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">{pdfFile ? pdfFile.name : 'Click to upload PDF'}</p>
            <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files[0])} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Preview Image</Label>
          <div
            className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => document.getElementById('img-input').click()}
          >
            <UploadIcon size={20} className="mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">{imageFile ? imageFile.name : 'Click to upload image (JPG, PNG)'}</p>
            <input id="img-input" type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files[0])} />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={uploading}>
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Uploading...</>
            : success
            ? <><Check size={14} /> Uploaded!</>
            : <><UploadIcon size={14} /> Upload Sheet Music</>}
        </Button>
      </form>
    </div>
  );
}