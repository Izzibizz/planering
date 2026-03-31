import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { usePlannerStore } from "../store/usePlannerStore";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const createDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function CalendarPlanner() {
  const today = new Date();
  const todayKey = createDateKey(today);

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const notesByDate = usePlannerStore((state) => state.calendarNotes);
  const updateNote = usePlannerStore((state) => state.updateNote);
  const clearNote = usePlannerStore((state) => state.clearNote);

  const editorRef = useRef<HTMLDivElement>(null);

  const selectedDateObject = useMemo(
    () => parseDateKey(selectedDate),
    [selectedDate],
  );
  const activeNote = notesByDate[selectedDate] ?? "";
  const savedDayCount = Object.keys(notesByDate).length;

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const numberOfDays = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + numberOfDays) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      if (index < startOffset) {
        return null;
      }

      const dayNumber = index - startOffset + 1;
      if (dayNumber > numberOfDays) {
        return null;
      }

      return new Date(year, month, dayNumber);
    });
  }, [visibleMonth]);

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== activeNote) {
      editorRef.current.innerHTML = activeNote;
    }
  }, [activeNote, selectedDate]);

  const saveCurrentNote = (html: string) => {
    const cleanedHtml = html === "<br>" ? "" : html;
    const plainText = stripHtml(cleanedHtml);
    updateNote(selectedDate, plainText.length === 0 ? "" : cleanedHtml);
  };

  const handleEditorInput = () => {
    saveCurrentNote(editorRef.current?.innerHTML ?? "");
  };

  const applyFormatting = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    saveCurrentNote(editorRef.current?.innerHTML ?? "");
  };

  const preventToolbarFocus = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const clearSelectedDayNote = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }

    clearNote(selectedDate);
  };

  const changeMonth = (direction: number) => {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + direction,
      1,
    );

    setVisibleMonth(nextMonth);
    setSelectedDate(createDateKey(nextMonth));
  };

  const jumpToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Monthly calendar
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-stone-900">
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <p className="text-sm text-stone-600">
              {savedDayCount} saved planning day{savedDayCount === 1 ? "" : "s"}
              .
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={jumpToToday}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((dayName) => (
            <div
              key={dayName}
              className="rounded-xl px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-500"
            >
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-24 rounded-2xl border border-transparent"
                />
              );
            }

            const dateKey = createDateKey(date);
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayKey;
            const notePreview = stripHtml(notesByDate[dateKey] ?? "");
            const hasNote = notePreview.length > 0;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`min-h-24 rounded-2xl border p-2 text-left transition ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-stone-200 bg-stone-50 hover:border-stone-400"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`text-sm font-semibold ${
                      isToday ? "text-emerald-700" : "text-stone-900"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {hasNote && (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  )}
                </div>

                <p className="truncate text-xs text-stone-500">
                  {hasNote ? notePreview : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-200/60 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              Plans for{" "}
              {selectedDateObject.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
            <p className="text-sm text-stone-600">
              Synced with your shared planner store and backend connection.
            </p>
          </div>

          <button
            type="button"
            onClick={clearSelectedDayNote}
            className="w-fit rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
          >
            Clear note
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { label: "Bold", command: "bold" },
            { label: "Italic", command: "italic" },
            { label: "Underline", command: "underline" },
            { label: "• List", command: "insertUnorderedList" },
          ].map((action) => (
            <button
              key={action.command}
              type="button"
              onMouseDown={preventToolbarFocus}
              onClick={() => applyFormatting(action.command)}
              className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-500 hover:text-emerald-700"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          data-placeholder="Write your plans for this day here..."
          className="note-editor min-h-56 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-emerald-500"
        />
      </div>
    </section>
  );
}

export default CalendarPlanner;
