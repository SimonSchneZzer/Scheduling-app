"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AvailabilityEditor,
  toLocalInput,
} from "@/components/management/availability-editor";
import type {
  ManagedParticipant,
  ManagedWindow,
  ParticipantRole,
} from "@/scheduling";

type FormState = {
  id: string | null;
  name: string;
  defaultRole: ParticipantRole;
  availability: ManagedWindow[];
};

const emptyForm: FormState = {
  id: null,
  name: "",
  defaultRole: "required",
  availability: [],
};

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ManagedParticipant[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const response = await fetch("/api/participants", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load participants.");
        }
        const data = (await response.json()) as ManagedParticipant[];
        if (active) {
          setParticipants(data);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Could not load participants.",
          );
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

  function startEdit(participant: ManagedParticipant) {
    setError(null);
    setForm({
      id: participant.id,
      name: participant.name,
      defaultRole: participant.defaultRole,
      availability: participant.availability.map((w) => ({
        start: toLocalInput(w.start),
        end: toLocalInput(w.end),
      })),
    });
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const body = JSON.stringify({
        name: form.name,
        defaultRole: form.defaultRole,
        availability: form.availability,
      });
      const response = await fetch(
        form.id ? `/api/participants/${form.id}` : "/api/participants",
        {
          method: form.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      if (!response.ok) {
        throw new Error(await apiError(response, "Could not save participant."));
      }
      setForm(emptyForm);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save participant.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not delete participant.");
      }
      if (form.id === id) {
        setForm(emptyForm);
      }
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete participant.");
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1fr_360px]">
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#1d2430]">Participants</h1>
          <span className="text-sm text-[#687385]">{participants.length} people</span>
        </div>

        {error ? (
          <p className="rounded-md border border-[#e5484d] bg-[#fbeaea] px-3 py-2 text-sm text-[#a3262b]">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[#687385]">Loading…</p>
        ) : participants.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#cfd6e0] p-4 text-sm text-[#687385]">
            No participants yet. Create one on the right.
          </p>
        ) : (
          <ul className="grid gap-2">
            {participants.map((participant) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border border-[#e3e8ef] bg-white px-4 py-3"
                key={participant.id}
              >
                <div>
                  <p className="font-medium text-[#1d2430]">{participant.name}</p>
                  <p className="text-xs text-[#687385] capitalize">
                    {participant.defaultRole} ·{" "}
                    {participant.availability.length} availability window
                    {participant.availability.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="rounded-md border border-[#cfd6e0] px-3 py-1.5 text-sm font-medium text-[#253247] hover:bg-[#f6f7f9]"
                    onClick={() => startEdit(participant)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md border border-[#e5484d] px-3 py-1.5 text-sm font-medium text-[#a3262b] hover:bg-[#fbeaea]"
                    onClick={() => remove(participant.id)}
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

      <section className="grid h-fit gap-4 rounded-lg border border-[#d9dee7] bg-white p-4">
        <h2 className="text-sm font-semibold text-[#1d2430]">
          {form.id ? "Edit person" : "New person"}
        </h2>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-[#3c4656]">Name</span>
          <input
            className="h-10 rounded-md border border-[#cfd6e0] px-3"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            value={form.name}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-[#3c4656]">Default role</span>
          <select
            className="h-10 rounded-md border border-[#cfd6e0] px-3 capitalize"
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                defaultRole: e.target.value as ParticipantRole,
              }))
            }
            value={form.defaultRole}
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
          </select>
        </label>
        <AvailabilityEditor
          onChange={(availability) => setForm((f) => ({ ...f, availability }))}
          windows={form.availability}
        />
        <div className="flex gap-2">
          {form.id ? (
            <button
              className="h-10 rounded-md border border-[#cfd6e0] px-4 text-sm font-semibold text-[#253247]"
              onClick={() => setForm(emptyForm)}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          <button
            className="h-10 flex-1 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving || form.name.trim().length === 0}
            onClick={save}
            type="button"
          >
            {saving ? "Saving…" : form.id ? "Save" : "Create"}
          </button>
        </div>
      </section>
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
