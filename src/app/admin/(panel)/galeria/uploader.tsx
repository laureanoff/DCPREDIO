"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { addGalleryItem } from "./actions";

const MAX_BYTES = 50 * 1024 * 1024; // límite del almacenamiento
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT: Record<string, string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

/** Saca una imagen de portada del video (en el navegador). Si el navegador no puede, devuelve null. */
function makePoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const done = (b: Blob | null) => { URL.revokeObjectURL(url); resolve(b); };
    const timeout = setTimeout(() => done(null), 15000);
    video.onerror = () => { clearTimeout(timeout); done(null); };
    video.onloadedmetadata = () => { video.currentTime = Math.min(1.5, (video.duration || 2) / 2); };
    video.onseeked = () => {
      try {
        const w = 540;
        const h = Math.round((video.videoHeight / video.videoWidth) * w) || 960;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(video, 0, 0, w, h);
        canvas.toBlob((b) => { clearTimeout(timeout); done(b); }, "image/jpeg", 0.8);
      } catch {
        clearTimeout(timeout);
        done(null);
      }
    };
    video.src = url;
  });
}

export function GalleryUploader({ placement = "home" }: { placement?: "home" | "trainings" }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setStatus(null);
    const isVideo = VIDEO_TYPES.includes(file.type);
    const isImage = IMAGE_TYPES.includes(file.type);
    if (!isVideo && !isImage) return setError("Formato no permitido. Usá video MP4, WebM o MOV, o fotos JPG, PNG o WebP.");
    if (file.size > MAX_BYTES) {
      return setError(`El archivo pesa ${(file.size / 1048576).toFixed(0)} MB y el máximo es 50 MB. Comprimilo o recortalo y volvé a subirlo.`);
    }

    setBusy(true);
    const supabase = createClient();
    const id = crypto.randomUUID();
    const path = `${id}.${EXT[file.type]}`;
    let posterPath: string | null = null;
    try {
      if (isVideo) {
        setStatus("Preparando la portada del video…");
        const poster = await makePoster(file);
        if (poster) {
          const p = `${id}-poster.jpg`;
          const { error: pErr } = await supabase.storage.from("gallery").upload(p, poster, { contentType: "image/jpeg" });
          if (!pErr) posterPath = p;
        }
      }
      setStatus(`Subiendo ${(file.size / 1048576).toFixed(1)} MB… puede tardar un poco, no cierres esta pantalla.`);
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (upErr) {
        if (posterPath) await supabase.storage.from("gallery").remove([posterPath]);
        throw new Error(upErr.message.includes("exceeded") ? "El archivo supera el máximo permitido (50 MB)." : "No se pudo subir el archivo. Revisá tu conexión e intentá de nuevo.");
      }
      setStatus("Publicando…");
      const r = await addGalleryItem({ kind: isVideo ? "video" : "image", path, posterPath, title, placement });
      if (!r.ok) {
        await supabase.storage.from("gallery").remove([path, ...(posterPath ? [posterPath] : [])]);
        throw new Error(r.error);
      }
      setTitle("");
      setStatus("¡Listo! Ya aparece en la web.");
      router.refresh();
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold">Agregar video o foto</h2>
      <p className="mb-3 text-sm text-muted">Se publica solo en {placement === "trainings" ? "la galería de la página de Entrenamientos" : "la galería de la página de inicio"}. Formatos: MP4, WebM, MOV, JPG, PNG, WebP. Máximo 50 MB. Ideal: video vertical.</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Título (opcional)"
          aria-label="Título"
          disabled={busy}
          className="h-11 min-w-48 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-lime"
        />
        <input
          ref={input}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex h-11 items-center gap-2 rounded-xl bg-lime px-5 font-semibold text-black transition hover:bg-lime-dark disabled:opacity-60"
        >
          <Upload size={18} /> {busy ? "Subiendo…" : "Elegir archivo"}
        </button>
      </div>
      {status && <p role="status" className="mt-3 text-sm text-lime-ink">{status}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
