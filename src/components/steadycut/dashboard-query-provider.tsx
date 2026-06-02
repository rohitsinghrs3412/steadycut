"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  createContext,
  useCallback,
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

const lastDashboardSnapshots = new Map<string, DashboardQueryResult>();
const dashboardSnapshotListeners = new Set<() => void>();

function getDashboardSnapshot(userId: string | null | undefined) {
  return userId ? lastDashboardSnapshots.get(userId) : undefined;
}

function subscribeDashboardSnapshot(listener: () => void) {
  dashboardSnapshotListeners.add(listener);

  return () => {
    dashboardSnapshotListeners.delete(listener);
  };
}

function notifyDashboardSnapshotListeners() {
  for (const listener of dashboardSnapshotListeners) {
    listener();
  }
}

function setDashboardSnapshot(userId: string, nextDashboard: DashboardQueryResult) {
  if (lastDashboardSnapshots.get(userId) === nextDashboard) {
    return;
  }

  lastDashboardSnapshots.set(userId, nextDashboard);
  notifyDashboardSnapshotListeners();
}

function clearDashboardSnapshots() {
  if (lastDashboardSnapshots.size === 0) {
    return;
  }

  lastDashboardSnapshots.clear();
  notifyDashboardSnapshotListeners();
}

export function DashboardQueryProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const getSnapshot = useCallback(
    () => getDashboardSnapshot(userId),
    [userId]
  );
  const cachedDashboard = useSyncExternalStore(
    subscribeDashboardSnapshot,
    getSnapshot,
    getSnapshot
  );
  const canQueryDashboard = Boolean(isLoaded && isSignedIn && userId);
  const liveDashboard = useQuery(
    api.dashboard.getDashboard,
    canQueryDashboard ? {} : "skip"
  );

  useEffect(() => {
    if (userId && liveDashboard) {
      setDashboardSnapshot(userId, liveDashboard);
    } else if (isLoaded && !isSignedIn) {
      clearDashboardSnapshots();
    }
  }, [isLoaded, isSignedIn, liveDashboard, userId]);

  const dashboard = canQueryDashboard ? liveDashboard ?? cachedDashboard : undefined;

  const value = useMemo(
    () => ({
      dashboard,
      isLoadingDashboard:
        canQueryDashboard && !liveDashboard && !dashboard,
    }),
    [canQueryDashboard, dashboard, liveDashboard]
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
