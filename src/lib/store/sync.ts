import type { Payload } from './types';

/** Anything that can keep a copy of the progress payload somewhere other than
    this browser. The store calls load() once at start-up and save() after
    every debounced write. */
export interface SyncAdapter {
  /** Short name for the Stats screen, e.g. "Firebase". */
  readonly name: string;
  load(): Promise<Payload | null>;
  save(payload: Payload): Promise<void>;
}

/* ---------------- Firebase (not wired up yet) ----------------
   This is the stub the apps will fill in once there is a Firebase project.
   The plan, so the shape of this file does not have to change later:

     1. Sign in with Firebase Auth (Google sign-in is the simplest on Android).
     2. Keep one Firestore document per app per user:
          users/{uid}/apps/{appId}   ->  the Payload, as is
        A payload is a few tens of kilobytes at most, far inside one document.
     3. load() reads that document; save() writes it with set().
     4. Turn on Firestore's offline persistence, so practising on the bus with
        no signal still saves and catches up later.

   Until then load() rejects, which the store treats exactly like "no sync
   configured": everything stays in this browser, and the Stats screen says so. */
export interface FirebaseSyncOptions {
  appId: string;
  /** The web-app config from the Firebase console. */
  config?: Record<string, string>;
}

export class FirebaseSync implements SyncAdapter {
  readonly name = 'Firebase';
  constructor(readonly opts: FirebaseSyncOptions) {}
  async load(): Promise<Payload | null> {
    // TODO(firebase): sign in, then read users/{uid}/apps/{appId}
    throw new Error('Firebase sync is not set up yet');
  }
  async save(_payload: Payload): Promise<void> {
    // TODO(firebase): write users/{uid}/apps/{appId}
  }
}
