# GainJar Architecture 🏗️

> Deep dive into the technical architecture, design patterns, and implementation details of the GainJar protocol.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Concepts](#core-concepts)
- [Data Structures](#data-structures)
- [State Management](#state-management)
- [Stream Mechanics](#stream-mechanics)
- [Vault System](#vault-system)
- [Liquidation Engine](#liquidation-engine)
- [Dual-List Architecture](#dual-list-architecture)
- [Gas Optimization](#gas-optimization)
- [Mathematical Formulas](#mathematical-formulas)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      GainJar Contract                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │  Vault System   │  │  Stream Engine   │  │ Liquidation│  │
│  │                 │  │                  │  │   Engine   │  │
│  │ • Balance       │  │ • Rate Calc      │  │ • Health   │  │
│  │ • Deposits      │  │ • Withdrawals    │  │ • Rewards  │  │
│  │ • Health Track  │  │ • Updates        │  │ • Execute  │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Dual-List Employee Management                │   │
│  │                                                      │   │
│  │  All Employees List  ←→  Active Employees List       │   │
│  │  (Historical)             (Gas Optimized)            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Fee Management System                   │   │
│  │  • Protocol Fee (0.05% default)                      │   │
│  │  • Fee Accumulation                                  │   │
│  │  • Owner Claims                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Contract Inheritance

```
Context (OpenZeppelin)
    │
    ├─── ReentrancyGuard (OpenZeppelin)
    │        │
    │        └─── Security: Prevents reentrancy attacks
    │
    └─── Ownable (OpenZeppelin)
             │
             └─── Access Control: Owner-only functions
                      │
                      └─── GainJar
                           └─── Main Implementation
```

## Core Concepts

### 1. Money Streaming

Money streaming is the continuous transfer of value over time. Unlike traditional batch payments, streaming enables:

- **Second-by-second accrual** of salary
- **Real-time liquidity** for employees
- **Transparent accounting** on-chain

**Formula:**

```
Earned Amount = Rate Per Second × Elapsed Seconds
```

### 2. Vault-based Architecture

Each employer has an isolated vault:

```
Employer Vault {
    Balance: Total deposited USDC
    Flow Rate: Sum of all active stream rates
    Coverage: Balance / Flow Rate (in seconds)
}
```

**Benefits:**

- Isolated risk per employer
- Clear accounting boundaries
- Predictable depletion calculations

### 3. Stream Lifecycle

```
┌──────────┐     ┌────────┐     ┌─────────┐     ┌────────┐
│ Created  │────>│ Active │────>│ Paused  │────>│ Ended  │
└──────────┘     └────────┘     └─────────┘     └────────┘
                      │              │               │
                      │              │               │
                      └──────────────┴───────────────┘
                            (Withdrawals)
```

**States:**

- **Created:** Stream initialized, starts accruing immediately
- **Active:** Continuously earning, withdrawals allowed
- **Paused:** Stopped by employer, no new earnings, historical data preserved
- **Ended:** Finite stream reached endTime or fully withdrawn

## Data Structures

### Stream Struct

```solidity
struct Stream {
    // Core streaming parameters
    uint256 ratePerSecond;     // Wei earned per second
    uint256 startTime;         // When streaming started
    uint256 endTime;           // When streaming ends (0 for infinite)
    uint256 totalAmount;       // Total locked amount (finite only)

    // Tracking
    uint256 lastWithdrawal;    // Last withdrawal timestamp
    uint256 totalWithdrawn;    // Cumulative withdrawn amount
    uint256 finalPayout;       // Remainder from division (finite only)

    // Metadata
    StreamType streamType;     // INFINITE or FINITE
    bool isActive;             // Current status
}
```

**Key Design Decisions:**

1. **`startTime` and `lastWithdrawal`:**
   - `startTime`: Reference point for total earned calculation
   - `lastWithdrawal`: Tracks what's been withdrawn
   - Allows accurate calculation of withdrawable amount

2. **`finalPayout`:**
   - Handles remainder when `totalAmount % duration != 0`
   - Ensures employer pays exactly what they promised
   - Paid with the final withdrawal

3. **`ratePerSecond` in wei:**
   - Precision: 6 decimals for USDC
   - Example: $100/day = 100,000,000 / 86,400 = 1,157.407407... wei/sec
   - Stored as integer: 1,157 wei/sec
   - Remainder: 100,000,000 % 86,400 = 35,200 wei in `finalPayout`

### VaultStatus Enum

```solidity
enum VaultStatus {
    HEALTHY,    // ≥ 30 days coverage
    WARNING,    // 7-29 days coverage
    CRITICAL,   // 3-6 days coverage (liquidation eligible)
    EMERGENCY   // < 3 days coverage (liquidation eligible with 2x reward)
}
```

**Coverage Calculation:**

```solidity
coverage = vaultBalance / totalFlowRate (in seconds)
daysRemaining = coverage / 86400
```

### StreamType Enum

```solidity
enum StreamType {
    INFINITE,  // No end time, streams indefinitely
    FINITE     // Fixed duration and total amount
}
```

## State Management

### Primary Mappings

```solidity
// Stream data: Employer → Employee → Stream
mapping(address => mapping(address => Stream)) private s_streams;

// Vault balances: Employer → USDC Balance
mapping(address => uint256) private s_vaultBalances;

// Employee lists (Dual-list architecture)
mapping(address => address[]) private s_employeeList;        // ALL employees
mapping(address => address[]) private s_activeEmployeeList;  // ACTIVE only

// Employee indices
mapping(address => mapping(address => uint256)) private s_employeeIndex;
mapping(address => mapping(address => uint256)) private s_activeEmployeeIndex;

// Quick lookup: Employer → Employee → IsActive
mapping(address => mapping(address => bool)) private s_isActiveEmployee;

// Liquidation tracking
mapping(address => uint256) private s_lastLiquidationTime;

// Fee management
uint256 private s_feeBasisPoints;        // Default: 5 (0.05%)
uint256 private s_accumulatedFees;       // Total fees collected
```

### State Transitions

#### Stream Creation

```
Before:
- s_streams[employer][employee] = empty
- s_employeeList[employer] = []
- s_activeEmployeeList[employer] = []

After createStream():
- s_streams[employer][employee] = new Stream
- s_employeeList[employer] = [employee]
- s_activeEmployeeList[employer] = [employee]
- s_isActiveEmployee[employer][employee] = true
- s_vaultBalances[employer] -= (locked for minimum coverage)
```

#### Pause Stream

```
Before:
- s_isActiveEmployee[employer][employee] = true
- s_activeEmployeeList[employer] = [emp1, employee, emp3]

After pauseStream():
- stream.isActive = false
- s_isActiveEmployee[employer][employee] = false
- s_activeEmployeeList[employer] = [emp1, emp3]  // employee removed
- s_employeeList[employer] = unchanged (history preserved)
```

#### Withdrawal

```
Before:
- stream.lastWithdrawal = T1
- stream.totalWithdrawn = X

After withdraw():
- stream.lastWithdrawal = T2 (current timestamp)
- stream.totalWithdrawn = X + withdrawn_amount
- s_vaultBalances[employer] -= withdrawn_amount
- s_accumulatedFees += fee
- employee receives: withdrawn_amount - fee
```

## Stream Mechanics

### Infinite Stream

**Characteristics:**

- No predetermined end
- Continues until paused by employer
- Suitable for full-time employment

**Calculation:**

```solidity
ratePerSecond = amountPerPeriod / periodInSeconds

Examples:
- Hourly ($50/hour):
  rate = 50,000,000 / 3,600 = 13,888.888... → 13,888 wei/sec

- Monthly ($5,000/month):
  rate = 5,000,000,000 / 2,592,000 = 1,929.012... → 1,929 wei/sec
```

**Withdrawable Calculation:**

```solidity
elapsedSince LastWithdrawal = block.timestamp - stream.lastWithdrawal
withdrawable = elapsedSinceLastWithdrawal * ratePerSecond
```

**Update Mechanism:**

```solidity
// Updating infinite stream rate:
1. Withdraw all pending earnings first
2. Update ratePerSecond
3. Verify vault has minimum coverage for new rate
4. Reset lastWithdrawal to current timestamp
```

### Finite Stream

**Characteristics:**

- Fixed duration and total amount
- Automatically ends when duration expires
- Includes finalPayout for precision

**Calculation:**

```solidity
ratePerSecond = totalAmount / durationInSeconds
finalPayout = totalAmount % durationInSeconds

Example: $6,000 over 30 days
- totalAmount = 6,000,000,000 wei
- duration = 2,592,000 seconds
- rate = 2,314 wei/sec
- finalPayout = 6,000,000,000 % 2,592,000 = 1,904,000 wei
```

**Withdrawable Calculation:**

```solidity
if (block.timestamp >= endTime) {
    // Stream expired
    elapsed = endTime - lastWithdrawal
    withdrawable = elapsed * ratePerSecond

    // Add finalPayout on last withdrawal
    if (totalWithdrawn + withdrawable == totalAmount) {
        withdrawable += finalPayout
    }
} else {
    // Stream active
    elapsed = block.timestamp - lastWithdrawal
    withdrawable = elapsed * ratePerSecond

    // Cap at remaining budget
    remainingBudget = totalAmount - totalWithdrawn
    withdrawable = min(withdrawable, remainingBudget)
}
```

**Extension Mechanism:**

```solidity
// Extending finite stream:
1. Withdraw all pending earnings
2. Calculate remaining amount = totalAmount - totalWithdrawn
3. Add additional amount and time
4. Recalculate rate = (remaining + additional) / (remainingTime + additionalTime)
5. Update finalPayout
6. Reset startTime and lastWithdrawal
```

### Edge Cases Handling

#### 1. Non-divisible Amounts

```solidity
Problem: $100 over 3 days
- totalAmount = 100,000,000 wei
- duration = 259,200 seconds
- rate = 100,000,000 / 259,200 = 385.802... → 385 wei/sec
- Lost precision: 100,000,000 - (385 × 259,200) = 100,000,000 - 99,792,000 = 208,000 wei

Solution: finalPayout
- finalPayout = 208,000 wei
- Paid with last withdrawal
- Employee gets exactly $100
```

#### 2. Stream Expiry During Withdrawal

```solidity
Scenario:
- endTime = T + 100 seconds
- lastWithdrawal = T
- Current time = T + 150 seconds (50 seconds after expiry)

Calculation:
- Only count up to endTime
- elapsed = min(block.timestamp, endTime) - lastWithdrawal
- elapsed = min(T+150, T+100) - T = 100 seconds
- withdrawable = 100 * rate + finalPayout
```

#### 3. Vault Insufficient for Full Withdrawal

```solidity
Scenario:
- withdrawable = 1,000 USDC
- vaultBalance = 800 USDC

Protection:
- Transaction reverts with GainJar__InsufficientEmployerVault
- Employee cannot withdraw more than vault has
- Prevents overdraft

Alternative: Use getSafeWithdrawableAmount()
- Returns both full earned and safe (capped) amount
- Employee can withdraw partial using withdrawPartial()
```

## Vault System

### Minimum Coverage Requirement

**Constant:**

```solidity
uint256 private constant MIN_COVERAGE_DAYS_SECOND = 7 days; // 604,800 seconds
```

**Purpose:**

- Prevent immediate vault depletion
- Give employers time to refill
- Enable liquidation before full depletion

**Enforcement:**

```solidity
// On stream creation:
minRequired = totalFlowRate * MIN_COVERAGE_DAYS_SECOND
require(vaultBalance >= minRequired, "Insufficient vault");

// On rate update:
newFlowRate = currentFlowRate - oldRate + newRate
minRequired = newFlowRate * MIN_COVERAGE_DAYS_SECOND
require(vaultBalance >= minRequired, "Insufficient vault");
```

### Flow Rate Calculation

**Total Flow Rate:**

```solidity
totalFlowRate = Σ (active streams' ratePerSecond)

Example:
- Employee A: 1,157 wei/sec ($100/day)
- Employee B: 2,314 wei/sec ($200/day)
- Employee C: 578 wei/sec ($50/day)
- Total: 4,049 wei/sec

Minimum Required Vault:
= 4,049 * 604,800
= 2,448,835,200 wei
≈ 2,448 USDC
```

**Depletion Time:**

```solidity
if (totalFlowRate == 0) {
    depletionTime = type(uint256).max; // Infinite
} else {
    depletionTime = vaultBalance / totalFlowRate; // In seconds
}

daysRemaining = depletionTime / 86,400;
```

### Vault Health Status

```solidity
function getVaultStatus(address employer) public view returns (VaultStatus) {
    uint256 depletionTime = getVaultDepletionTime(employer);
    uint256 daysRemaining = depletionTime / 1 days;

    if (daysRemaining >= 30) return VaultStatus.HEALTHY;
    if (daysRemaining >= 7)  return VaultStatus.WARNING;
    if (daysRemaining >= 3)  return VaultStatus.CRITICAL;
    return VaultStatus.EMERGENCY;
}
```

**Thresholds:**

- **HEALTHY:** ≥30 days → Green light, can create new streams
- **WARNING:** 7-29 days → Yellow alert, employer should deposit
- **CRITICAL:** 3-6 days → Orange alert, liquidation eligible (1x reward)
- **EMERGENCY:** <3 days → Red alert, liquidation eligible (2x reward)

### Max Additional Flow Rate

```solidity
Calculation:
currentRequired = totalFlowRate * MIN_COVERAGE_DAYS_SECOND
if (vaultBalance > currentRequired) {
    maxAdditionalFlowRate = (vaultBalance - currentRequired) / MIN_COVERAGE_DAYS_SECOND
} else {
    maxAdditionalFlowRate = 0
}

Example:
- vaultBalance = 5,000 USDC
- currentFlowRate = 2 USDC/day = 23.148 wei/sec
- currentRequired = 23.148 * 604,800 = 14,000,000 wei (14 USDC for 7 days)
- surplus = 5,000 - 14 = 4,986 USDC
- maxAdditional = 4,986,000,000 / 604,800 = 8,243.5 wei/sec ≈ 711 USDC/day
```

## Liquidation Engine

### Liquidation Eligibility

**Requirements:**

1. ✅ Vault status is CRITICAL or EMERGENCY
2. ✅ Cooldown period passed (1 hour since last liquidation)
3. ✅ Vault has enough balance for: employees + reward

**Check:**

```solidity
(
    bool eligible,
    VaultStatus status,
    uint256 totalEmployeeEarnings,
    uint256 estimatedReward,
    uint256 vaultAfterLiquidation,
    uint256 cooldownRemaining
) = gainJar.getLiquidationPreview(employer);

if (!eligible) {
    // Check why:
    if (status != CRITICAL && status != EMERGENCY) {
        // Vault not in danger
    }
    if (cooldownRemaining > 0) {
        // Must wait X seconds
    }
    if (vaultBalance < totalRequired) {
        // Insufficient funds for liquidation
    }
}
```

### Reward Calculation

**Formula:**

```solidity
baseReward = totalEmployeeEarnings * 500 / 10000  // 5%

if (status == EMERGENCY) {
    reward = baseReward * 2  // 2x multiplier
} else {
    reward = baseReward  // 1x multiplier
}

// Apply floor and cap
reward = max(LIQUIDATION_REWARD_FLOOR, min(reward, LIQUIDATION_REWARD_CAP))
```

**Constants:**

```solidity
LIQUIDATION_REWARD_FLOOR = 1e6;      // $1 USDC minimum
LIQUIDATION_REWARD_CAP = 50e6;       // $50 USDC maximum
LIQUIDATION_BASE_RATE_BPS = 500;     // 5%
EMERGENCY_SEVERITY_MULTIPLIER = 2;   // 2x for EMERGENCY
```

**Examples:**

| Employee Earnings | Status    | Base (5%) | Multiplier | Before Cap | Final Reward   |
| ----------------- | --------- | --------- | ---------- | ---------- | -------------- |
| $10               | CRITICAL  | $0.50     | 1x         | $0.50      | **$1** (floor) |
| $100              | CRITICAL  | $5        | 1x         | $5         | **$5**         |
| $100              | EMERGENCY | $5        | 2x         | $10        | **$10**        |
| $1,000            | CRITICAL  | $50       | 1x         | $50        | **$50** (cap)  |
| $1,000            | EMERGENCY | $50       | 2x         | $100       | **$50** (cap)  |
| $10,000           | EMERGENCY | $500      | 2x         | $1,000     | **$50** (cap)  |

### Liquidation Process

```solidity
Step-by-Step:

1. Validation Phase
   ├─ Check vault status (CRITICAL or EMERGENCY)
   ├─ Check cooldown (1 hour since last liquidation)
   └─ Calculate total requirements

2. Calculation Phase
   ├─ Loop active employees (first pass)
   ├─ Sum total employee earnings
   ├─ Calculate liquidator reward
   └─ Verify vault has: earnings + reward

3. Execution Phase
   ├─ Loop active employees (second pass)
   │  ├─ Calculate individual earnings
   │  ├─ Apply protocol fee
   │  ├─ Transfer to employee
   │  ├─ Update stream state
   │  └─ Pause stream
   ├─ Transfer reward to liquidator (no fee)
   ├─ Update liquidation timestamp
   └─ Emit Liquidated event

4. State Changes
   ├─ All active streams → isActive = false
   ├─ All employees removed from s_activeEmployeeList
   ├─ s_lastLiquidationTime[employer] = block.timestamp
   └─ s_vaultBalances[employer] -= (totalEarnings + reward)
```

**Gas Optimization:**

- Only loop active employees (via s_activeEmployeeList)
- Two passes: calculation then execution
- Batch removal from active list

**Critical Code:**

```solidity
// First pass: Calculate (view-only)
for (uint256 i = 0; i < activeEmployees.length; i++) {
    if (!_isStreamExpired(stream)) {
        totalEmployeeEarnings += withdrawable(employer, activeEmployees[i]);
    }
}

// Verify sufficient vault
totalRequired = totalEmployeeEarnings + reward;
require(vaultBalance >= totalRequired);

// Second pass: Execute (state changes)
for (uint256 i = 0; i < activeEmployees.length; i++) {
    // Withdraw + pause each stream
}

// Clear active list (all streams paused)
delete s_activeEmployeeList[employer];
```

### Cooldown Mechanism

**Purpose:**

- Prevent spam liquidations
- Give employer time to refill vault
- Reduce gas costs from repeated liquidations

**Enforcement:**

```solidity
uint256 lastLiquidation = s_lastLiquidationTime[employer];
if (block.timestamp < lastLiquidation + LIQUIDATION_COOLDOWN) {
    uint256 remaining = (lastLiquidation + LIQUIDATION_COOLDOWN) - block.timestamp;
    revert GainJar__LiquidationCooldownActive(remaining);
}

// Update on successful liquidation
s_lastLiquidationTime[employer] = block.timestamp;
```

**Constant:**

```solidity
uint256 private constant LIQUIDATION_COOLDOWN = 1 hours; // 3600 seconds
```

## Dual-List Architecture

### Problem Statement

**Without dual-list:**

```solidity
// Every operation loops ALL employees (active + inactive)
function getTotalFlowRate() {
    for (uint256 i = 0; i < allEmployees.length; i++) {  // 1000 employees
        if (stream.isActive) {  // Only 100 active
            // Process...
        }
        // Wasted 900 iterations checking inactive streams!
    }
}

// Gas cost: O(total employees) even if only 10% active
// DoS risk: Attacker creates 10,000 streams, pauses all → contract unusable
```

**With dual-list:**

```solidity
// Operations use activeEmployeeList (filtered)
function getTotalFlowRate() {
    for (uint256 i = 0; i < activeEmployees.length; i++) {  // Only 100 active
        // Process...
    }
}

// Gas cost: O(active employees)
// DoS protection: Max iterations = active streams only
```

### Implementation

**Two Separate Lists:**

```solidity
// Historical record (never shrinks)
mapping(address => address[]) private s_employeeList;

// Gas-optimized operations (shrinks when streams pause/end)
mapping(address => address[]) private s_activeEmployeeList;

// Quick lookup
mapping(address => mapping(address => bool)) private s_isActiveEmployee;

// Indices for O(1) removal
mapping(address => mapping(address => uint256)) private s_employeeIndex;
mapping(address => mapping(address => uint256)) private s_activeEmployeeIndex;
```

**Synchronization:**

| Operation              | s_employeeList | s_activeEmployeeList | s_isActiveEmployee |
| ---------------------- | -------------- | -------------------- | ------------------ |
| createStream           | Add if new     | Add                  | Set true           |
| pauseStream            | No change      | Remove               | Set false          |
| withdraw (stream ends) | No change      | Remove               | Set false          |
| liquidate              | No change      | Clear all            | Set false (all)    |

### Add to Active List

```solidity
// On stream creation
function _createStream(...) {
    // ... stream setup ...

    // Add to ALL employees (if first time)
    if (notAlreadyInList) {
        s_employeeIndex[employer][employee] = s_employeeList[employer].length;
        s_employeeList[employer].push(employee);
    }

    // Add to ACTIVE employees
    s_activeEmployeeIndex[employer][employee] = s_activeEmployeeList[employer].length;
    s_activeEmployeeList[employer].push(employee);
    s_isActiveEmployee[employer][employee] = true;
}
```

### Remove from Active List

**Swap-and-Pop Pattern:**

```solidity
function _removeFromActiveList(address employer, address employee) internal {
    if (!s_isActiveEmployee[employer][employee]) return;  // Already removed

    uint256 index = s_activeEmployeeIndex[employer][employee];
    address[] storage activeList = s_activeEmployeeList[employer];
    uint256 lastIndex = activeList.length - 1;

    // If not last element, swap with last
    if (index != lastIndex) {
        address lastEmployee = activeList[lastIndex];
        activeList[index] = lastEmployee;
        s_activeEmployeeIndex[employer][lastEmployee] = index;  // Update swapped index
    }

    // Remove last element
    activeList.pop();

    // Cleanup
    delete s_activeEmployeeIndex[employer][employee];
    s_isActiveEmployee[employer][employee] = false;
}
```

**Visual Example:**

```
Before: activeList = [Alice, Bob, Charlie, Dave]
Remove Bob (index 1):

Step 1: Swap Bob with Dave (last)
activeList = [Alice, Dave, Charlie, Dave]

Step 2: Update Dave's index
s_activeEmployeeIndex[employer][Dave] = 1

Step 3: Pop last
activeList = [Alice, Dave, Charlie]

Result: O(1) removal, no gaps in array
```

### Gas Comparison

**Scenario: 1000 total employees, 100 active**

| Function             | Single List     | Dual List      | Savings  |
| -------------------- | --------------- | -------------- | -------- |
| getTotalFlowRate     | 1000 iterations | 100 iterations | **90%**  |
| liquidate (2 passes) | 2000 iterations | 200 iterations | **90%**  |
| getActiveEmployees   | 1000 + filter   | Direct return  | **~95%** |

**Cost:**

- Extra storage: ~3 mappings per employer
- Maintenance: ~20k gas per add/remove
- Benefit: 10x faster critical operations

## Gas Optimization

### 1. Minimal Storage Reads

```solidity
// ❌ BAD: Multiple storage reads
function withdrawable() {
    Stream storage stream = s_streams[employer][employee];
    uint256 elapsed = block.timestamp - stream.lastWithdrawal;
    uint256 earned = elapsed * stream.ratePerSecond;
    // ... uses stream.totalAmount, stream.streamType, etc
}

// ✅ GOOD: Load to memory once
function withdrawable() {
    Stream memory stream = s_streams[employer][employee];  // Single SLOAD
    // All subsequent reads from memory (cheap)
}
```

### 2. Active List for Iterations

```solidity
// ❌ BAD: Loop all employees
address[] memory employees = s_employeeList[employer];
for (uint256 i = 0; i < employees.length; i++) {
    if (s_streams[employer][employees[i]].isActive) {  // Check every one
        // ...
    }
}

// ✅ GOOD: Loop only active
address[] memory activeEmployees = s_activeEmployeeList[employer];
for (uint256 i = 0; i < activeEmployees.length; i++) {
    // No isActive check needed, all are active
}
```

### 3. Batch Operations

```solidity
// Liquidate: Process all employees in one transaction
// Instead of: employee1.withdraw(), employee2.withdraw(), ...
// Does: Single liquidate() → all employees paid

// Benefit: Amortized gas cost across all employees
```

### 4. Early Returns

```solidity
function withdrawable() {
    if (!stream.isActive) return 0;  // Early exit, no calculations

    // ... rest of logic
}
```

### 5. Unchecked Math (Where Safe)

```solidity
// Safe because we verify: block.timestamp >= lastWithdrawal
unchecked {
    elapsed = block.timestamp - stream.lastWithdrawal;
}
```

### 6. Delete for Refunds

```solidity
// Deleting storage gives gas refund (up to 20% of tx cost in EIP-3529)
delete s_activeEmployeeList[employer];  // On liquidate
delete s_streams[employer][employee];    // On cleanup (future feature)
```

## Mathematical Formulas

### Rate Calculation

```
Rate Per Second = Total Amount / Duration in Seconds

Example 1: Hourly rate
Input: $50 per hour
rate = 50,000,000 wei / 3,600 seconds
rate = 13,888.888...
rate = 13,888 wei/sec (integer)
lost = 50,000,000 - (13,888 * 3,600) = 50,000,000 - 49,996,800 = 3,200 wei

Example 2: Monthly salary
Input: $5,000 per month (30 days)
rate = 5,000,000,000 wei / 2,592,000 seconds
rate = 1,929.012...
rate = 1,929 wei/sec (integer)
lost = 5,000,000,000 - (1,929 * 2,592,000) = 5,000,000,000 - 4,999,968,000 = 32,000 wei
```

### Withdrawable Amount

```
Infinite Stream:
withdrawable = (current_time - last_withdrawal) * rate_per_second

Finite Stream (before expiry):
elapsed = current_time - last_withdrawal
calculated = elapsed * rate_per_second
remaining_budget = total_amount - total_withdrawn
withdrawable = min(calculated, remaining_budget)

Finite Stream (after expiry):
elapsed = end_time - last_withdrawal
calculated = elapsed * rate_per_second
withdrawable = calculated + final_payout
```

### Coverage Time

```
Flow Rate = Σ(active stream rates)
Coverage Seconds = Vault Balance / Flow Rate
Coverage Days = Coverage Seconds / 86,400

Example:
Vault Balance = 10,000 USDC = 10,000,000,000 wei
Stream 1: 1,157 wei/sec
Stream 2: 2,314 wei/sec
Flow Rate = 3,471 wei/sec

Coverage = 10,000,000,000 / 3,471 = 2,881,816 seconds
         = 2,881,816 / 86,400 = 33.35 days
Status = HEALTHY (≥30 days)
```

### Fee Calculation

```
Fee = Amount * Fee Basis Points / 10,000
Net = Amount - Fee

Example: Withdraw 1,000 USDC with 0.05% fee (5 bps)
Fee = 1,000,000,000 * 5 / 10,000 = 500,000 wei = $0.50
Net = 1,000,000,000 - 500,000 = 999,500,000 wei = $999.50
```

### Liquidation Reward

```
Base = Total Employee Earnings * 500 / 10,000  (5%)

If EMERGENCY:
    Reward = Base * 2
Else:
    Reward = Base

Final = max(1,000,000, min(Reward, 50,000,000))  // $1 to $50

Example 1: $500 earnings, CRITICAL
Base = 500,000,000 * 500 / 10,000 = 25,000,000 wei = $25
Final = max($1, min($25, $50)) = $25

Example 2: $500 earnings, EMERGENCY
Base = $25
Multiplied = $25 * 2 = $50
Final = max($1, min($50, $50)) = $50

Example 3: $2,000 earnings, EMERGENCY
Base = 2,000,000,000 * 500 / 10,000 = 100,000,000 wei = $100
Multiplied = $100 * 2 = $200
Final = max($1, min($200, $50)) = $50 (capped)
```

---

## Design Decisions

### Why 7 Days Minimum Coverage?

- **Employee protection:** Gives time for liquidation before full depletion
- **Employer flexibility:** Not too restrictive (vs 30 days)
- **Liquidation window:** Sufficient time between WARNING and EMERGENCY
- **Gas efficiency:** Reduces need for constant refills

### Why Dual Lists?

- **DoS prevention:** Prevents attack via creating many inactive streams
- **Gas optimization:** 10x faster critical operations with many employees
- **User experience:** Fast response times for view functions
- **Scalability:** Supports employers with hundreds/thousands of employees

### Why 1-Hour Liquidation Cooldown?

- **Spam prevention:** Prevents repeated liquidation calls
- **Employer recovery:** Time to refill vault after liquidation
- **Gas saving:** Reduces redundant liquidations
- **Balance:** Not too long (1 day) or too short (5 min)

### Why $1-$50 Reward Cap?

- **Floor ($1):** Profitable on L2s (Arbitrum gas ~$0.10-0.50)
- **Cap ($50):** Prevents over-incentivization and excessive vault drain
- **5% base:** Reasonable incentive without being extractive
- **2x EMERGENCY:** Urgency multiplier for critical situations

### Why Pause Instead of Delete?

- **Historical record:** Employers can see all past employees
- **Resume capability:** Can restart paused streams (future feature)
- **Audit trail:** Complete employment history on-chain
- **Safety:** No accidental data loss

---

**Next:** [API Reference](./API_REFERENCE.md) | [Security Guide](./SECURITY.md)
