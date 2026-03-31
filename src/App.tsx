import { useEffect } from "react";
import CalendarPlanner from "./components/CalendarPlanner";
import Checklist from "./components/Checklist";
import { usePlannerStore } from "./store/usePlannerStore";

function App() {
  const pageContent = usePlannerStore((state) => state.pageContent);
  const isLoading = usePlannerStore((state) => state.isLoading);
  const syncState = usePlannerStore((state) => state.syncState);
  const syncMessage = usePlannerStore((state) => state.syncMessage);
  const error = usePlannerStore((state) => state.error);
  const loadPlanner = usePlannerStore((state) => state.loadPlanner);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  const statusClasses =
    syncState === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                {pageContent.badge}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">
                {pageContent.title}
              </h1>
              <p className="mt-2 max-w-3xl text-stone-600">
                {pageContent.subtitle}
              </p>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClasses}`}>
              <p className="font-semibold">
                {isLoading ? "Loading planner..." : syncMessage}
              </p>
              {error && <p className="mt-1 text-xs opacity-80">{error}</p>}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <CalendarPlanner />

          <aside className="space-y-6">
            <Checklist
              listKey="personal"
              badge="Personal tasks"
              inputPlaceholder="Add a new task"
              emptyMessage="Your checklist is empty. Add your first task above."
            />

            <Checklist
              listKey="artworks"
              badge="Studio work"
              inputPlaceholder="Add a new artwork or studio task"
              emptyMessage="No artwork tasks yet. Add your first one above."
              accent="violet"
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

export default App;
