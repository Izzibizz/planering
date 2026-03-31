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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, type FormEvent } from "react";
import {
  usePlannerStore,
  type ChecklistItem,
  type ChecklistKey,
} from "../store/usePlannerStore";

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

type Theme = (typeof themes)[keyof typeof themes];

type SortableChecklistItemProps = {
  item: ChecklistItem;
  isEditing: boolean;
  editingText: string;
  theme: Theme;
  onToggle: () => void;
  onStartEdit: () => void;
  onRemove: () => void;
  onEditingTextChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
};

function SortableChecklistItem({
  item,
  isEditing,
  editingText,
  theme,
  onToggle,
  onStartEdit,
  onRemove,
  onEditingTextChange,
  onSaveEdit,
  onCancelEdit,
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isEditing });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
        isDragging
          ? "border-emerald-400 bg-emerald-50 shadow-lg"
          : "border-stone-200 bg-stone-50"
      }`}
    >
      <input
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        className={`mt-1 h-5 w-5 ${theme.checkbox}`}
      />

      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editingText}
            autoFocus
            onChange={(event) => onEditingTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSaveEdit();
              }

              if (event.key === "Escape") {
                onCancelEdit();
              }
            }}
            className={`w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none ${theme.focus}`}
          />
        ) : (
          <span
            className={`block text-left ${
              item.done ? "text-stone-400 line-through" : "text-stone-800"
            }`}
          >
            {item.text}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onSaveEdit}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${theme.button}`}
            >
              Spara
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Avbryt
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="touch-none rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 cursor-grab active:cursor-grabbing"
              aria-label={`Använd pilarna för att flytta ${item.text}`}
              title="Flytta upp eller ned"
            >
              ↑↓
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Redigera
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              Ta bort
            </button>
          </>
        )}
      </div>
    </div>
  );
}

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
  const updateChecklistItemText = usePlannerStore(
    (state) => state.updateChecklistItemText,
  );
  const reorderChecklistItems = usePlannerStore(
    (state) => state.reorderChecklistItems,
  );
  const toggleChecklistItem = usePlannerStore(
    (state) => state.toggleChecklistItem,
  );
  const removeChecklistItem = usePlannerStore(
    (state) => state.removeChecklistItem,
  );
  const clearCompleted = usePlannerStore((state) => state.clearCompleted);
  const [newItem, setNewItem] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

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

  const startEditing = (itemId: string, text: string) => {
    setEditingItemId(itemId);
    setEditingText(text);
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingText("");
  };

  const saveEditing = () => {
    if (!editingItemId || !editingText.trim()) {
      return;
    }

    updateChecklistItemText(listKey, editingItemId, editingText);
    cancelEditing();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    reorderChecklistItems(listKey, String(active.id), String(over.id));
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
            av <span className="font-semibold">{items.length}</span> klara
          </p>
        </div>
      </div>

      <form onSubmit={addItem} className="mb-4 flex flex-col gap-3 sm:flex-row">
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
          Lägg till
        </button>
      </form>

      {items.length > 0 && (
        <p className="mb-4 text-sm text-stone-500">
          Dra i handtaget för att ändra ordningen på uppgifterna.
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-stone-500">
          {emptyMessage}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {items.map((item) => {
                const isEditing = editingItemId === item.id;

                return (
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    isEditing={isEditing}
                    editingText={editingText}
                    theme={theme}
                    onToggle={() => toggleChecklistItem(listKey, item.id)}
                    onStartEdit={() => startEditing(item.id, item.text)}
                    onRemove={() => removeChecklistItem(listKey, item.id)}
                    onEditingTextChange={setEditingText}
                    onSaveEdit={saveEditing}
                    onCancelEdit={cancelEditing}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {completedCount > 0 && (
        <button
          type="button"
          onClick={() => clearCompleted(listKey)}
          className={`mt-6 text-sm font-medium transition ${theme.text}`}
        >
          Rensa klara uppgifter
        </button>
      )}
    </div>
  );
}

export default Checklist;
