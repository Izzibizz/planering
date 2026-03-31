import { useMemo, useState, type FormEvent } from "react";
import { usePlannerStore, type ChecklistKey } from "../store/usePlannerStore";

type ChecklistProps = {
  listKey: ChecklistKey;
  badge: string;
  inputPlaceholder: string;
  emptyMessage: string;
  accent?: "emerald" | "violet";
};

const themes = {
  emerald: {
    badge: "border-emerald-300 bg-emerald-50 text-emerald-700",
    button: "bg-emerald-200 text-stone-900 hover:bg-emerald-300",
    focus: "focus:border-emerald-500",
    text: "text-emerald-700 hover:text-emerald-800",
    checkbox: "accent-emerald-500",
  },
  violet: {
    badge: "border-violet-300 bg-violet-50 text-violet-700",
    button: "bg-violet-200 text-stone-900 hover:bg-violet-300",
    focus: "focus:border-violet-500",
    text: "text-violet-700 hover:text-violet-800",
    checkbox: "accent-violet-500",
  },
} as const;

function Checklist({
  listKey,
  badge,
  inputPlaceholder,
  emptyMessage,
  accent = "emerald",
}: ChecklistProps) {
  const theme = themes[accent];
  const checklist = usePlannerStore((state) => state.checklists[listKey]);
  const addChecklistItem = usePlannerStore((state) => state.addChecklistItem);
  const toggleChecklistItem = usePlannerStore(
    (state) => state.toggleChecklistItem,
  );
  const removeChecklistItem = usePlannerStore(
    (state) => state.removeChecklistItem,
  );
  const clearCompleted = usePlannerStore((state) => state.clearCompleted);
  const [newItem, setNewItem] = useState("");

  const items = checklist.items;
  const completedCount = useMemo(
    () => items.filter((item) => item.done).length,
    [items],
  );

  const addItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newItem.trim()) {
      return;
    }

    addChecklistItem(listKey, newItem);
    setNewItem("");
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 backdrop-blur sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${theme.badge}`}
          >
            {badge}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-stone-900 sm:text-3xl">
            {checklist.title}
          </h2>
          <p className="mt-2 text-stone-600">{checklist.description}</p>
        </div>

        <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-700">
          <p>
            <span className="font-semibold text-stone-900">
              {completedCount}
            </span>{" "}
            of <span className="font-semibold">{items.length}</span> done
          </p>
        </div>
      </div>

      <form onSubmit={addItem} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder={inputPlaceholder}
          className={`flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 ${theme.focus}`}
        />
        <button
          type="submit"
          className={`rounded-xl px-5 py-3 font-semibold transition ${theme.button}`}
        >
          Add item
        </button>
      </form>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-stone-500">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklistItem(listKey, item.id)}
                className={`h-5 w-5 ${theme.checkbox}`}
              />

              <span
                className={`flex-1 text-left ${
                  item.done ? "text-stone-400 line-through" : "text-stone-800"
                }`}
              >
                {item.text}
              </span>

              <button
                type="button"
                onClick={() => removeChecklistItem(listKey, item.id)}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {completedCount > 0 && (
        <button
          type="button"
          onClick={() => clearCompleted(listKey)}
          className={`mt-6 text-sm font-medium transition ${theme.text}`}
        >
          Clear completed items
        </button>
      )}
    </div>
  );
}

export default Checklist;
