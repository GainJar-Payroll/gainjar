# GainJar API Reference 📖

> Complete function reference with parameters, return values, and usage examples.

## Table of Contents

- [Employer Functions](#employer-functions)
- [Employee Functions](#employee-functions)
- [Liquidation Functions](#liquidation-functions)
- [Owner Functions](#owner-functions)
- [View Functions](#view-functions)
- [Events](#events)
- [Errors](#errors)

---

## Employer Functions

Functions for employers to manage their vault and employee streams.

### deposit

Deposit USDC tokens into employer's vault.

```solidity
function deposit(uint256 _amount) external
```

**Parameters:**

- `_amount` (uint256): Amount of USDC to deposit (in wei, 6 decimals)

**Requirements:**

- `_amount` must be greater than 0
- Caller must have approved GainJar contract to spend USDC
- Caller must have sufficient USDC balance

**Example:**

```solidity
// Deposit 10,000 USDC
IERC20(usdcAddress).approve(gainJarAddress, 10000e6);
gainJar.deposit(10000e6);
```

**Emits:** `FundDeposited(employer, amount)`

---

### createInfiniteStream

Create an infinite stream for ongoing employment.

```solidity
function createInfiniteStream(
    address _employee,
    uint256 _amount,
    uint256 _period
) public
```

**Parameters:**

- `_employee` (address): Employee wallet address
- `_amount` (uint256): Payment amount per period (in wei)
- `_period` (uint256): Time period in seconds

**Requirements:**

- `_employee` cannot be zero address
- `_period` must be greater than 0
- `_amount` must be >= `_period` (minimum precision)
- No active stream exists for this employee
- Vault must have minimum 7-day coverage after creating stream

**Example:**

```solidity
// $100 per day
gainJar.createInfiniteStream(employeeAddress, 100e6, 1 days);

// Custom rate: $50 per 12 hours
gainJar.createInfiniteStream(employeeAddress, 50e6, 12 hours);
```

**Emits:** `StreamCreated(...)`

---

### createFiniteStream

Create a finite stream for project-based work.

```solidity
function createFiniteStream(
    address _employee,
    uint256 _amount,
    uint256 _durationInSeconds
) public
```

**Parameters:**

- `_employee` (address): Employee wallet address
- `_amount` (uint256): Total amount to be paid over duration (in wei)
- `_durationInSeconds` (uint256): Stream duration in seconds

**Requirements:**

- Same as `createInfiniteStream`
- `_amount` is total payment, not per-period rate

**Example:**

```solidity
// $6,000 total over 30 days
gainJar.createFiniteStream(employeeAddress, 6000e6, 30 days);

// $500 total over 7 days
gainJar.createFiniteStream(employeeAddress, 500e6, 7 days);
```

**Calculation:**

```
Rate Per Second = _amount / _durationInSeconds
Final Payout = _amount % _durationInSeconds
End Time = block.timestamp + _durationInSeconds
```

**Emits:** `StreamCreated(...)`

---

### createHourlyStream

Convenience function for hourly infinite stream.

```solidity
function createHourlyStream(
    address _employee,
    uint256 _hourlyRate
) external
```

**Parameters:**

- `_employee` (address): Employee wallet address
- `_hourlyRate` (uint256): Payment per hour (in wei)

**Example:**

```solidity
// $50 per hour
gainJar.createHourlyStream(employeeAddress, 50e6);
```

**Equivalent to:**

```solidity
gainJar.createInfiniteStream(employeeAddress, 50e6, 1 hours);
```

**Emits:** `StreamCreated(...)`

---

### createMonthlyStream

Convenience function for monthly infinite stream (30 days).

```solidity
function createMonthlyStream(
    address _employee,
    uint256 _monthlyRate
) external
```

**Parameters:**

- `_employee` (address): Employee wallet address
- `_monthlyRate` (uint256): Payment per month (in wei)

**Example:**

```solidity
// $5,000 per month
gainJar.createMonthlyStream(employeeAddress, 5000e6);
```

**Equivalent to:**

```solidity
gainJar.createInfiniteStream(employeeAddress, 5000e6, 30 days);
```

**Emits:** `StreamCreated(...)`

---

### createFiniteStreamDays

Convenience function for finite stream with days instead of seconds.

```solidity
function createFiniteStreamDays(
    address _employee,
    uint256 _totalAmount,
    uint256 _durationInDays
) external
```

**Parameters:**

- `_employee` (address): Employee wallet address
- `_totalAmount` (uint256): Total amount to pay (in wei)
- `_durationInDays` (uint256): Duration in days

**Example:**

```solidity
// $3,000 over 14 days
gainJar.createFiniteStreamDays(employeeAddress, 3000e6, 14);
```

**Equivalent to:**

```solidity
gainJar.createFiniteStream(employeeAddress, 3000e6, 14 days);
```

**Emits:** `StreamCreated(...)`

---

### updateInfiniteRate

Update the rate of an existing infinite stream.

```solidity
function updateInfiniteRate(
    address _employee,
    uint256 _newRateAmount,
    uint256 _newRatePeriod
) external
```

**Parameters:**

- `_employee` (address): Employee with active infinite stream
- `_newRateAmount` (uint256): New payment amount per period
- `_newRatePeriod` (uint256): New time period in seconds

**Requirements:**

- Stream must be active
- Stream must be INFINITE type
- `_newRatePeriod` must be > 0
- `_newRateAmount` must be >= `_newRatePeriod`
- Vault must have minimum coverage for new rate

**Process:**

1. Withdraws all pending earnings for employee
2. Updates rate to new value
3. Resets `lastWithdrawal` to current timestamp

**Example:**

```solidity
// Update from $100/day to $150/day
gainJar.updateInfiniteRate(employeeAddress, 150e6, 1 days);

// Update to hourly rate of $25/hour
gainJar.updateInfiniteRate(employeeAddress, 25e6, 1 hours);
```

**Emits:** `Withdrawal(...)` (for pending), then stream continues with new rate

---

### extendFiniteStream

Extend an existing finite stream with additional amount and time.

```solidity
function extendFiniteStream(
    address _employee,
    uint256 _additionalAmount,
    uint256 _additionalSeconds
) external
```

**Parameters:**

- `_employee` (address): Employee with active finite stream
- `_additionalAmount` (uint256): Additional USDC to add to stream
- `_additionalSeconds` (uint256): Additional time to extend stream

**Requirements:**

- Stream must be active
- Stream must be FINITE type
- Vault must have minimum coverage for new rate

**Process:**

1. Withdraws all pending earnings
2. Calculates remaining amount = totalAmount - totalWithdrawn
3. Adds additional amount and time
4. Recalculates rate and finalPayout
5. Resets startTime and lastWithdrawal

**Example:**

```solidity
// Original: $1,000 over 10 days
// Extend: Add $500 and 5 more days
gainJar.extendFiniteStream(employeeAddress, 500e6, 5 days);

// Result: Employee now earns $1,500 over 15 days from now
```

**Calculation:**

```
remainingAmount = totalAmount - totalWithdrawn
remainingTime = endTime - block.timestamp (if not expired, else 0)

newTotalAmount = remainingAmount + _additionalAmount
newTotalTime = remainingTime + _additionalSeconds

newRate = newTotalAmount / newTotalTime
newFinalPayout = newTotalAmount % newTotalTime
newEndTime = block.timestamp + newTotalTime
```

**Emits:** `Withdrawal(...)` (for pending)

---

### pauseStream

Pause an active stream (employer only).

```solidity
function pauseStream(address _employee) external
```

**Parameters:**

- `_employee` (address): Employee whose stream to pause

**Requirements:**

- Stream must be active
- Caller must be the employer

**Process:**

1. Withdraws all pending earnings for employee
2. Sets `isActive = false`
3. Removes employee from active list

**Example:**

```solidity
// Pause employee's stream (e.g., on leave, contract ended)
gainJar.pauseStream(employeeAddress);

// Employee can still withdraw any pending earnings
// To restart: create a new stream
```

**Emits:**

- `Withdrawal(...)` (for pending earnings)
- `StreamPaused(employer, employee)`

---

## Employee Functions

Functions for employees to manage their earnings.

### withdraw

Withdraw all available earnings from employer.

```solidity
function withdraw(address _employer) external nonReentrant
```

**Parameters:**

- `_employer` (address): Employer address who created the stream

**Requirements:**

- Stream must be active
- Must have withdrawable amount > 0
- Employer vault must have sufficient balance

**Process:**

1. Calculates total withdrawable amount
2. Includes `finalPayout` if finite stream expired
3. Applies protocol fee
4. Transfers net amount to employee
5. Updates stream state
6. If finite stream fully withdrawn, ends stream

**Example:**

```solidity
// Withdraw all earned salary
gainJar.withdraw(employerAddress);

// Receive: earned amount - protocol fee (0.05%)
```

**Calculation:**

```
Withdrawable = (current_time - last_withdrawal) * rate_per_second

If finite stream expired:
    Withdrawable += final_payout

Fee = Withdrawable * fee_bps / 10000
Net = Withdrawable - Fee

Employee receives: Net
Protocol receives: Fee
```

**Emits:**

- `Withdrawal(employee, amount, fee)`
- `StreamEnded(employer, employee)` (if finite stream fully withdrawn)

---

### withdrawPartial

Withdraw a specific partial amount instead of all earnings.

```solidity
function withdrawPartial(
    address _employer,
    uint256 _amount
) external nonReentrant
```

**Parameters:**

- `_employer` (address): Employer address
- `_amount` (uint256): Specific amount to withdraw (in wei)

**Requirements:**

- Stream must be active
- `_amount` must be <= withdrawable amount
- Employer vault must have >= `_amount`

**Example:**

```solidity
// Check withdrawable
uint256 available = gainJar.withdrawable(employerAddress, msg.sender);
// available = 5,000 USDC

// Withdraw only 1,000 USDC
gainJar.withdrawPartial(employerAddress, 1000e6);

// Remaining 4,000 USDC still withdrawable later
```

**Use Cases:**

- Gradual withdrawals for budgeting
- Avoiding large transactions
- Partial liquidity needs

**Emits:**

- `Withdrawal(employee, amount, fee)`
- `StreamEnded(...)` (if finite stream fully withdrawn)

---

## Liquidation Functions

Functions for liquidators to protect employees when vaults run low.

### liquidate

Execute liquidation on an employer with critically low vault.

```solidity
function liquidate(address _employer) external nonReentrant
```

**Parameters:**

- `_employer` (address): Employer address to liquidate

**Requirements:**

- Vault status must be CRITICAL or EMERGENCY
- Cooldown period (1 hour) must have passed
- Vault must have enough for: employee earnings + liquidator reward

**Process:**

1. Validates eligibility
2. Calculates total employee earnings
3. Calculates liquidator reward
4. Pays all active employees
5. Pauses all active streams
6. Pays liquidator reward
7. Updates liquidation timestamp

**Example:**

```solidity
// 1. Check if eligible
(bool eligible,,,,,) = gainJar.getLiquidationPreview(employerAddress);

if (eligible) {
    // 2. Execute liquidation
    gainJar.liquidate(employerAddress);
    // Receive liquidator reward ($1-$50)
}
```

**Reward Formula:**

```
Base = Total Employee Earnings * 5%
If EMERGENCY: Reward = Base * 2
Else: Reward = Base

Final = max($1, min(Reward, $50))
```

**Emits:**

```
- Withdrawal(...) for each employee
- StreamPaused(...) for each employee
- Liquidated(liquidator, employer, totalPaid, reward, streamsPaused)
```

**Post-Liquidation State:**

- All streams: `isActive = false`
- Active list: cleared
- Employer must: deposit funds + recreate streams

---

## Owner Functions

Administrative functions (contract owner only).

### updateFee

Update the protocol fee charged on withdrawals.

```solidity
function updateFee(uint256 _newFeeBasisPoints) external onlyOwner
```

**Parameters:**

- `_newFeeBasisPoints` (uint256): New fee in basis points (max 100 = 1%)

**Requirements:**

- Caller must be contract owner
- `_newFeeBasisPoints` must be <= 100 (1%)

**Example:**

```solidity
// Set fee to 0.1% (10 basis points)
gainJar.updateFee(10);

// Set fee to 0.5% (50 basis points)
gainJar.updateFee(50);

// Disable fee (0%)
gainJar.updateFee(0);
```

**Emits:** `FeeUpdated(oldFee, newFee)`

---

### claimFees

Claim accumulated protocol fees.

```solidity
function claimFees() external onlyOwner
```

**Requirements:**

- Caller must be contract owner
- Accumulated fees must be > 0

**Process:**

1. Reads total accumulated fees
2. Resets accumulated fees to 0
3. Transfers USDC to owner

**Example:**

```solidity
// Check accumulated fees
uint256 fees = gainJar.getAccumulatedFees();
// fees = 1000e6 (1,000 USDC)

// Claim fees
gainJar.claimFees();
// Owner receives 1,000 USDC
```

**Emits:** `FeeClaimed(owner, amount)`

---

## View Functions

Read-only functions to query contract state.

### getStreamInfo

Get comprehensive information about a stream.

```solidity
function getStreamInfo(
    address _employer,
    address _employee
) external view returns (
    uint256 ratePerSecond,
    uint256 startTime,
    uint256 endTime,
    uint256 totalAmount,
    StreamType streamType,
    uint256 totalEarned,
    uint256 totalWithdrawn,
    uint256 withdrawableNow,
    bool isActive,
    bool isExpired
)
```

**Returns:**

- `ratePerSecond`: Wei earned per second
- `startTime`: Stream start timestamp
- `endTime`: Stream end timestamp (0 for infinite)
- `totalAmount`: Total locked amount (0 for infinite)
- `streamType`: INFINITE (0) or FINITE (1)
- `totalEarned`: Total earned since stream start
- `totalWithdrawn`: Total already withdrawn
- `withdrawableNow`: Currently withdrawable amount
- `isActive`: Whether stream is active
- `isExpired`: Whether finite stream has expired

**Example:**

```solidity
(
    uint256 rate,
    ,
    uint256 endTime,
    uint256 totalAmount,
    GainJar.StreamType streamType,
    uint256 totalEarned,
    uint256 totalWithdrawn,
    uint256 withdrawableNow,
    bool isActive,
    bool isExpired
) = gainJar.getStreamInfo(employerAddress, employeeAddress);

console.log("Rate per second:", rate);
console.log("Total earned:", totalEarned);
console.log("Withdrawable now:", withdrawableNow);
```

---

### withdrawable

Get current withdrawable amount for an employee.

```solidity
function withdrawable(
    address _employer,
    address _employee
) public view returns (uint256 earned)
```

**Returns:**

- `earned`: Amount currently withdrawable (in wei)

**Calculation:**

```
If stream inactive: return 0

elapsed = min(block.timestamp, endTime) - lastWithdrawal
earned = elapsed * ratePerSecond

If finite:
    remainingBudget = totalAmount - totalWithdrawn
    earned = min(earned, remainingBudget)
```

**Example:**

```solidity
uint256 amount = gainJar.withdrawable(employerAddress, employeeAddress);
// amount = 1500000000 (1,500 USDC)

// Can withdraw this amount via withdraw() or withdrawPartial()
```

---

### getSafeWithdrawableAmount

Get withdrawable amount with vault balance check.

```solidity
function getSafeWithdrawableAmount(
    address _employer,
    address _employee
) external view returns (
    uint256 totalEarned,
    uint256 safeAmount,
    bool isFullySafe
)
```

**Returns:**

- `totalEarned`: Full amount earned
- `safeAmount`: Maximum safely withdrawable (capped by vault balance)
- `isFullySafe`: True if vault can cover full amount

**Example:**

```solidity
(
    uint256 totalEarned,
    uint256 safeAmount,
    bool isFullySafe
) = gainJar.getSafeWithdrawableAmount(employerAddress, employeeAddress);

if (isFullySafe) {
    // Can withdraw full amount
    gainJar.withdraw(employerAddress);
} else {
    // Vault insufficient, withdraw safe amount only
    gainJar.withdrawPartial(employerAddress, safeAmount);
}
```

---

### getVaultHealth

Get comprehensive vault health information.

```solidity
function getVaultHealth(
    address _employer
) external view returns (
    uint256 balance,
    uint256 flowRate,
    uint256 daysRemaining,
    VaultStatus status,
    bool canCreateNewStream,
    uint256 maxAdditionalFlowRate
)
```

**Returns:**

- `balance`: Current vault USDC balance
- `flowRate`: Total flow rate (wei/second)
- `daysRemaining`: Days until vault depletes
- `status`: HEALTHY / WARNING / CRITICAL / EMERGENCY
- `canCreateNewStream`: Whether employer can create new streams
- `maxAdditionalFlowRate`: Max additional wei/sec before hitting minimum

**Example:**

```solidity
(
    uint256 balance,
    uint256 flowRate,
    uint256 daysRemaining,
    GainJar.VaultStatus status,
    bool canCreate,
    uint256 maxAdditional
) = gainJar.getVaultHealth(employerAddress);

console.log("Vault balance:", balance / 1e6, "USDC");
console.log("Days remaining:", daysRemaining);
console.log("Status:", status); // 0=HEALTHY, 1=WARNING, 2=CRITICAL, 3=EMERGENCY
```

---

### getVaultStatus

Get current vault health status.

```solidity
function getVaultStatus(
    address _employer
) public view returns (VaultStatus)
```

**Returns:**

- `VaultStatus`: HEALTHY (0), WARNING (1), CRITICAL (2), or EMERGENCY (3)

**Thresholds:**

- HEALTHY: ≥30 days
- WARNING: 7-29 days
- CRITICAL: 3-6 days
- EMERGENCY: <3 days

**Example:**

```solidity
GainJar.VaultStatus status = gainJar.getVaultStatus(employerAddress);

if (status == GainJar.VaultStatus.EMERGENCY) {
    // Vault critically low, eligible for liquidation
}
```

---

### getTotalFlowRate

Get total flow rate across all active streams.

```solidity
function getTotalFlowRate(
    address _employer
) public view returns (uint256 totalRate)
```

**Returns:**

- `totalRate`: Sum of all active stream rates (wei/second)

**Example:**

```solidity
uint256 flowRate = gainJar.getTotalFlowRate(employerAddress);
// flowRate = 3472 wei/sec

// Convert to USDC/day:
uint256 perDay = flowRate * 86400 / 1e6;
// perDay = 300 USDC/day
```

---

### getVaultDepletionTime

Get time until vault depletes at current flow rate.

```solidity
function getVaultDepletionTime(
    address _employer
) public view returns (uint256 secondsUntilEmpty)
```

**Returns:**

- `secondsUntilEmpty`: Seconds until vault balance reaches 0
- Returns `type(uint256).max` if no active streams

**Example:**

```solidity
uint256 depletion = gainJar.getVaultDepletionTime(employerAddress);
uint256 daysLeft = depletion / 86400;
// daysLeft = 25 days
```

---

### hasMinimumCoverage

Check if employer vault meets minimum coverage requirement.

```solidity
function hasMinimumCoverage(
    address _employer
) external view returns (bool)
```

**Returns:**

- `bool`: True if vault has ≥7 days coverage

**Calculation:**

```
required = totalFlowRate * MIN_COVERAGE_DAYS_SECOND (7 days)
return vaultBalance >= required
```

**Example:**

```solidity
bool hasCoverage = gainJar.hasMinimumCoverage(employerAddress);

if (!hasCoverage) {
    // Cannot create new streams
    // Should deposit more funds
}
```

---

### getLiquidationPreview

Preview liquidation outcome before executing.

```solidity
function getLiquidationPreview(
    address _employer
) external view returns (
    bool eligible,
    VaultStatus status,
    uint256 totalEmployeeEarnings,
    uint256 estimatedReward,
    uint256 vaultAfterLiquidation,
    uint256 cooldownRemaining
)
```

**Returns:**

- `eligible`: Whether liquidation can be executed
- `status`: Current vault status
- `totalEmployeeEarnings`: Sum of all active employee earnings
- `estimatedReward`: Liquidator reward if executed
- `vaultAfterLiquidation`: Vault balance after liquidation
- `cooldownRemaining`: Seconds until cooldown expires (0 if ready)

**Example:**

```solidity
(
    bool eligible,
    GainJar.VaultStatus status,
    uint256 totalEarnings,
    uint256 reward,
    uint256 vaultAfter,
    uint256 cooldown
) = gainJar.getLiquidationPreview(employerAddress);

if (eligible && cooldown == 0) {
    console.log("Can liquidate!");
    console.log("Reward:", reward / 1e6, "USDC");
    gainJar.liquidate(employerAddress);
}
```

---

### getActiveEmployeeCount

Get number of active employees for employer.

```solidity
function getActiveEmployeeCount(
    address _employer
) external view returns (uint256)
```

**Returns:**

- `uint256`: Count of active streams

**Example:**

```solidity
uint256 activeCount = gainJar.getActiveEmployeeCount(employerAddress);
// activeCount = 15
```

---

### getTotalEmployeeCount

Get total number of employees (including inactive) for employer.

```solidity
function getTotalEmployeeCount(
    address _employer
) external view returns (uint256)
```

**Returns:**

- `uint256`: Total count (historical)

**Example:**

```solidity
uint256 totalCount = gainJar.getTotalEmployeeCount(employerAddress);
uint256 activeCount = gainJar.getActiveEmployeeCount(employerAddress);

console.log("Total employees:", totalCount);
console.log("Active employees:", activeCount);
console.log("Inactive employees:", totalCount - activeCount);
```

---

### getActiveEmployees

Get array of active employee addresses.

```solidity
function getActiveEmployees(
    address _employer
) external view returns (address[] memory)
```

**Returns:**

- `address[]`: Array of active employee addresses

**Example:**

```solidity
address[] memory activeEmployees = gainJar.getActiveEmployees(employerAddress);

for (uint256 i = 0; i < activeEmployees.length; i++) {
    console.log("Active employee:", activeEmployees[i]);
}
```

---

### getAllEmployees

Get array of all employee addresses (including inactive).

```solidity
function getAllEmployees(
    address _employer
) external view returns (address[] memory)
```

**Returns:**

- `address[]`: Array of all employee addresses (historical)

**Example:**

```solidity
address[] memory allEmployees = gainJar.getAllEmployees(employerAddress);
// Includes both active and paused streams
```

---

### isActiveEmployee

Check if an employee has an active stream with employer.

```solidity
function isActiveEmployee(
    address _employer,
    address _employee
) external view returns (bool)
```

**Returns:**

- `bool`: True if stream is active

**Example:**

```solidity
bool isActive = gainJar.isActiveEmployee(employerAddress, employeeAddress);

if (isActive) {
    // Employee is currently earning
} else {
    // Stream paused or doesn't exist
}
```

---

### getFeeBasisPoints

Get current protocol fee in basis points.

```solidity
function getFeeBasisPoints() external view returns (uint256)
```

**Returns:**

- `uint256`: Fee in basis points (default: 5 = 0.05%)

**Example:**

```solidity
uint256 feeBps = gainJar.getFeeBasisPoints();
// feeBps = 5 (0.05%)

// Convert to percentage:
uint256 feePercent = feeBps / 100;
// feePercent = 0.05%
```

---

### getAccumulatedFees

Get total accumulated protocol fees.

```solidity
function getAccumulatedFees() external view returns (uint256)
```

**Returns:**

- `uint256`: Total accumulated fees (in wei)

**Example:**

```solidity
uint256 fees = gainJar.getAccumulatedFees();
console.log("Accumulated fees:", fees / 1e6, "USDC");
```

---

### getMinCoverageDaysSecond

Get the minimum coverage requirement constant (7 days).

```solidity
function getMinCoverageDaysSecond() external pure returns (uint256)
```

**Returns:**

- `uint256`: 604,800 (7 days in seconds)

**Example:**

```solidity
uint256 minDays = gainJar.getMinCoverageDaysSecond();
// minDays = 604800 seconds = 7 days
```

---

### getMinRequiredVaultBalance

Get minimum required vault balance for current streams.

```solidity
function getMinRequiredVaultBalance(
    address _employer
) public view returns (uint256)
```

**Returns:**

- `uint256`: Minimum required balance (in wei)

**Calculation:**

```
minRequired = totalFlowRate * MIN_COVERAGE_DAYS_SECOND
```

**Example:**

```solidity
uint256 minRequired = gainJar.getMinRequiredVaultBalance(employerAddress);
(uint256 currentBalance,,,,) = gainJar.getVaultHealth(employerAddress);

if (currentBalance < minRequired) {
    // Insufficient for creating new streams
}
```

---

## Events

### FundDeposited

Emitted when employer deposits funds.

```solidity
event FundDeposited(
    address indexed _employer,
    uint256 _amount
)
```

---

### StreamCreated

Emitted when a new stream is created.

```solidity
event StreamCreated(
    address indexed _employer,
    address indexed _employee,
    uint256 _ratePerSecond,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _totalAmount,
    StreamType _type,
    uint256 _finalPayout
)
```

---

### Withdrawal

Emitted when employee withdraws earnings.

```solidity
event Withdrawal(
    address indexed _employee,
    uint256 _amount,
    uint256 _fee
)
```

---

### StreamPaused

Emitted when employer pauses a stream.

```solidity
event StreamPaused(
    address indexed _employer,
    address indexed _employee
)
```

---

### StreamEnded

Emitted when a finite stream ends or is fully withdrawn.

```solidity
event StreamEnded(
    address indexed _employer,
    address indexed _employee
)
```

---

### Liquidated

Emitted when an employer vault is liquidated.

```solidity
event Liquidated(
    address indexed _liquidator,
    address indexed _employer,
    uint256 _totalPaidToEmployees,
    uint256 _reward,
    uint256 _streamsPaused
)
```

---

### FeeUpdated

Emitted when protocol fee is updated.

```solidity
event FeeUpdated(
    uint256 _oldFee,
    uint256 _newFee
)
```

---

### FeeClaimed

Emitted when owner claims accumulated fees.

```solidity
event FeeClaimed(
    address indexed _owner,
    uint256 _amount
)
```

---

## Errors

### GainJar\_\_DepositCantBeZero

Thrown when trying to deposit 0 amount.

### GainJar\_\_InvalidAddress

Thrown when employee address is zero address.

### GainJar\_\_SalaryCantBeZero

(Deprecated - not used in current implementation)

### GainJar\_\_PeriodCantBeZero

Thrown when period/duration is 0.

### GainJar\_\_StreamExists

Thrown when trying to create stream for employee who already has active stream.

### GainJar\_\_StreamNotActive

Thrown when trying to operate on inactive stream.

### GainJar\_\_AmountExceedsEarned

Thrown when withdrawal amount exceeds earned amount.

### GainJar\_\_AmountTooSmall

Thrown when amount < period (precision issue).

### GainJar\_\_OnlyInfiniteStream

Thrown when operation only works on infinite streams.

### GainJar\_\_OnlyFiniteStream

Thrown when operation only works on finite streams.

### GainJar\_\_NothingToWithdraw

Thrown when withdrawable amount is 0.

### GainJar\_\_InsufficientEmployerVault

Thrown when employer vault has insufficient balance.

### GainJar\_\_VaultNotEligibleForLiquidation

Thrown when vault status is not CRITICAL/EMERGENCY.

### GainJar\_\_LiquidationCooldownActive

Thrown when liquidation attempted during cooldown period.

### GainJar\_\_InsufficientVaultForLiquidation

Thrown when vault cannot cover employee earnings + liquidator reward.

### GainJar\_\_InsufficientVaultForReward

(Not used in current implementation)

### GainJar\_\_AlreadyLiquidated

(Not used in current implementation)

### GainJar\_\_FeeExceedsMax

Thrown when trying to set fee > 100 basis points (1%).

### GainJar\_\_NoFeesToClaim

Thrown when trying to claim fees but accumulated fees is 0.

---

**Next:** [Examples](./EXAMPLES.md) | [Security](./SECURITY.md)
