"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AvailabilityEditor,
  toLocalInput,
} from "@/components/management/availability-editor";
import type { ManagedFeature, ManagedRoom, ManagedWindow } from "@/scheduling";

type RoomForm = {
  id: string | null;
  name: string;
  capacity: number;
  featureIds: string[];
  availability: ManagedWindow[];
};

const emptyRoom: RoomForm = {
  id: null,
  name: "",
  capacity: 6,
  featureIds: [],
  availability: [],
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<ManagedRoom[]>([]);
  const [features, setFeatures] = useState<ManagedFeature[]>([]);
  const [room, setRoom] = useState<RoomForm>(emptyRoom);
  const [newFeature, setNewFeature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const [roomsRes, featuresRes] = await Promise.all([
          fetch("/api/rooms", { cache: "no-store" }),
          fetch("/api/room-features", { cache: "no-store" }),
        ]);
        if (!roomsRes.ok || !featuresRes.ok) {
          throw new Error("Could not load rooms or features.");
        }
        const nextRooms = (await roomsRes.json()) as ManagedRoom[];
        const nextFeatures = (await featuresRes.json()) as ManagedFeature[];
        if (active) {
          setRooms(nextRooms);
          setFeatures(nextFeatures);
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Could not load data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const featureLabel = (id: string) =>
    features.find((f) => f.id === id)?.label ?? id;

  function startEdit(target: ManagedRoom) {
    setError(null);
    setRoom({
      id: target.id,
      name: target.name,
      capacity: target.capacity,
      featureIds: target.featureIds,
      availability: target.availability.map((w) => ({
        start: toLocalInput(w.start),
        end: toLocalInput(w.end),
      })),
    });
  }

  function toggleFeature(id: string) {
    setRoom((r) => ({
      ...r,
      featureIds: r.featureIds.includes(id)
        ? r.featureIds.filter((f) => f !== id)
        : [...r.featureIds, id],
    }));
  }

  async function saveRoom() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        room.id ? `/api/rooms/${room.id}` : "/api/rooms",
        {
          method: room.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: room.name,
            capacity: room.capacity,
            featureIds: room.featureIds,
            availability: room.availability,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await apiError(response, "Could not save room."));
      }
      setRoom(emptyRoom);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save room.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRoom(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Could not delete room.");
      }
      if (room.id === id) {
        setRoom(emptyRoom);
      }
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete room.");
    }
  }

  async function addFeature() {
    const label = newFeature.trim();
    if (!label) {
      return;
    }
    setError(null);
    try {
      const response = await fetch("/api/room-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!response.ok) {
        throw new Error(await apiError(response, "Could not create feature."));
      }
      setNewFeature("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create feature.");
    }
  }

  async function removeFeature(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/room-features/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not delete feature.");
      }
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete feature.");
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#1d2430]">Rooms</h1>
          <span className="text-sm text-[#687385]">{rooms.length} rooms</span>
        </div>

        {error ? (
          <p className="rounded-md border border-[#e5484d] bg-[#fbeaea] px-3 py-2 text-sm text-[#a3262b]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[#687385]">Loading…</p>
        ) : rooms.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#cfd6e0] p-4 text-sm text-[#687385]">
            No rooms yet. Create one on the right.
          </p>
        ) : (
          <ul className="grid gap-2">
            {rooms.map((r) => (
              <li
                className="flex items-start justify-between gap-3 rounded-md border border-[#e3e8ef] bg-white px-4 py-3"
                key={r.id}
              >
                <div>
                  <p className="font-medium text-[#1d2430]">
                    {r.name}
                    <span className="text-[#9aa4b2]"> · {r.capacity} seats</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[#687385]">
                    {r.featureIds.length > 0
                      ? r.featureIds.map(featureLabel).join(", ")
                      : "No features"}{" "}
                    · {r.availability.length} window
                    {r.availability.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-md border border-[#cfd6e0] px-3 py-1.5 text-sm font-medium text-[#253247] hover:bg-[#f6f7f9]"
                    onClick={() => startEdit(r)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md border border-[#e5484d] px-3 py-1.5 text-sm font-medium text-[#a3262b] hover:bg-[#fbeaea]"
                    onClick={() => removeRoom(r.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid h-fit gap-5">
        <section className="grid gap-4 rounded-lg border border-[#d9dee7] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#1d2430]">
            {room.id ? "Edit room" : "New room"}
          </h2>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#3c4656]">Name</span>
            <input
              className="h-10 rounded-md border border-[#cfd6e0] px-3"
              onChange={(e) => setRoom((r) => ({ ...r, name: e.target.value }))}
              value={room.name}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-[#3c4656]">Seats</span>
            <input
              className="h-10 rounded-md border border-[#cfd6e0] px-3"
              min={0}
              onChange={(e) =>
                setRoom((r) => ({ ...r, capacity: Number(e.target.value) }))
              }
              type="number"
              value={room.capacity}
            />
          </label>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-[#3c4656]">Features</span>
            {features.length === 0 ? (
              <p className="text-xs text-[#9aa4b2]">
                No features yet — add some below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <label
                    className="flex items-center gap-1.5 rounded-md bg-[#f6f7f9] px-2.5 py-1.5 text-sm"
                    key={feature.id}
                  >
                    <input
                      checked={room.featureIds.includes(feature.id)}
                      onChange={() => toggleFeature(feature.id)}
                      type="checkbox"
                    />
                    {feature.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <AvailabilityEditor
            onChange={(availability) => setRoom((r) => ({ ...r, availability }))}
            windows={room.availability}
          />
          <div className="flex gap-2">
            {room.id ? (
              <button
                className="h-10 rounded-md border border-[#cfd6e0] px-4 text-sm font-semibold text-[#253247]"
                onClick={() => setRoom(emptyRoom)}
                type="button"
              >
                Cancel
              </button>
            ) : null}
            <button
              className="h-10 flex-1 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={saving || room.name.trim().length === 0}
              onClick={saveRoom}
              type="button"
            >
              {saving ? "Saving…" : room.id ? "Save" : "Create"}
            </button>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-[#d9dee7] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#1d2430]">Features</h2>
          <div className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-md border border-[#cfd6e0] px-3 text-sm"
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void addFeature();
                }
              }}
              placeholder="New feature, e.g. Projector"
              value={newFeature}
            />
            <button
              className="h-10 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={newFeature.trim().length === 0}
              onClick={addFeature}
              type="button"
            >
              Add
            </button>
          </div>
          {features.length > 0 ? (
            <ul className="grid gap-1.5">
              {features.map((feature) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-md bg-[#f6f7f9] px-3 py-1.5 text-sm"
                  key={feature.id}
                >
                  <span className="text-[#3c4656]">{feature.label}</span>
                  <button
                    className="text-xs font-medium text-[#a3262b] hover:underline"
                    onClick={() => removeFeature(feature.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </main>
  );
}

async function apiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // ignore
  }
  return fallback;
}
