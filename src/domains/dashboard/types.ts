export interface DashboardSummary {
  readonly residentTotal: number;
  readonly residentsByFacility: ReadonlyArray<{
    facilityId: string;
    facilityName: string;
    count: number;
  }>;
  readonly expiredAlertCount: number;
  readonly upcomingAlertCount: number;
  readonly unbilledComprehensiveCount: number;
}
