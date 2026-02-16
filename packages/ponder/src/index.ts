import { ponder } from "ponder:registry";
import {
    streamCreatedEvent,
    stream,
    vault,
    streamPausedEvent,
    streamEndedEvent,
    employee,
} from "ponder:schema";

// ============================================================================
// Helper Functions
// ============================================================================

function getStreamId(employer: string, employee: string): string {
    return `${employer}-${employee}`;
}

function getEventId(txHash: string, logIndex: bigint): string {
    return `${txHash}-${logIndex}`;
}

function getDayTimestamp(timestamp: bigint): bigint {
    return (timestamp / 86400n) * 86400n; // Round down to start of day
}

function getDailyStatsId(address: string, timestamp: bigint): string {
    const dayTimestamp = getDayTimestamp(timestamp);
    return `${address}-${dayTimestamp}`;
}

// ============================================================================
// StreamCreated Event
// ============================================================================

ponder.on("GainJar:StreamCreated", async ({ event, context }) => {
    const { _employer, _employee, _ratePerSecond, _startTime, _endTime, _totalAmount, _finalPayout, _type } =
        event.args;

    // 1. Store raw event
    await context.db.insert(streamCreatedEvent).values({
        id: getEventId(event.transaction.hash, BigInt(event.log.logIndex)),
        employer: _employer,
        employee: _employee,
        ratePerSecond: _ratePerSecond,
        startTime: _startTime,
        endTime: _endTime,
        totalAmount: _totalAmount,
        streamType: _type === 0 ? "INFINITE" : "FINITE",
        finalPayout: _finalPayout,
        timestamp: event.block.timestamp,
        blockNumber: event.block.number,
    });

    // 2. Create/update stream state
    const streamId = getStreamId(_employer, _employee);
    await context.db.insert(stream).values({
        id: streamId,
        employer: _employer,
        employee: _employee,
        ratePerSecond: _ratePerSecond,
        startTime: _startTime,
        endTime: _endTime,
        totalAmount: _totalAmount,
        streamType: _type === 0 ? "INFINITE" : "FINITE",
        finalPayout: _finalPayout,
        totalWithdrawn: 0n,
        isActive: true,
        lastUpdated: event.block.timestamp,
    }).onConflictDoUpdate({
        ratePerSecond: _ratePerSecond,
        startTime: _startTime,
        endTime: _endTime,
        totalAmount: _totalAmount,
        streamType: _type === 0 ? "INFINITE" : "FINITE",
        finalPayout: _finalPayout,
        isActive: true,
        lastUpdated: event.block.timestamp,
    })


    // Create vault if doesn't exist (will be updated by Deposited event)
    await context.db.insert(vault).values({
        id: _employer,
        balance: 0n,
        totalFlowRate: _ratePerSecond,
        totalDeposited: 0n,
        totalWithdrawn: 0n,
        activeEmployeeCount: 1,
        status: "HEALTHY",
        lastUpdated: event.block.timestamp,
    }).onConflictDoUpdate((row) => ({
        totalFlowRate: row.totalFlowRate + _ratePerSecond,
        activeEmployeeCount: row.activeEmployeeCount + 1,
        lastUpdated: event.block.timestamp,
    }))

    // 4. Update/create employee stats
    await context.db.insert(employee).values({
        id: _employee,
        totalEarnedAllTime: 0n,
        totalWithdrawnAllTime: 0n,
        activeStreamCount: 1,
        totalStreamCount: 1,
        firstStreamTime: event.block.timestamp,
        lastWithdrawalTime: null,
    }).onConflictDoUpdate(row => ({

        activeStreamCount: row.activeStreamCount + 1,
        totalStreamCount: row.totalStreamCount + 1,
    }));
});

// ============================================================================
// StreamPaused Event
// ============================================================================

ponder.on("GainJar:StreamPaused", async ({ event, context }) => {
    const { _employer, _employee } = event.args;

    // 1. Store raw event
    await context.db.insert(streamPausedEvent).values({
        id: getEventId(event.transaction.hash, BigInt(event.log.logIndex)),
        employer: _employer,
        employee: _employee,
        timestamp: event.block.timestamp,
        blockNumber: event.block.number,
    });

    // 2. Update stream state
    const streamId = getStreamId(_employer, _employee);
    const _stream = await context.db.find(stream, { id: streamId });

    if (_stream) {
        await context.db.update(stream, { id: streamId }).set({
            isActive: false,
            lastUpdated: event.block.timestamp,
        });

        // 3. Update vault (decrease flow rate and active count)

        await context.db.update(vault, { id: _employer }).set(row => ({
            totalFlowRate: row.totalFlowRate - _stream.ratePerSecond,
            activeEmployeeCount: Math.max(0, row.activeEmployeeCount - 1),
            lastUpdated: event.block.timestamp,
        }));

        // 4. Update employee stats
        await context.db.update(employee, { id: _employee }).set(row => ({
            id: _employee,
            activeStreamCount: Math.max(0, row.activeStreamCount - 1),
        }));
    }
});

// ============================================================================
// StreamEnded Event
// ============================================================================

ponder.on("GainJar:StreamEnded", async ({ event, context }) => {
    const { _employer, _employee } = event.args;

    // 1. Store raw event
    await context.db.insert(streamEndedEvent).values({
        id: getEventId(event.transaction.hash, BigInt(event.log.logIndex)),
        employer: _employer,
        employee: _employee,
        timestamp: event.block.timestamp,
        blockNumber: event.block.number,
    });

    // 2. Update stream state
    const streamId = getStreamId(_employer, _employee);
    const _stream = await context.db.find(stream, { id: streamId });

    if (_stream) {
        await context.db.update(stream, { id: streamId }).set({
            isActive: false,
            lastUpdated: event.block.timestamp,
        });

        // 3. Update vault
        const _vault = await context.db.find(vault, { id: _employer });

        if (_vault && _stream.isActive) {
            await context.db.update(vault, { id: _employer }).set({
                totalFlowRate: _vault.totalFlowRate - _stream.ratePerSecond,
                activeEmployeeCount: Math.max(0, _vault.activeEmployeeCount - 1),
                lastUpdated: event.block.timestamp,
            });
        }

        // 4. Update employee stats
        const __employee = await context.db.find(employee, { id: _employee });
        if (__employee && _stream.isActive) {
            await context.db.update(employee, { id: _employee }).set({
                activeStreamCount: Math.max(0, __employee.activeStreamCount - 1),
            });
        }
    }
});

// ============================================================================
// Withdrawal Event
// ============================================================================

// ponder.on("GainJar:Withdrawal", async ({ event, context }) => {
//     const { _employee, _amount, _fee } = event.args;

//     // 1. Store raw event
//     await context.db.insert(withdrawalEvent).values({
//         id: getEventId(event.transaction.hash, BigInt(event.log.logIndex)),
//         employer: _employer,
//         employee: _employee,
//         amount: _amount,
//         fee: _fee,
//         timestamp: event.block.timestamp,
//         blockNumber: event.block.number,
//     });

//     // 2. Update stream totalWithdrawn
//     const streamId = getStreamId(_employer, _employee);

//     await context.db.update(stream, { id: streamId }).set(row => ({
//         totalWithdrawn: row.totalWithdrawn + _amount,
//         lastUpdated: event.block.timestamp,
//     }));

//     // 3. Update vault
//     await context.db.update(vault, { id: _employer }).set(row => ({
//         balance: row.balance - _amount,
//         totalWithdrawn: row.totalWithdrawn + _amount,
//         lastUpdated: event.block.timestamp,
//     }));

//     // 4. Update employee stats
//     await context.db.update(employee, { id: _employee }).set(row => ({
//         totalWithdrawnAllTime: row.totalWithdrawnAllTime + _amount,
//         lastWithdrawalTime: event.block.timestamp,
//     }));

//     const __employee = await context.db.find(employee, { id: _employee })

//     // 5. Update daily stats (employee)
//     const dailyEmployeeStatsId = getDailyStatsId(_employee, event.block.timestamp);
//     await context.db.insert(dailyEmployeeStats).values({
//         id: dailyEmployeeStatsId,
//         employee: _employee,
//         date: getDayTimestamp(event.block.timestamp),
//         totalEarned: 0n,
//         totalWithdrawn: _amount,
//         activeStreamCount: __employee?.activeStreamCount || 0,
//     }).onConflictDoUpdate(row => ({
//         totalWithdrawn: row.totalWithdrawn + _amount,
//     }));
// });

// ============================================================================
// Deposited Event
// ============================================================================

// ponder.on("GainJar:Deposited", async ({ event, context }) => {
//   const { _employer, _amount } = event.args;

//   // 1. Store raw event
//   await context.db.depositEvent.create({
//     id: getEventId(event.transaction.hash, event.log.logIndex),
//     data: {
//       employer: _employer,
//       amount: _amount,
//       timestamp: event.block.timestamp,
//       blockNumber: event.block.number,
//     },
//   });

//   // 2. Update vault
//   const vault = await context.db.vault.findUnique({ id: _employer });
//   if (vault) {
//     await context.db.vault.update({
//       id: _employer,
//       data: {
//         balance: vault.balance + _amount,
//         totalDeposited: vault.totalDeposited + _amount,
//         lastUpdated: event.block.timestamp,
//       },
//     });
//   } else {
//     await context.db.vault.create({
//       id: _employer,
//       data: {
//         balance: _amount,
//         totalFlowRate: 0n,
//         totalDeposited: _amount,
//         totalWithdrawn: 0n,
//         activeEmployeeCount: 0,
//         status: "HEALTHY",
//         lastUpdated: event.block.timestamp,
//       },
//     });
//   }

//   // 3. Update daily stats (employer)
//   const dailyEmployerStatsId = getDailyStatsId(_employer, event.block.timestamp);
//   await context.db.dailyEmployerStats.upsert({
//     id: dailyEmployerStatsId,
//     create: {
//       employer: _employer,
//       date: getDayTimestamp(event.block.timestamp),
//       totalDeposited: _amount,
//       totalWithdrawn: 0n,
//       avgVaultBalance: vault ? vault.balance + _amount : _amount,
//       activeEmployeeCount: vault?.activeEmployeeCount || 0,
//     },
//     update: ({ current }) => ({
//       totalDeposited: current.totalDeposited + _amount,
//     }),
//   });
// });

// ============================================================================
// RateUpdated Event
// ============================================================================

// ponder.on("GainJar:RateUpdated", async ({ event, context }) => {
//   const { _employer, _employee, _oldRate, _newRate } = event.args;

//   // 1. Store raw event
//   await context.db.rateUpdatedEvent.create({
//     id: getEventId(event.transaction.hash, event.log.logIndex),
//     data: {
//       employer: _employer,
//       employee: _employee,
//       oldRate: _oldRate,
//       newRate: _newRate,
//       timestamp: event.block.timestamp,
//       blockNumber: event.block.number,
//     },
//   });

//   // 2. Update stream
//   const streamId = getStreamId(_employer, _employee);
//   await context.db.stream.update({
//     id: streamId,
//     data: {
//       ratePerSecond: _newRate,
//       lastUpdated: event.block.timestamp,
//     },
//   });

//   // 3. Update vault total flow rate
//   const vault = await context.db.vault.findUnique({ id: _employer });
//   if (vault) {
//     const newTotalFlowRate = vault.totalFlowRate - _oldRate + _newRate;
//     await context.db.vault.update({
//       id: _employer,
//       data: {
//         totalFlowRate: newTotalFlowRate,
//         lastUpdated: event.block.timestamp,
//       },
//     });
//   }
// });

// ============================================================================
// Liquidation Event
// ============================================================================

// ponder.on("GainJar:Liquidation", async ({ event, context }) => {
//   const { _employer, _liquidator, _totalPaid, _liquidatorReward } = event.args;

//   // 1. Store raw event
//   await context.db.liquidationEvent.create({
//     id: getEventId(event.transaction.hash, event.log.logIndex),
//     data: {
//       employer: _employer,
//       liquidator: _liquidator,
//       totalPaid: _totalPaid,
//       liquidatorReward: _liquidatorReward,
//       timestamp: event.block.timestamp,
//       blockNumber: event.block.number,
//     },
//   });

//   // 2. Update vault (all streams paused after liquidation)
//   const vault = await context.db.vault.findUnique({ id: _employer });
//   if (vault) {
//     await context.db.vault.update({
//       id: _employer,
//       data: {
//         balance: vault.balance - _totalPaid,
//         totalWithdrawn: vault.totalWithdrawn + _totalPaid,
//         totalFlowRate: 0n, // All streams paused
//         activeEmployeeCount: 0,
//         status: "EMERGENCY",
//         lastUpdated: event.block.timestamp,
//       },
//     });
//   }

//   // Note: Stream pauses will be handled by individual StreamPaused events
// });