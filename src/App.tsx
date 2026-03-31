import { useEffect, useMemo, useState, type FormEvent } from "react";
import CalendarPlanner from "./components/CalendarPlanner";
import ImageGallery from "./components/ImageGallery";
import Checklist from "./components/Checklist";
import { usePlannerStore } from "./store/usePlannerStore";

function App() {
  const pageContent = usePlannerStore((state) => state.pageContent);
  const isLoading = usePlannerStore((state) => state.isLoading);
  const syncState = usePlannerStore((state) => state.syncState);
  const syncMessage = usePlannerStore((state) => state.syncMessage);
  const error = usePlannerStore((state) => state.error);
  const gallery = usePlannerStore((state) => state.gallery);
  const loadPlanner = usePlannerStore((state) => state.loadPlanner);
  const updatePageContent = usePlannerStore((state) => state.updatePageContent);

  const [isEditingPageContent, setIsEditingPageContent] = useState(false);
  const [pageDraft, setPageDraft] = useState(pageContent);

  useEffect(() => {
    const reloadPlanner = () => {
      void loadPlanner();
    };

    reloadPlanner();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reloadPlanner();
      }
    };

    window.addEventListener("focus", reloadPlanner);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const refreshInterval = window.setInterval(reloadPlanner, 30000);

    return () => {
      window.removeEventListener("focus", reloadPlanner);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(refreshInterval);
    };
  }, [loadPlanner]);

  useEffect(() => {
    if (!isEditingPageContent) {
      setPageDraft(pageContent);
    }
  }, [pageContent, isEditingPageContent]);

  const savePageContent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    updatePageContent({
      badge: pageDraft.badge.trim() || pageContent.badge,
      title: pageDraft.title.trim() || pageContent.title,
      subtitle: pageDraft.subtitle.trim(),
    });

    setIsEditingPageContent(false);
  };

  const cancelPageContentEdit = () => {
    setPageDraft(pageContent);
    setIsEditingPageContent(false);
  };

  const featuredImage = useMemo(
    () =>
      gallery.images.find((image) => image.id === gallery.featuredImageId) ??
      gallery.images[0] ??
      null,
    [gallery],
  );

  const statusClasses =
    syncState === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl flex-1">
              <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                {pageContent.badge}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">
                {pageContent.title}
              </h1>
              <p className="mt-2 max-w-3xl text-stone-600">
                {pageContent.subtitle}
              </p>

              {isEditingPageContent ? (
                <form
                  onSubmit={savePageContent}
                  className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4"
                >
                  <label className="block text-sm font-medium text-stone-700">
                    Etikett
                    <input
                      type="text"
                      value={pageDraft.badge}
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          badge: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-stone-700">
                    Rubrik
                    <input
                      type="text"
                      value={pageDraft.title}
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-stone-700">
                    Undertitel
                    <textarea
                      value={pageDraft.subtitle}
                      onChange={(event) =>
                        setPageDraft((current) => ({
                          ...current,
                          subtitle: event.target.value,
                        }))
                      }
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-emerald-500"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-200 px-4 py-2 font-semibold text-stone-900 transition hover:bg-emerald-300"
                    >
                      Spara sidtext
                    </button>
                    <button
                      type="button"
                      onClick={cancelPageContentEdit}
                      className="rounded-xl border border-stone-300 px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-100"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPageContent(true)}
                  className="mt-4 rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-500 hover:text-emerald-700"
                >
                  Redigera sidtext
                </button>
              )}
            </div>

            <div className="flex w-full max-w-sm flex-col gap-4">
              {featuredImage && (
                <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 shadow-sm">
                  <img
                    src={featuredImage.url}
                    alt={featuredImage.alt || pageContent.title}
                    className="h-56 w-full object-cover"
                  />
                </div>
              )}

              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${statusClasses}`}
              >
                <p className="font-semibold">
                  {isLoading ? "Laddar planeringen..." : syncMessage}
                </p>
                {error && <p className="mt-1 text-xs opacity-80">{error}</p>}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <CalendarPlanner />

          <aside className="space-y-6">
            <Checklist
              listKey="personal"
              badge="Personligt"
              inputPlaceholder="Lägg till en ny uppgift"
              emptyMessage="Din checklista är tom. Lägg till din första uppgift ovan."
            />

            <Checklist
              listKey="artworks"
              badge="Ateljé"
              inputPlaceholder="Lägg till ett nytt konstverk eller en studiouppgift"
              emptyMessage="Inga konstuppgifter ännu. Lägg till din första ovan."
              accent="violet"
            />
          </aside>
        </div>

        <div className="mt-6">
          <ImageGallery />
        </div>
      </div>
    </main>
  );
}

export default App;
