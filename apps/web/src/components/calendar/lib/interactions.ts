import { useCallback, useMemo, useReducer } from "react";
import type { CalendarEvent } from "@/scheduling";

export type Interaction =
  | { kind: "idle" }
  | {
      kind: "moving";
      eventId: string;
      originalStart: Date;
      originalEnd: Date;
      start: Date;
      end: Date;
      resourceId?: string;
    }
  | {
      kind: "resizing";
      eventId: string;
      start: Date;
      end: Date;
    }
  | {
      kind: "creating";
      anchor: Date;
      start: Date;
      end: Date;
    };

export const MIN_DURATION_MS = 15 * 60_000;

export type InteractionAction =
  | { type: "beginMove"; event: CalendarEvent }
  | { type: "updateMove"; start: Date; end: Date; resourceId?: string }
  | { type: "beginResize"; event: CalendarEvent }
  | { type: "updateResize"; end: Date }
  | { type: "beginCreate"; anchor: Date }
  | { type: "updateCreate"; cursor: Date }
  | { type: "idle" };

export function interactionReducer(
  state: Interaction,
  action: InteractionAction,
): Interaction {
  switch (action.type) {
    case "beginMove":
      return {
        kind: "moving",
        eventId: action.event.id,
        originalStart: action.event.start,
        originalEnd: action.event.end,
        start: action.event.start,
        end: action.event.end,
        resourceId: action.event.resourceId,
      };
    case "updateMove":
      if (state.kind !== "moving") {
        return state;
      }
      return {
        ...state,
        start: action.start,
        end: action.end,
        resourceId: action.resourceId ?? state.resourceId,
      };
    case "beginResize":
      return {
        kind: "resizing",
        eventId: action.event.id,
        start: action.event.start,
        end: action.event.end,
      };
    case "updateResize": {
      if (state.kind !== "resizing") {
        return state;
      }
      const minEnd = new Date(state.start.getTime() + MIN_DURATION_MS);
      const nextEnd =
        action.end.getTime() < minEnd.getTime() ? minEnd : action.end;
      return { ...state, end: nextEnd };
    }
    case "beginCreate":
      return {
        kind: "creating",
        anchor: action.anchor,
        start: action.anchor,
        end: new Date(action.anchor.getTime() + MIN_DURATION_MS),
      };
    case "updateCreate": {
      if (state.kind !== "creating") {
        return state;
      }
      const anchorMs = state.anchor.getTime();
      const cursorMs = action.cursor.getTime();
      if (cursorMs >= anchorMs) {
        const end = new Date(Math.max(cursorMs, anchorMs + MIN_DURATION_MS));
        return { ...state, start: state.anchor, end };
      }
      const start = new Date(Math.min(cursorMs, anchorMs - MIN_DURATION_MS));
      return { ...state, start, end: state.anchor };
    }
    case "idle":
      return { kind: "idle" };
    default:
      return state;
  }
}

export function hasRequiredConflict(
  events: CalendarEvent[],
  start: Date,
  end: Date,
  requiredParticipantIds: string[],
  ignoreEventId?: string,
): boolean {
  if (requiredParticipantIds.length === 0) {
    return false;
  }

  const required = new Set(requiredParticipantIds);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return events.some((event) => {
    if (event.id === ignoreEventId) {
      return false;
    }
    const overlap =
      event.start.getTime() < endMs && event.end.getTime() > startMs;
    if (!overlap) {
      return false;
    }
    return event.participantIds.some((id) => required.has(id));
  });
}

export type UseCalendarInteractionsResult = {
  interaction: Interaction;
  beginMove: (event: CalendarEvent) => void;
  updateMove: (start: Date, end: Date, resourceId?: string) => void;
  endMove: () => Interaction;
  beginResize: (event: CalendarEvent) => void;
  updateResize: (end: Date) => void;
  endResize: () => Interaction;
  beginCreate: (anchor: Date) => void;
  updateCreate: (cursor: Date) => void;
  endCreate: () => Interaction;
  cancel: () => void;
  conflictsForRequired: (
    start: Date,
    end: Date,
    requiredParticipantIds: string[],
    ignoreEventId?: string,
  ) => boolean;
};

export function useCalendarInteractions({
  events,
}: {
  events: CalendarEvent[];
}): UseCalendarInteractionsResult {
  const [interaction, dispatch] = useReducer(interactionReducer, {
    kind: "idle",
  });

  const beginMove = useCallback(
    (event: CalendarEvent) => dispatch({ type: "beginMove", event }),
    [],
  );
  const updateMove = useCallback(
    (start: Date, end: Date, resourceId?: string) =>
      dispatch({ type: "updateMove", start, end, resourceId }),
    [],
  );
  const beginResize = useCallback(
    (event: CalendarEvent) => dispatch({ type: "beginResize", event }),
    [],
  );
  const updateResize = useCallback(
    (end: Date) => dispatch({ type: "updateResize", end }),
    [],
  );
  const beginCreate = useCallback(
    (anchor: Date) => dispatch({ type: "beginCreate", anchor }),
    [],
  );
  const updateCreate = useCallback(
    (cursor: Date) => dispatch({ type: "updateCreate", cursor }),
    [],
  );
  const cancel = useCallback(() => dispatch({ type: "idle" }), []);

  // The "end*" callbacks return the pre-reset snapshot so the caller can commit.
  // useReducer doesn't expose the previous state, so we read the closure on each call.
  const endMove = useCallback((): Interaction => {
    const snapshot = interaction;
    dispatch({ type: "idle" });
    return snapshot;
  }, [interaction]);

  const endResize = useCallback((): Interaction => {
    const snapshot = interaction;
    dispatch({ type: "idle" });
    return snapshot;
  }, [interaction]);

  const endCreate = useCallback((): Interaction => {
    const snapshot = interaction;
    dispatch({ type: "idle" });
    return snapshot;
  }, [interaction]);

  const conflictsForRequired = useMemo(() => {
    return (
      start: Date,
      end: Date,
      requiredParticipantIds: string[],
      ignoreEventId?: string,
    ) =>
      hasRequiredConflict(
        events,
        start,
        end,
        requiredParticipantIds,
        ignoreEventId,
      );
  }, [events]);

  return {
    interaction,
    beginMove,
    updateMove,
    endMove,
    beginResize,
    updateResize,
    endResize,
    beginCreate,
    updateCreate,
    endCreate,
    cancel,
    conflictsForRequired,
  };
}
