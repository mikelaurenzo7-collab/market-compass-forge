import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Upload, X, Loader2, Image, MapPin, Layers, Grid3X3 } from "lucide-react";
import { toast } from "sonner";

interface InspectionGalleryProps {
  dealId: string;
  companyId: string;
}

const PHOTO_TYPES = [
  { value: "exterior", label: "Exterior", icon: Camera },
  { value: "interior", label: "Interior", icon: Image },
  { value: "site_map", label: "Site Map", icon: MapPin },
  { value: "floor_plan", label: "Floor Plan", icon: Layers },
  { value: "aerial", label: "Aerial", icon: Grid3X3 },
];

export default function InspectionGallery({ dealId, companyId }: InspectionGalleryProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [uploadType, setUploadType] = useState("exterior");

  const { data: photos } = useQuery({
    queryKey: ["property-photos", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_photos")
        .select("*")
        .eq("deal_id", dealId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const filePath = `${user.id}/${dealId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("property-photos").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(filePath);
      const { error: insertError } = await supabase.from("property_photos").insert({
        deal_id: dealId,
        company_id: companyId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        photo_type: uploadType,
        uploaded_by: user.id,
        sort_order: (photos?.length ?? 0) + 1,
      });
      if (insertError) throw insertError;
      queryClient.invalidateQueries({ queryKey: ["property-photos", dealId] });
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const { error } = await supabase.from("property_photos").delete().eq("id", photoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-photos", dealId] });
      setSelectedPhoto(null);
      toast.success("Photo removed");
    },
  });

  const filteredPhotos = filterType === "all" ? photos : photos?.filter((p: any) => p.photo_type === filterType);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" /> Inspection Gallery ({photos?.length ?? 0})
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="h-7 px-2 rounded-md border border-border bg-background text-[10px] text-foreground"
          >
            {PHOTO_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b border-border/50 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setFilterType("all")}
          className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${filterType === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          All
        </button>
        {PHOTO_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilterType(t.value)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 ${filterType === t.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
      </div>

      {(!filteredPhotos || filteredPhotos.length === 0) ? (
        <div className="p-8 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No inspection photos yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload property photos, site maps, and floor plans</p>
        </div>
      ) : (
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredPhotos.map((photo: any) => (
            <div
              key={photo.id}
              className="group relative rounded-md overflow-hidden border border-border/50 cursor-pointer hover:border-primary/40 transition-colors aspect-[4/3]"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.file_url}
                alt={photo.caption ?? photo.file_name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white font-medium truncate">{photo.file_name}</p>
                <span className="text-[9px] text-white/70 capitalize">{photo.photo_type.replace("_", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.file_url}
              alt={selectedPhoto.caption ?? selectedPhoto.file_name}
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={() => deletePhoto.mutate(selectedPhoto.id)}
                className="h-8 w-8 rounded-full bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="h-8 w-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm text-white font-medium">{selectedPhoto.file_name}</p>
              <p className="text-xs text-white/60 capitalize mt-0.5">{selectedPhoto.photo_type.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
