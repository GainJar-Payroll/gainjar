export enum EVaultStatus {
  HEALTHY = 0,
  WARNING = 1,
  CRITICAL = 2,
  EMERGENCY = 3,
}

export const VaultStatusLabel: Record<EVaultStatus, string> = {
  [EVaultStatus.HEALTHY]: "HEALTHY",
  [EVaultStatus.WARNING]: "WARNING",
  [EVaultStatus.CRITICAL]: "CRITICAL",
  [EVaultStatus.EMERGENCY]: "EMERGENCY",
};
