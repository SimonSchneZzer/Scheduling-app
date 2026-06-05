import type { ParticipantRole } from "./types";

/** Availability window at the API boundary (ISO strings, not Date). */
export type ManagedWindow = {
  start: string;
  end: string;
};

export type ManagedParticipant = {
  id: string;
  name: string;
  defaultRole: ParticipantRole;
  availability: ManagedWindow[];
};

export type ManagedRoom = {
  id: string;
  name: string;
  capacity: number;
  featureIds: string[];
  availability: ManagedWindow[];
};

export type ManagedFeature = {
  id: string;
  label: string;
};

export type ParticipantInput = {
  name: string;
  defaultRole: ParticipantRole;
  availability: ManagedWindow[];
};

export type RoomInput = {
  name: string;
  capacity: number;
  featureIds: string[];
  availability: ManagedWindow[];
};

export type FeatureInput = {
  label: string;
};
