/** One tab in the header. */
export interface Tab {
  id: string;
  label: string;
  /** the screen the tab opens */
  to: string;
  /** every screen that belongs to this tab, so it stays lit there */
  views: string[];
}

/** The sections the Stats screen can show; each app lists the ones it wants. */
export type StatsSection =
  | 'overall'
  | 'twoweeks'
  | 'areas'
  | 'bynote'
  | 'neck'
  | 'staff'
  | 'scales'
  | 'byscale'
  | 'weakest'
  | 'tempo'
  | 'data';

/** The rows the Setup screen can show; each app lists the ones it wants. */
export type SetupRow =
  | 'range'
  | 'acc'
  | 'pref'
  | 'appearance'
  | 'bass'
  | 'hints'
  | 'labels'
  | 'clefs'
  | 'mdo'
  | 'rhythm'
  | 'sound'
  | 'mic'
  | 'how'
  | 'data';
