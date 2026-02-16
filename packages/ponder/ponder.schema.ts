import { onchainTable, onchainEnum, index } from "ponder";

// ============================================================================
// Enums
// ============================================================================

export const streamType = onchainEnum("stream_type", ["INFINITE", "FINITE"]);

export const vaultStatus = onchainEnum("vault_status", [
  "HEALTHY",
  "WARNING",
  "CRITICAL",
  "EMERGENCY",
]);

// ============================================================================
// Raw Events Tables
// ============================================================================

// StreamCreated events
export const streamCreatedEvent = onchainTable(
  "stream_created_event",
  (t) => ({
    id: t.text().primaryKey(), // tx hash + log index
    employer: t.hex().notNull(),
    employee: t.hex().notNull(),
    ratePerSecond: t.bigint().notNull(),
    startTime: t.bigint().notNull(),
    endTime: t.bigint().notNull(),
    totalAmount: t.bigint().notNull(),
    streamType: streamType().notNull(),
    finalPayout: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    employeeIdx: index().on(table.employee),
    timestampIdx: index().on(table.timestamp),
  })
);

// StreamPaused events
export const streamPausedEvent = onchainTable(
  "stream_paused_event",
  (t) => ({
    id: t.text().primaryKey(),
    employer: t.hex().notNull(),
    employee: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    employeeIdx: index().on(table.employee),
  })
);

// StreamEnded events
export const streamEndedEvent = onchainTable(
  "stream_ended_event",
  (t) => ({
    id: t.text().primaryKey(),
    employer: t.hex().notNull(),
    employee: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    employeeIdx: index().on(table.employee),
  })
);

// Withdrawal events
export const withdrawalEvent = onchainTable(
  "withdrawal_event",
  (t) => ({
    id: t.text().primaryKey(),
    employer: t.hex().notNull(),
    employee: t.hex().notNull(),
    amount: t.bigint().notNull(),
    fee: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    employeeIdx: index().on(table.employee),
    timestampIdx: index().on(table.timestamp),
  })
);

// Deposit events
export const depositEvent = onchainTable(
  "deposit_event",
  (t) => ({
    id: t.text().primaryKey(),
    employer: t.hex().notNull(),
    amount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    timestampIdx: index().on(table.timestamp),
  })
);

// RateUpdated events
export const rateUpdatedEvent = onchainTable(
  "rate_updated_event",
  (t) => ({
    id: t.text().primaryKey(),
    employer: t.hex().notNull(),
    employee: t.hex().notNull(),
    oldRate: t.bigint().notNull(),
    newRate: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    employeeIdx: index().on(table.employee),
  })
);

// Liquidation events
export const liquidationEvent = onchainTable(
  "liquidation_event",
  (t) => ({
    id: t.text().primaryKey(),
    employer: t.hex().notNull(),
    liquidator: t.hex().notNull(),
    totalPaid: t.bigint().notNull(),
    liquidatorReward: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    liquidatorIdx: index().on(table.liquidator),
  })
);

// ============================================================================
// Aggregated Data Tables
// ============================================================================

// Current state of each stream (one row per employer-employee pair)
export const stream = onchainTable(
  "stream",
  (t) => ({
    id: t.text().primaryKey(), // employer-employee
    employer: t.hex().notNull(),
    employee: t.hex().notNull(),
    ratePerSecond: t.bigint().notNull(),
    startTime: t.bigint().notNull(),
    endTime: t.bigint().notNull(),
    totalAmount: t.bigint().notNull(),
    streamType: streamType().notNull(),
    finalPayout: t.bigint().notNull(),
    totalWithdrawn: t.bigint().notNull(),
    isActive: t.boolean().notNull(),
    lastUpdated: t.bigint().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    employeeIdx: index().on(table.employee),
    isActiveIdx: index().on(table.isActive),
  })
);

// Employer vault state
export const vault = onchainTable(
  "vault",
  (t) => ({
    id: t.hex().primaryKey(), // employer address
    balance: t.bigint().notNull(),
    totalFlowRate: t.bigint().notNull(),
    totalDeposited: t.bigint().notNull(),
    totalWithdrawn: t.bigint().notNull(),
    activeEmployeeCount: t.integer().notNull(),
    status: vaultStatus().notNull(),
    lastUpdated: t.bigint().notNull(),
  }),
  (table) => ({
    statusIdx: index().on(table.status),
  })
);

// Employee aggregated data
export const employee = onchainTable(
  "employee",
  (t) => ({
    id: t.hex().primaryKey(), // employee address
    totalEarnedAllTime: t.bigint().notNull(),
    totalWithdrawnAllTime: t.bigint().notNull(),
    activeStreamCount: t.integer().notNull(),
    totalStreamCount: t.integer().notNull(),
    firstStreamTime: t.bigint(),
    lastWithdrawalTime: t.bigint(),
  }),
  (table) => ({
    activeStreamCountIdx: index().on(table.activeStreamCount),
  })
);

// ============================================================================
// Analytics Tables
// ============================================================================

// Daily statistics per employer
export const dailyEmployerStats = onchainTable(
  "daily_employer_stats",
  (t) => ({
    id: t.text().primaryKey(), // employer-date
    employer: t.hex().notNull(),
    date: t.bigint().notNull(), // Unix timestamp (start of day)
    totalDeposited: t.bigint().notNull(),
    totalWithdrawn: t.bigint().notNull(),
    avgVaultBalance: t.bigint().notNull(),
    activeEmployeeCount: t.integer().notNull(),
  }),
  (table) => ({
    employerIdx: index().on(table.employer),
    dateIdx: index().on(table.date),
  })
);

// Daily statistics per employee
export const dailyEmployeeStats = onchainTable(
  "daily_employee_stats",
  (t) => ({
    id: t.text().primaryKey(), // employee-date
    employee: t.hex().notNull(),
    date: t.bigint().notNull(),
    totalEarned: t.bigint().notNull(),
    totalWithdrawn: t.bigint().notNull(),
    activeStreamCount: t.integer().notNull(),
  }),
  (table) => ({
    employeeIdx: index().on(table.employee),
    dateIdx: index().on(table.date),
  })
);