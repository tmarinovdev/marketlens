const initializationKey = "marketlens-watchlist-initialized";

export function getInitializedWatchlistOwner(): string | null {
  try {
    return sessionStorage.getItem(initializationKey);
  } catch {
    return null;
  }
}

export function wasWatchlistInitialized(userId: string): boolean {
  return getInitializedWatchlistOwner() === userId;
}

// This records only whether the copy decision was made in this tab's login
// session. It stores no watchlist data or authentication credentials.
export function markWatchlistInitialized(userId: string | null) {
  try {
    if (userId) sessionStorage.setItem(initializationKey, userId);
    else sessionStorage.removeItem(initializationKey);
  } catch {
    // The provider's in-memory guard still prevents repeated copies on this page.
  }
}
