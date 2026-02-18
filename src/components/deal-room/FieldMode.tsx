import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Camera, Mic, MicOff, MapPin, Clock, Loader2, Image, StickyNote, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface FieldModeProps {
  dealId: string;
  companyId: string;
  onMemoSaved?: () => void;
}

interface GeoLocation {
  lat: number;
  lng: number;
}

const FieldMode = ({ dealId, companyId, onMemoSaved }: FieldModeProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locating, setLocating] = useState(false);

  // Voice memo state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [memoText, setMemoText] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Recent captures
  const [recentCaptures, setRecentCaptures] = useState<{ type: string; name: string; time: Date }[]>([]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Could not get location. Photos will be saved without geotag.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);

    // Get location while uploading
    let geo: GeoLocation | null = location;
    if (!geo && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
        );
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(geo);
      } catch {
        // Continue without geo
      }
    }

    const timestamp = new Date();
    const fileName = `field_${format(timestamp, "yyyyMMdd_HHmmss")}_${file.name}`;

    try {
      const filePath = `${dealId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("property-photos").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("property_photos").insert({
        deal_id: dealId,
        company_id: companyId,
        file_url: urlData.publicUrl,
        file_name: fileName,
        photo_type: "field_capture",
        caption: geo
          ? `Field capture · ${format(timestamp, "MMM d, yyyy h:mm a")} · ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`
          : `Field capture · ${format(timestamp, "MMM d, yyyy h:mm a")}`,
        uploaded_by: user.id,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["property-photos", dealId] });
      setRecentCaptures((prev) => [{ type: "photo", name: fileName, time: timestamp }, ...prev.slice(0, 4)]);
      toast.success("Photo captured & synced");
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const startVoiceRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser. Use Chrome for best results.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalText = memoText;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += (finalText ? " " : "") + t;
          setMemoText(finalText);
        } else {
          interim += t;
        }
      }
      setTranscript(interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") toast.error(`Voice error: ${e.error}`);
      setRecording(false);
    };

    recognition.onend = () => setRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
    setShowMemo(true);
  }, [memoText]);

  const stopVoiceRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
    setTranscript("");
  }, []);

  const saveFieldMemo = async () => {
    if (!memoText.trim() || !user || !dealId) return;
    setSavingMemo(true);
    try {
      const timestamp = new Date();
      const geoStr = location ? ` · 📍 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "";

      await supabase.from("decision_log").insert({
        deal_id: dealId,
        user_id: user.id,
        decision_type: "field_memo",
        rationale: `[Field Memo — ${format(timestamp, "MMM d, yyyy h:mm a")}${geoStr}]\n\n${memoText.trim()}`,
      });

      queryClient.invalidateQueries({ queryKey: ["deal-decisions", dealId] });
      setRecentCaptures((prev) => [{ type: "memo", name: `Memo: ${memoText.slice(0, 30)}...`, time: timestamp }, ...prev.slice(0, 4)]);
      setMemoText("");
      setTranscript("");
      setShowMemo(false);
      toast.success("Field memo saved to Decision Journal");
      onMemoSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to save memo");
    } finally {
      setSavingMemo(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Field Mode Header */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Field Mode</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Capture photos, notes, and voice memos on-site. Everything auto-syncs to the Deal Room.</p>

        {/* Location status */}
        <button
          onClick={getLocation}
          disabled={locating}
          className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {locating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MapPin className={`h-3 w-3 ${location ? "text-primary" : ""}`} />
          )}
          {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Tap to enable geotag"}
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Add Photo */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 hover:bg-primary/10 hover:border-primary/60 transition-all active:scale-95 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-primary" />
          )}
          <span className="text-sm font-semibold text-primary">
            {uploading ? "Syncing..." : "Add Photo"}
          </span>
          <span className="text-[10px] text-muted-foreground">Auto geotagged & timestamped</span>
        </button>

        {/* Voice Memo */}
        <button
          onClick={recording ? stopVoiceRecording : startVoiceRecording}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all active:scale-95 ${
            recording
              ? "border-destructive/60 bg-destructive/10 hover:bg-destructive/15"
              : "border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/60"
          }`}
        >
          {recording ? (
            <MicOff className="h-8 w-8 text-destructive animate-pulse" />
          ) : (
            <Mic className="h-8 w-8 text-foreground" />
          )}
          <span className={`text-sm font-semibold ${recording ? "text-destructive" : "text-foreground"}`}>
            {recording ? "Stop Recording" : "Voice Memo"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {recording ? "Listening..." : "Dictate a field note"}
          </span>
        </button>
      </div>

      {/* Quick Note / Voice Transcript Panel */}
      <button
        onClick={() => setShowMemo(!showMemo)}
        className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
      >
        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-primary" /> Field Note
          {memoText && <span className="text-[10px] text-primary font-mono ml-1">({memoText.split(/\s+/).length} words)</span>}
        </span>
        {showMemo ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {showMemo && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          {transcript && (
            <p className="text-xs text-primary/70 italic bg-primary/5 rounded px-2 py-1">
              🎙 {transcript}
            </p>
          )}
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="Type or dictate your field observations..."
            rows={4}
            className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {format(new Date(), "h:mm a")}
              {location && (
                <>
                  <MapPin className="h-2.5 w-2.5 ml-1" /> {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                </>
              )}
            </span>
            <button
              onClick={saveFieldMemo}
              disabled={!memoText.trim() || savingMemo}
              className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              {savingMemo ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Save to Journal
            </button>
          </div>
        </div>
      )}

      {/* Recent Captures */}
      {recentCaptures.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Captures</h4>
          <div className="space-y-1.5">
            {recentCaptures.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {c.type === "photo" ? (
                  <Image className="h-3 w-3 text-primary shrink-0" />
                ) : (
                  <StickyNote className="h-3 w-3 text-primary shrink-0" />
                )}
                <span className="text-foreground truncate flex-1">{c.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{format(c.time, "h:mm a")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMode;
