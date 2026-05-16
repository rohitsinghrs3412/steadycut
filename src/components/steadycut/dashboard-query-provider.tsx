"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";

import { api } from "@convex/_generated/api";

type DashboardQueryResult = NonNullable<
  (typeof api.dashboard.getDashboard)["_returnType"]
>;

type DashboardQueryContextValue = {
  dashboard: DashboardQueryResult | undefined;
  isLoadingDashboard: boolean;
};

const DashboardQueryContext = createContext<DashboardQueryContextValue>({
  dashboard: undefined,
  isLoadingDashboard: false,
});

let lastDashboardSnapshot: DashboardQueryResult | undefined;
const dashboardSnapshotListeners = new Set<() => void>();

function getDashboardSnapshot() {
  return lastDashboardSnapshot;
}

function subscribeDashboardSnapshot(listener: () => void) {
  dashboardSnapshotListeners.add(listener);

  return () => {
    dashboardSnapshotListeners.delete(listener);
  };
}

function setDashboardSnapshot(nextDashboard: DashboardQueryResult | undefined) {
  if (lastDashboardSnapshot === nextDashboard) {
    return;
  }

  lastDashboardSnapshot = nextDashboard;
  for (const listener of dashboardSnapshotListeners) {
    listener();
  }
}

export function DashboardQueryProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const cachedDashboard = useSyncExternalStore(
    subscribeDashboardSnapshot,
    getDashboardSnapshot,
    getDashboardSnapshot
  );
  const liveDashboard = useQuery(
    api.dashboard.getDashboard,
    isLoaded && isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    if (liveDashboard) {
      setDashboardSnapshot(liveDashboard);
    } else if (isLoaded && !isSignedIn) {
      setDashboardSnapshot(undefined);
    }
  }, [isLoaded, isSignedIn, liveDashboard]);

  const dashboard = liveDashboard ?? cachedDashboard;

  const value = useMemo(
    () => ({
      dashboard,
      isLoadingDashboard:
        Boolean(isLoaded && isSignedIn) && !liveDashboard && !dashboard,
    }),
    [dashboard, isLoaded, isSignedIn, liveDashboard]
  );

  return (
    <DashboardQueryContext.Provider value={value}>
      {children}
    </DashboardQueryContext.Provider>
  );
}

export function useDashboardQuery() {
  return useContext(DashboardQueryContext);
}
