import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { usePlannerStore, type GalleryImage } from "../store/usePlannerStore";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);

const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

type SortableGalleryCardProps = {
  image: GalleryImage;
  isFeatured: boolean;
  isEditing: boolean;
  captionDraft: string;
  altDraft: string;
  isSubmitting: boolean;
  onOpen: () => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onCaptionChange: (value: string) => void;
  onAltChange: (value: string) => void;
  onSetFeatured: () => void;
  onRemove: () => void;
};

function SortableGalleryCard({
  image,
  isFeatured,
  isEditing,
  captionDraft,
  altDraft,
  isSubmitting,
  onOpen,
  onStartEdit,
  onSave,
  onCancel,
  onCaptionChange,
  onAltChange,
  onSetFeatured,
  onRemove,
}: SortableGalleryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id, disabled: isEditing || isSubmitting });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-2xl border bg-white ${
        isDragging
          ? "border-violet-400 shadow-xl"
          : isFeatured
            ? "border-emerald-400"
            : "border-stone-200"
      }`}
    >
      <button type="button" onClick={onOpen} className="block w-full">
        <img
          src={image.thumbnailUrl}
          alt={image.alt || image.caption || "Galleri bild"}
          className="h-48 w-full object-cover"
        />
      </button>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-stone-900">
              {image.caption || image.alt || "Bild utan bildtext"}
            </p>
            <p className="text-xs text-stone-500">
              {isFeatured ? "Vald som huvudbild" : "Galleri-bild"}
            </p>
          </div>

          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={isEditing || isSubmitting}
            className="touch-none rounded-lg border border-stone-300 px-2 py-1 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Dra för att ändra ordning på ${image.caption || image.alt || "bilden"}`}
            title="Dra för att ändra ordning"
          >
            ↑↓
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <label className="block text-xs font-medium text-stone-700">
              Bildtext
              <input
                type="text"
                value={captionDraft}
                onChange={(event) => onCaptionChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-violet-500"
              />
            </label>
            <label className="block text-xs font-medium text-stone-700">
              Alt-text
              <input
                type="text"
                value={altDraft}
                onChange={(event) => onAltChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-violet-500"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSave}
                className="rounded-lg bg-violet-200 px-3 py-2 text-sm font-medium text-stone-900 transition hover:bg-violet-300"
              >
                Spara
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSetFeatured}
              disabled={isSubmitting || isFeatured}
              className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFeatured ? "Vald" : "Välj som huvudbild"}
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              disabled={isSubmitting}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Redigera text
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={isSubmitting}
              className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ta bort
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ImageGallery() {
  const gallery = usePlannerStore((state) => state.gallery);
  const loadPlanner = usePlannerStore((state) => state.loadPlanner);

  const [captionText, setCaptionText] = useState("");
  const [altText, setAltText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [altDraft, setAltDraft] = useState("");
  const [lightboxImageId, setLightboxImageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const images = gallery.images;
  const lightboxIndex = useMemo(
    () => images.findIndex((image) => image.id === lightboxImageId),
    [images, lightboxImageId],
  );
  const lightboxImage = lightboxIndex >= 0 ? images[lightboxIndex] : null;

  useEffect(() => {
    if (!lightboxImage) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxImageId(null);
      }

      if (event.key === "ArrowRight" && lightboxIndex < images.length - 1) {
        setLightboxImageId(images[lightboxIndex + 1]?.id ?? null);
      }

      if (event.key === "ArrowLeft" && lightboxIndex > 0) {
        setLightboxImageId(images[lightboxIndex - 1]?.id ?? null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images, lightboxImage, lightboxIndex]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const files = fileInputRef.current?.files;

    if (!files || files.length === 0) {
      setError("Välj minst en bild att ladda upp.");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));

      if (captionText.trim()) {
        formData.append("caption", captionText.trim());
      }

      if (altText.trim()) {
        formData.append("alt", altText.trim());
      }

      const response = await fetch(getApiUrl("/api/gallery/upload"), {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message ?? `Upload failed with ${response.status}`,
        );
      }

      await loadPlanner();
      setMessage("Bilden laddades upp till galleriet.");
      setCaptionText("");
      setAltText("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Kunde inte ladda upp bilden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const setFeaturedImage = async (imageId: string | null) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(getApiUrl("/api/gallery/featured"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message ??
            `Featured image update failed with ${response.status}`,
        );
      }

      await loadPlanner();
      setMessage("Huvudbilden uppdaterades.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Kunde inte uppdatera huvudbilden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = async (imageId: string) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(getApiUrl(`/api/gallery/${imageId}`), {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message ?? `Delete failed with ${response.status}`,
        );
      }

      await loadPlanner();
      setMessage("Bilden togs bort från galleriet.");
      if (lightboxImageId === imageId) {
        setLightboxImageId(null);
      }
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Kunde inte ta bort bilden.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (image: GalleryImage) => {
    setEditingImageId(image.id);
    setCaptionDraft(image.caption || image.alt || "");
    setAltDraft(image.alt || image.caption || "");
  };

  const cancelEditing = () => {
    setEditingImageId(null);
    setCaptionDraft("");
    setAltDraft("");
  };

  const saveImageDetails = async (imageId: string) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(getApiUrl(`/api/gallery/${imageId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: captionDraft.trim(),
          alt: altDraft.trim(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message ?? `Update failed with ${response.status}`,
        );
      }

      await loadPlanner();
      setMessage("Bildtexten uppdaterades.");
      cancelEditing();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Kunde inte uppdatera bildtexten.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const reorderImages = async (orderedIds: string[]) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(getApiUrl("/api/gallery/reorder"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderedIds }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message ?? `Reorder failed with ${response.status}`,
        );
      }

      await loadPlanner();
      setMessage("Ordningen på bilderna uppdaterades.");
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Kunde inte ändra ordningen på bilderna.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = images.findIndex(
      (image) => image.id === String(active.id),
    );
    const newIndex = images.findIndex((image) => image.id === String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const orderedIds = arrayMove(
      images.map((image) => image.id),
      oldIndex,
      newIndex,
    );

    void reorderImages(orderedIds);
  };

  const closeLightbox = () => setLightboxImageId(null);

  const stopLightboxPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const showPreviousImage = () => {
    if (lightboxIndex > 0) {
      setLightboxImageId(images[lightboxIndex - 1]?.id ?? null);
    }
  };

  const showNextImage = () => {
    if (lightboxIndex < images.length - 1) {
      setLightboxImageId(images[lightboxIndex + 1]?.id ?? null);
    }
  };

  const handleLightboxTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleLightboxTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!touch || !start) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      showNextImage();
      return;
    }

    showPreviousImage();
  };

  return (
    <>
      <section className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
              Bildgalleri
            </span>
            <h2 className="mt-3 text-2xl font-bold text-stone-900 sm:text-3xl">
              Bilder för utställningen
            </h2>
            <p className="mt-2 max-w-2xl text-stone-600">
              Ladda upp bilder till Cloudinary, välj en huvudbild, redigera
              bildtexter och dra bilderna för att ändra ordning.
            </p>
          </div>

          {gallery.featuredImageId && (
            <button
              type="button"
              onClick={() => void setFeaturedImage(null)}
              disabled={isSubmitting}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ta bort huvudbild
            </button>
          )}
        </div>

        <form
          onSubmit={handleUpload}
          className="mb-6 grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end"
        >
          <label className="block text-sm font-medium text-stone-700">
            Välj bilder
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Bildtext
            <input
              type="text"
              value={captionText}
              onChange={(event) => setCaptionText(event.target.value)}
              placeholder="Skriv en bildtext"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-violet-500"
            />
          </label>

          <label className="block text-sm font-medium text-stone-700">
            Alt-text / beskrivning
            <input
              type="text"
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Beskriv bilden"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-violet-500"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-violet-200 px-5 py-3 font-semibold text-stone-900 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Arbetar..." : "Ladda upp"}
          </button>
        </form>

        {message && (
          <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}

        {error && (
          <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center text-stone-500">
            Inga bilder uppladdade ännu.
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-500">
              Klicka på en bild för helskärmsläge och dra i `↑↓` för att byta
              ordning.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={images.map((image) => image.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {images.map((image) => {
                    const isFeatured = gallery.featuredImageId === image.id;
                    const isEditing = editingImageId === image.id;

                    return (
                      <SortableGalleryCard
                        key={image.id}
                        image={image}
                        isFeatured={isFeatured}
                        isEditing={isEditing}
                        captionDraft={captionDraft}
                        altDraft={altDraft}
                        isSubmitting={isSubmitting}
                        onOpen={() => setLightboxImageId(image.id)}
                        onStartEdit={() => startEditing(image)}
                        onSave={() => void saveImageDetails(image.id)}
                        onCancel={cancelEditing}
                        onCaptionChange={setCaptionDraft}
                        onAltChange={setAltDraft}
                        onSetFeatured={() => void setFeaturedImage(image.id)}
                        onRemove={() => void removeImage(image.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </section>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-5xl rounded-3xl bg-stone-950/95 p-4 text-white shadow-2xl"
            onClick={stopLightboxPropagation}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 rounded-full border border-white/30 px-3 py-1 text-sm font-medium text-white transition hover:bg-white/10"
            >
              ✕
            </button>

            <div className="flex items-center justify-between gap-3 pb-4 pr-12">
              <div>
                <p className="text-lg font-semibold">
                  {lightboxImage.caption || lightboxImage.alt || "Galleri-bild"}
                </p>
                <p className="text-sm text-stone-300">
                  {lightboxIndex + 1} av {images.length}
                </p>
                <p className="text-xs text-stone-400">
                  Använd pilarna eller svep vänster/höger på mobilen.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={showPreviousImage}
                  disabled={lightboxIndex <= 0}
                  className="rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Föregående
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  disabled={lightboxIndex >= images.length - 1}
                  className="rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Nästa →
                </button>
              </div>
            </div>

            <img
              src={lightboxImage.url}
              alt={lightboxImage.alt || lightboxImage.caption || "Galleri-bild"}
              className="max-h-[75vh] w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ImageGallery;
