import { create } from "zustand";

export type ChecklistKey = "personal" | "artworks";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt?: string;
};

export type GalleryImage = {
  id: string;
  publicId?: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  caption: string;
  uploadedAt?: string;
};

type PlannerPageContent = {
  badge: string;
  title: string;
  subtitle: string;
};

type GalleryState = {
  featuredImageId: string | null;
  images: GalleryImage[];
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
  gallery: GalleryState;
  updatedAt: string | null;
};

type SyncState = "idle" | "loading" | "saving" | "synced" | "error";

type PlannerStore = PlannerData & {
  isLoading: boolean;
  syncState: SyncState;
  syncMessage: string;
  error: string | null;
  loadPlanner: () => Promise<void>;
  updatePageContent: (updates: Partial<PlannerPageContent>) => void;
  updateNote: (dateKey: string, html: string) => void;
  clearNote: (dateKey: string) => void;
  addChecklistItem: (listKey: ChecklistKey, text: string) => void;
  updateChecklistItemText: (
    listKey: ChecklistKey,
    itemId: string,
    text: string,
  ) => void;
  reorderChecklistItems: (
    listKey: ChecklistKey,
    activeItemId: string,
    overItemId: string,
  ) => void;
  toggleChecklistItem: (listKey: ChecklistKey, itemId: string) => void;
  removeChecklistItem: (listKey: ChecklistKey, itemId: string) => void;
  clearCompleted: (listKey: ChecklistKey) => void;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);
const LOCAL_SNAPSHOT_KEY = "planering-zustand-snapshot-v2";
const LEGACY_LOCAL_SNAPSHOT_KEY = "planering-zustand-snapshot";
const API_LABEL = API_BASE_URL || "/api-proxyn";

const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

const defaultPlannerData: PlannerData = {
  pageContent: {
    badge: "Planering",
    title: "Utställning Västerås 25 april - 10 maj 2026",
    subtitle:
      "En enkel planeringsvy för utställningskalendern, personliga uppgifter och konstlistan.",
  },
  checklists: {
    personal: {
      id: "personal",
      title: "Min checklista",
      description:
        "Lägg till uppgifter, markera dem som klara och ta bort dem när du vill.",
      items: [
        {
          id: "personal-1",
          text: "Planera morgondagens uppgifter",
          done: true,
        },
        { id: "personal-2", text: "Handla mat", done: false },
        { id: "personal-3", text: "Svara på mejl", done: false },
      ],
    },
    artworks: {
      id: "artworks",
      title: "Konst att göra",
      description: "Följ idéer, pågående verk och färdiga arbeten.",
      items: [
        { id: "artwork-1", text: "Gör klart porträttskissen", done: false },
        { id: "artwork-2", text: "Grunda den nya duken", done: false },
        { id: "artwork-3", text: "Fotografera det färdiga verket", done: true },
      ],
    },
  },
  calendarNotes: {},
  gallery: {
    featuredImageId: null,
    images: [],
  },
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
    title:
      typeof candidate.title === "string" ? candidate.title : fallback.title,
    description:
      typeof candidate.description === "string"
        ? candidate.description
        : fallback.description,
    items: toChecklistItems(candidate.items ?? fallback.items),
  };
};

const toGalleryImages = (value: unknown): GalleryImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<GalleryImage[]>((images, item, index) => {
    if (!item || typeof item !== "object") {
      return images;
    }

    const candidate = item as Partial<GalleryImage>;
    const url = typeof candidate.url === "string" ? candidate.url : "";

    if (!url) {
      return images;
    }

    images.push({
      id: String(candidate.id ?? `gallery-image-${index + 1}`),
      publicId:
        typeof candidate.publicId === "string" ? candidate.publicId : undefined,
      url,
      thumbnailUrl:
        typeof candidate.thumbnailUrl === "string"
          ? candidate.thumbnailUrl
          : url,
      alt: typeof candidate.alt === "string" ? candidate.alt : "",
      caption:
        typeof candidate.caption === "string"
          ? candidate.caption
          : typeof candidate.alt === "string"
            ? candidate.alt
            : "",
      uploadedAt:
        typeof candidate.uploadedAt === "string"
          ? candidate.uploadedAt
          : undefined,
    });

    return images;
  }, []);
};

const normalizePlannerData = (value: unknown): PlannerData => {
  if (!value || typeof value !== "object") {
    return defaultPlannerData;
  }

  const candidate = value as Partial<PlannerData> & {
    checklists?: Partial<Record<ChecklistKey, unknown>>;
    gallery?: {
      featuredImageId?: unknown;
      images?: unknown;
    };
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

  const galleryImages = toGalleryImages(candidate.gallery?.images);
  const featuredImageId =
    typeof candidate.gallery?.featuredImageId === "string"
      ? candidate.gallery.featuredImageId
      : null;
  const normalizedFeaturedImageId = galleryImages.some(
    (image) => image.id === featuredImageId,
  )
    ? featuredImageId
    : (galleryImages[0]?.id ?? null);

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
    gallery: {
      featuredImageId: normalizedFeaturedImageId,
      images: galleryImages,
    },
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
  };
};

type HealthPayload = {
  status?: string;
  storage?: "file" | "mongo";
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

const clearLegacyLocalSnapshot = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_LOCAL_SNAPSHOT_KEY);
  } catch {
    // Ignore local storage cleanup errors.
  }
};

const toSnapshot = (state: PlannerStore | PlannerData): PlannerData => ({
  pageContent: state.pageContent,
  checklists: state.checklists,
  calendarNotes: state.calendarNotes,
  gallery: state.gallery,
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

  let lastError = "Backendens sparfunktion är inte tillgänglig ännu.";

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
        error instanceof Error ? error.message : "Kunde inte nå backend.";
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
  set({ syncState: "saving", syncMessage: "Sparar ändringar...", error: null });

  syncTimeout = window.setTimeout(async () => {
    try {
      const snapshot = toSnapshot(get());
      await syncPlannerSnapshot(snapshot);
      set({
        syncState: "synced",
        syncMessage: `Ändringarna synkades via ${API_LABEL}.`,
        error: null,
      });
    } catch (error) {
      set({
        syncState: "error",
        syncMessage: "Sparat lokalt. Backend kunde inte ta emot ändringarna.",
        error:
          error instanceof Error
            ? error.message
            : "Kunde inte synka med backend.",
      });
    }
  }, 600);
};

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  ...defaultPlannerData,
  isLoading: false,
  syncState: "idle",
  syncMessage: "Redo.",
  error: null,

  loadPlanner: async () => {
    set({
      isLoading: true,
      syncState: "loading",
      syncMessage: "Ansluter till planering-backend...",
      error: null,
    });

    const localSnapshot = readLocalSnapshot();

    try {
      const [plannerResponse, healthPayload] = await Promise.all([
        fetch(getApiUrl("/api/planner")),
        fetch(getApiUrl("/api/health"))
          .then(async (response) => {
            if (!response.ok) {
              return null;
            }

            return (await response.json()) as HealthPayload;
          })
          .catch(() => null),
      ]);

      if (!plannerResponse.ok) {
        throw new Error(`GET /api/planner returned ${plannerResponse.status}`);
      }

      const remoteData = normalizePlannerData(await plannerResponse.json());
      clearLegacyLocalSnapshot();
      writeLocalSnapshot(remoteData);

      const usingFallbackStorage = healthPayload?.storage === "file";

      set({
        ...remoteData,
        isLoading: false,
        syncState: usingFallbackStorage ? "error" : "synced",
        syncMessage: usingFallbackStorage
          ? "Ansluten, men backend använder tillfällig reservlagring."
          : `Ansluten via ${API_LABEL}.`,
        error: usingFallbackStorage
          ? "Render når inte MongoDB ännu, så data kan återställas efter en omstart."
          : null,
      });
    } catch (error) {
      const fallbackData = localSnapshot ?? defaultPlannerData;
      set({
        ...fallbackData,
        isLoading: false,
        syncState: localSnapshot ? "idle" : "error",
        syncMessage: localSnapshot
          ? "Visar din lokalt sparade planering."
          : "Kunde inte ansluta till backend.",
        error:
          error instanceof Error
            ? error.message
            : "Kunde inte ladda planeringen.",
      });
    }
  },

  updatePageContent: (updates) => {
    set((state) => {
      const nextPageContent = {
        ...state.pageContent,
        ...updates,
      };

      const snapshot = toSnapshot({
        ...state,
        pageContent: nextPageContent,
        updatedAt: new Date().toISOString(),
      });
      writeLocalSnapshot(snapshot);

      return {
        pageContent: nextPageContent,
        updatedAt: snapshot.updatedAt,
      };
    });

    queueSync(get, set);
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

  updateChecklistItemText: (listKey, itemId, text) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    set((state) => {
      const currentChecklist = state.checklists[listKey];
      const nextChecklists = {
        ...state.checklists,
        [listKey]: {
          ...currentChecklist,
          items: currentChecklist.items.map((item) =>
            item.id === itemId ? { ...item, text: trimmedText } : item,
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

  reorderChecklistItems: (listKey, activeItemId, overItemId) => {
    set((state) => {
      const currentChecklist = state.checklists[listKey];
      const activeIndex = currentChecklist.items.findIndex(
        (item) => item.id === activeItemId,
      );
      const overIndex = currentChecklist.items.findIndex(
        (item) => item.id === overItemId,
      );

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return {};
      }

      const nextItems = [...currentChecklist.items];
      const [movedItem] = nextItems.splice(activeIndex, 1);
      nextItems.splice(overIndex, 0, movedItem);

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
