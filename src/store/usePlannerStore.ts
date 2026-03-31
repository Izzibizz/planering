import { create } from "zustand";

export type ChecklistKey = "personal" | "artworks";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt?: string;
};

type PlannerPageContent = {
  badge: string;
  title: string;
  subtitle: string;
};

type ChecklistGroup = {
  id: ChecklistKey;
  title: string;
  description: string;
  items: ChecklistItem[];
};

type PlannerData = {
  pageContent: PlannerPageContent;
  checklists: Record<ChecklistKey, ChecklistGroup>;
  calendarNotes: Record<string, string>;
  updatedAt: string | null;
};

type SyncState = "idle" | "loading" | "saving" | "synced" | "error";

type PlannerStore = PlannerData & {
  isLoading: boolean;
  syncState: SyncState;
  syncMessage: string;
  error: string | null;
  loadPlanner: () => Promise<void>;
  updateNote: (dateKey: string, html: string) => void;
  clearNote: (dateKey: string) => void;
  addChecklistItem: (listKey: ChecklistKey, text: string) => void;
  toggleChecklistItem: (listKey: ChecklistKey, itemId: string) => void;
  removeChecklistItem: (listKey: ChecklistKey, itemId: string) => void;
  clearCompleted: (listKey: ChecklistKey) => void;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const LOCAL_SNAPSHOT_KEY = "planering-zustand-snapshot";
const API_LABEL = API_BASE_URL || "the configured /api proxy";

const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

const defaultPlannerData: PlannerData = {
  pageContent: {
    badge: "Planering",
    title: "Utställning Västerås 25 april - 10 maj 2026",
    subtitle:
      "A light planning view for your exhibition calendar, personal tasks, and artwork checklist.",
  },
  checklists: {
    personal: {
      id: "personal",
      title: "My Checklist",
      description: "Add tasks, mark them as done, and remove them anytime.",
      items: [
        { id: "personal-1", text: "Plan tomorrow's tasks", done: true },
        { id: "personal-2", text: "Buy groceries", done: false },
        { id: "personal-3", text: "Reply to emails", done: false },
      ],
    },
    artworks: {
      id: "artworks",
      title: "Artworks to do",
      description: "Track artwork ideas, ongoing pieces, and finished work.",
      items: [
        { id: "artwork-1", text: "Finish portrait sketch", done: false },
        { id: "artwork-2", text: "Prime the new canvas", done: false },
        { id: "artwork-3", text: "Photograph completed artwork", done: true },
      ],
    },
  },
  calendarNotes: {},
  updatedAt: null,
};

let syncTimeout: number | undefined;

const toChecklistItems = (value: unknown): ChecklistItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<ChecklistItem[]>((items, item, index) => {
    if (!item || typeof item !== "object") {
      return items;
    }

    const candidate = item as Partial<ChecklistItem>;
    const text = typeof candidate.text === "string" ? candidate.text : "";

    if (!text) {
      return items;
    }

    items.push({
      id: String(candidate.id ?? `item-${index + 1}`),
      text,
      done: Boolean(candidate.done),
      ...(typeof candidate.createdAt === "string"
        ? { createdAt: candidate.createdAt }
        : {}),
    });

    return items;
  }, []);
};

const toChecklistGroup = (
  key: ChecklistKey,
  value: unknown,
  fallback: ChecklistGroup,
): ChecklistGroup => {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<ChecklistGroup>;

  return {
    id: key,
    title: typeof candidate.title === "string" ? candidate.title : fallback.title,
    description:
      typeof candidate.description === "string"
        ? candidate.description
        : fallback.description,
    items: toChecklistItems(candidate.items ?? fallback.items),
  };
};

const normalizePlannerData = (value: unknown): PlannerData => {
  if (!value || typeof value !== "object") {
    return defaultPlannerData;
  }

  const candidate = value as Partial<PlannerData> & {
    checklists?: Partial<Record<ChecklistKey, unknown>>;
  };

  const pageContent =
    candidate.pageContent && typeof candidate.pageContent === "object"
      ? {
          badge:
            typeof candidate.pageContent.badge === "string"
              ? candidate.pageContent.badge
              : defaultPlannerData.pageContent.badge,
          title:
            typeof candidate.pageContent.title === "string"
              ? candidate.pageContent.title
              : defaultPlannerData.pageContent.title,
          subtitle:
            typeof candidate.pageContent.subtitle === "string"
              ? candidate.pageContent.subtitle
              : defaultPlannerData.pageContent.subtitle,
        }
      : defaultPlannerData.pageContent;

  const notes =
    candidate.calendarNotes && typeof candidate.calendarNotes === "object"
      ? Object.fromEntries(
          Object.entries(candidate.calendarNotes).flatMap(([date, value]) => {
            if (typeof value === "string") {
              return [[date, value]];
            }

            if (value && typeof value === "object" && "content" in value) {
              const noteValue = value as { content?: unknown };

              if (typeof noteValue.content === "string") {
                return [[date, noteValue.content]];
              }
            }

            return [];
          }),
        )
      : {};

  return {
    pageContent,
    checklists: {
      personal: toChecklistGroup(
        "personal",
        candidate.checklists?.personal,
        defaultPlannerData.checklists.personal,
      ),
      artworks: toChecklistGroup(
        "artworks",
        candidate.checklists?.artworks,
        defaultPlannerData.checklists.artworks,
      ),
    },
    calendarNotes: notes,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
  };
};

const mergePlannerData = (
  remoteData: PlannerData,
  localData: PlannerData | null,
): PlannerData => {
  if (!localData) {
    return remoteData;
  }

  return {
    pageContent: remoteData.pageContent,
    checklists: {
      personal:
        localData.checklists.personal.items.length > 0
          ? localData.checklists.personal
          : remoteData.checklists.personal,
      artworks:
        localData.checklists.artworks.items.length > 0
          ? localData.checklists.artworks
          : remoteData.checklists.artworks,
    },
    calendarNotes:
      Object.keys(localData.calendarNotes).length > 0
        ? localData.calendarNotes
        : remoteData.calendarNotes,
    updatedAt: localData.updatedAt ?? remoteData.updatedAt,
  };
};

const readLocalSnapshot = (): PlannerData | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawSnapshot = window.localStorage.getItem(LOCAL_SNAPSHOT_KEY);
    return rawSnapshot ? normalizePlannerData(JSON.parse(rawSnapshot)) : null;
  } catch {
    return null;
  }
};

const toSnapshot = (state: PlannerStore | PlannerData): PlannerData => ({
  pageContent: state.pageContent,
  checklists: state.checklists,
  calendarNotes: state.calendarNotes,
  updatedAt: state.updatedAt,
});

const writeLocalSnapshot = (snapshot: PlannerData) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore local storage write errors.
  }
};

const syncPlannerSnapshot = async (snapshot: PlannerData) => {
  const attempts: Array<{ path: string; method: "PATCH" | "PUT" | "POST" }> = [
    { path: "/api/planner", method: "PATCH" },
    { path: "/api/planner", method: "PUT" },
    { path: "/api/planner", method: "POST" },
  ];

  let lastError = "The backend save endpoint is not available yet.";

  for (const attempt of attempts) {
    try {
      const response = await fetch(getApiUrl(attempt.path), {
        method: attempt.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(snapshot),
      });

      if (response.ok) {
        return;
      }

      lastError = `${attempt.method} ${attempt.path} returned ${response.status}`;
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unable to reach the backend.";
    }
  }

  throw new Error(lastError);
};

const queueSync = (
  get: () => PlannerStore,
  set: (
    partial:
      | Partial<PlannerStore>
      | ((state: PlannerStore) => Partial<PlannerStore>),
  ) => void,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.clearTimeout(syncTimeout);
  set({ syncState: "saving", syncMessage: "Saving changes...", error: null });

  syncTimeout = window.setTimeout(async () => {
    try {
      const snapshot = toSnapshot(get());
      await syncPlannerSnapshot(snapshot);
      set({
        syncState: "synced",
        syncMessage: `Changes synced via ${API_LABEL}.`,
        error: null,
      });
    } catch (error) {
      set({
        syncState: "error",
        syncMessage:
          "Saved locally. The backend save route still needs to accept updates.",
        error:
          error instanceof Error ? error.message : "Could not sync with the backend.",
      });
    }
  }, 600);
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  ...defaultPlannerData,
  isLoading: false,
  syncState: "idle",
  syncMessage: "Ready.",
  error: null,

  loadPlanner: async () => {
    set({
      isLoading: true,
      syncState: "loading",
      syncMessage: "Connecting to planering-backend...",
      error: null,
    });

    const localSnapshot = readLocalSnapshot();

    try {
      const response = await fetch(getApiUrl("/api/planner"));
      if (!response.ok) {
        throw new Error(`GET /api/planner returned ${response.status}`);
      }

      const remoteData = normalizePlannerData(await response.json());
      const mergedData = mergePlannerData(remoteData, localSnapshot);
      writeLocalSnapshot(mergedData);

      set({
        ...mergedData,
        isLoading: false,
        syncState: "synced",
        syncMessage: `Connected through ${API_LABEL}.`,
        error: null,
      });
    } catch (error) {
      const fallbackData = localSnapshot ?? defaultPlannerData;
      set({
        ...fallbackData,
        isLoading: false,
        syncState: localSnapshot ? "idle" : "error",
        syncMessage: localSnapshot
          ? "Using your saved local planner data."
          : "Could not connect to the backend.",
        error:
          error instanceof Error
            ? error.message
            : "Unable to load planner data.",
      });
    }
  },

  updateNote: (dateKey, html) => {
    set((state) => {
      const nextNotes = { ...state.calendarNotes };
      const cleanedHtml = html === "<br>" ? "" : html.trim();

      if (cleanedHtml.length === 0) {
        delete nextNotes[dateKey];
      } else {
        nextNotes[dateKey] = html;
      }

      const snapshot = toSnapshot({
        ...state,
        calendarNotes: nextNotes,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        calendarNotes: nextNotes,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
  },

  clearNote: (dateKey) => {
    set((state) => {
      const nextNotes = { ...state.calendarNotes };
      delete nextNotes[dateKey];

      const snapshot = toSnapshot({
        ...state,
        calendarNotes: nextNotes,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        calendarNotes: nextNotes,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
  },

  addChecklistItem: (listKey, text) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    set((state) => {
      const currentChecklist = state.checklists[listKey];
      const nextItems = [
        {
          id: `${listKey}-${Date.now()}`,
          text: trimmedText,
          done: false,
          createdAt: new Date().toISOString(),
        },
        ...currentChecklist.items,
      ];

      const nextChecklists = {
        ...state.checklists,
        [listKey]: {
          ...currentChecklist,
          items: nextItems,
        },
      };

      const snapshot = toSnapshot({
        ...state,
        checklists: nextChecklists,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        checklists: nextChecklists,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
  },

  toggleChecklistItem: (listKey, itemId) => {
    set((state) => {
      const currentChecklist = state.checklists[listKey];
      const nextChecklists = {
        ...state.checklists,
        [listKey]: {
          ...currentChecklist,
          items: currentChecklist.items.map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
        },
      };

      const snapshot = toSnapshot({
        ...state,
        checklists: nextChecklists,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        checklists: nextChecklists,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
  },

  removeChecklistItem: (listKey, itemId) => {
    set((state) => {
      const currentChecklist = state.checklists[listKey];
      const nextChecklists = {
        ...state.checklists,
        [listKey]: {
          ...currentChecklist,
          items: currentChecklist.items.filter((item) => item.id !== itemId),
        },
      };

      const snapshot = toSnapshot({
        ...state,
        checklists: nextChecklists,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        checklists: nextChecklists,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
  },

  clearCompleted: (listKey) => {
    set((state) => {
      const currentChecklist = state.checklists[listKey];
      const nextChecklists = {
        ...state.checklists,
        [listKey]: {
          ...currentChecklist,
          items: currentChecklist.items.filter((item) => !item.done),
        },
      };

      const snapshot = toSnapshot({
        ...state,
        checklists: nextChecklists,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        checklists: nextChecklists,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
  },
}));
