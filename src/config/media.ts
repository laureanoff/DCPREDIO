/** Contenido del carrusel de la web pública. Los archivos están en /public/media. */
export type MediaItem =
  | { type: "video"; src: string; poster: string; title: string }
  | { type: "image"; src: string; title: string };

export const CAROUSEL_MEDIA: MediaItem[] = [
  { type: "video", src: "/media/se-juega.mp4", poster: "/media/se-juega-poster.jpg", title: "Se juega" },
];
