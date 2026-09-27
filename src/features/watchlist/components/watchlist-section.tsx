import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListPlus, X } from "lucide-react";
import { useEffect, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import type { InstrumentSearchResult } from "@/features/instruments/api/search-instruments";
import {
  getWatchlistInstrumentId,
  useWatchlistStore,
} from "../store/watchlist-store";

export function WatchlistSection() {
  const instruments = useWatchlistStore((state) => state.instruments);
  const hasHydrated = useWatchlistStore((state) => state.hasHydrated);
  const removeInstrument = useWatchlistStore((state) => state.removeInstrument);
  const reorderInstrument = useWatchlistStore(
    (state) => state.reorderInstrument,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const instrumentIds = instruments.map(getWatchlistInstrumentId);

  useEffect(() => {
    void Promise.resolve(useWatchlistStore.persist.rehydrate()).finally(() => {
      useWatchlistStore.setState({ hasHydrated: true });
    });
  }, []);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;

    reorderInstrument(String(active.id), String(over.id));
  }

  return (
    <section
      aria-labelledby="watchlist-heading"
      className="rounded-2xl border border-glass-border bg-glass px-4 py-4 shadow-sm backdrop-blur-xl sm:px-5"
    >
      <div className="flex items-start gap-3">
        <ListPlus
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <div>
          <h2
            id="watchlist-heading"
            className="font-semibold tracking-tight text-foreground"
          >
            My Watchlist
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Search for an instrument to add it. Use × to remove it.
          </p>
        </div>
      </div>

      <div className="mt-4 min-h-10">
        {!hasHydrated ? null : instruments.length === 0 ? (
          <p className="flex min-h-10 items-center text-sm text-muted-foreground">
            Your watchlist is empty.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={instrumentIds}
              strategy={rectSortingStrategy}
            >
              <ul
                aria-label="Watchlist instruments"
                className="flex flex-wrap gap-2.5"
              >
                {instruments.map((instrument) => (
                  <SortableWatchlistItem
                    key={getWatchlistInstrumentId(instrument)}
                    instrument={instrument}
                    onRemove={removeInstrument}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}

interface SortableWatchlistItemProps {
  readonly instrument: InstrumentSearchResult;
  readonly onRemove: (provider: string, providerAssetId: string) => void;
}

function SortableWatchlistItem({
  instrument,
  onRemove,
}: SortableWatchlistItemProps) {
  const id = getWatchlistInstrumentId(instrument);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex h-10 items-center gap-0.5 rounded-xl border border-border-accent bg-background/75 px-1.5 shadow-xs data-[dragging=true]:opacity-70"
      data-dragging={isDragging}
      title={instrument.name}
    >
      <button
        type="button"
        className="flex size-7 touch-none cursor-grab items-center justify-center rounded-md text-primary outline-none hover:bg-accent active:cursor-grabbing focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Reorder ${instrument.symbol}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <span className="px-1.5 text-sm font-semibold text-foreground">
        {instrument.symbol}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-primary hover:text-primary"
        aria-label={`Remove ${instrument.symbol} from watchlist`}
        onClick={() =>
          onRemove(instrument.provider, instrument.providerAssetId)
        }
      >
        <X aria-hidden="true" className="size-3.5" />
      </Button>
    </li>
  );
}
