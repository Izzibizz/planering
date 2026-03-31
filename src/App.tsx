import CalendarPlanner from "./components/CalendarPlanner";
import Checklist, { type ChecklistItem } from "./components/Checklist";

const personalItems: ChecklistItem[] = [
  { id: 1, text: "Plan tomorrow's tasks", done: true },
  { id: 2, text: "Buy groceries", done: false },
  { id: 3, text: "Reply to emails", done: false },
];

const artworkItems: ChecklistItem[] = [
  { id: 1, text: "Finish portrait sketch", done: false },
  { id: 2, text: "Prime the new canvas", done: false },
  { id: 3, text: "Photograph completed artwork", done: true },
];

function App() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 backdrop-blur sm:p-8">
          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Planering
          </span>
          <h1 className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">
            Utställning Västerås 25 april - 10 maj 2026
          </h1>
          <p className="mt-2 max-w-3xl text-stone-600">
            A light planning view for your exhibition calendar, personal tasks,
            and artwork checklist.
          </p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <CalendarPlanner />

          <aside className="space-y-6">
            <Checklist
              title="My Checklist"
              description="Add tasks, mark them as done, and remove them anytime."
              badge="Personal tasks"
              storageKey="planering-checklist-personal"
              starterItems={personalItems}
              inputPlaceholder="Add a new task"
              emptyMessage="Your checklist is empty. Add your first task above."
            />

            <Checklist
              title="Artworks to do"
              description="Track artwork ideas, ongoing pieces, and finished work."
              badge="Studio work"
              storageKey="planering-checklist-artworks"
              starterItems={artworkItems}
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
