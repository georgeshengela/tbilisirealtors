import { createContext, useContext } from 'react';

/** Lets any desk board open a listing in place instead of navigating away. */
export interface DeskListingApi {
  openListing: (id: string) => void;
  /** Bumps whenever a listing was changed from the desk window, so boards can reload. */
  version: number;
}

export const DeskListingContext = createContext<DeskListingApi>({ openListing: () => {}, version: 0 });

export function useDeskListing(): DeskListingApi {
  return useContext(DeskListingContext);
}
