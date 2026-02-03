# GainJar Security Guide 🔐

> Security considerations, attack vectors, mitigation strategies, and best practices.

## Table of Contents

- [Security Overview](#security-overview)
- [Attack Vectors & Mitigations](#attack-vectors--mitigations)
- [Access Control](#access-control)
- [Reentrancy Protection](#reentrancy-protection)
- [Integer Overflow Protection](#integer-overflow-protection)
- [Best Practices](#best-practices)
- [Known Limitations](#known-limitations)
- [Audit Recommendations](#audit-recommendations)

---

## Security Overview

### Security Features ✅

| Feature                | Implementation    | Protection Against                |
| ---------------------- | ----------------- | --------------------------------- |
| ReentrancyGuard        | OpenZeppelin      | Reentrancy attacks on withdrawals |
| Ownable                | OpenZeppelin      | Unauthorized admin access         |
| Solidity ^0.8.0        | Built-in          | Integer overflow/underflow        |
| Dual-list architecture | Custom            | DoS via employee list bloat       |
| Minimum coverage       | 7-day requirement | Vault depletion                   |
| Liquidation cooldown   | 1-hour delay      | Spam liquidations                 |
| Fee caps               | Max 1% (100 bps)  | Excessive fees                    |
| Input validation       | All functions     | Invalid parameters                |

### Threat Model

**Actors:**

- 👔 **Employers** - Deposit funds, create/manage streams
- 👷 **Employees** - Withdraw earnings
- 🔍 **Liquidators** - Monitor vaults, execute liquidations
- 👑 **Owner** - Manage fees, claim protocol revenue
- 🎭 **Attackers** - Malicious actors attempting exploits

**Trust Assumptions:**

- USDC token contract is secure and non-malicious
- Blockchain infrastructure is reliable
- Oracle time (block.timestamp) is reasonably accurate

---

## Attack Vectors & Mitigations

### 1. Reentrancy Attacks

**Attack Vector:**

```solidity
// Malicious employee contract
contract MaliciousEmployee {
    GainJar public gainjar;
    address public employer;

    function attack() external {
        gainjar.withdraw(employer);
    }

    // Reentrancy attempt via USDC transfer callback
    receive() external payable {
        if (gainjar.withdrawable(employer, address(this)) > 0) {
            gainjar.withdraw(employer); // Try to withdraw again
        }
    }
}
```

**Mitigation:**

```solidity
// ✅ ReentrancyGuard on all withdrawal functions
function withdraw(address _employer) external nonReentrant {
    // State changes BEFORE external calls
    stream.lastWithdrawal = block.timestamp;
    stream.totalWithdrawn += amount;
    s_vaultBalances[_employer] -= amount;

    // External call AFTER state changes (CEI pattern)
    i_paymentToken.transfer(_employee, netAmount);
}
```

**Status:** ✅ **MITIGATED** via:

- `nonReentrant` modifier on `withdraw()`, `withdrawPartial()`, `liquidate()`
- Checks-Effects-Interactions (CEI) pattern
- State updates before external calls

---

### 2. DoS via Employee List Bloat

**Attack Vector:**

```solidity
// Attacker creates thousands of streams to bloat employee list
for (uint256 i = 0; i < 10000; i++) {
    employer.createHourlyStream(attackerAddress[i], 1e6); // Minimal rate
    employer.pauseStream(attackerAddress[i]); // Pause immediately
}

// Result: s_employeeList[employer] = 10,000 addresses
// Consequence: liquidate() loops 10,000x → out of gas
```

**Mitigation:**

```solidity
// ✅ Dual-list architecture
// Active operations only iterate s_activeEmployeeList (not all employees)

function getTotalFlowRate(address _employer) public view returns (uint256) {
    address[] memory activeEmployees = s_activeEmployeeList[_employer];
    // Only loops active streams, not inactive
    for (uint256 i = 0; i < activeEmployees.length; i++) {
        // ...
    }
}

// Attacker's paused streams don't affect gas costs!
```

**Status:** ✅ **MITIGATED** via:

- Dual-list architecture (active vs all employees)
- Critical functions only iterate active list
- Paused streams removed from active list immediately

---

### 3. Vault Draining via Flash Loans

**Attack Vector:**

```solidity
// Attacker borrows large USDC amount via flash loan
// Deposits to vault, creates high-rate stream, immediately withdraws
// Attempts to drain vault in single transaction
```

**Mitigation:**

```solidity
// ✅ Minimum coverage requirement prevents this
function _createStream(...) {
    // Requires 7-day minimum coverage
    uint256 minRequired = newFlowRate * MIN_COVERAGE_DAYS_SECOND;
    require(vaultBalance >= minRequired);

    // Employee cannot withdraw more than accrued over time
    // Flash loan must be held for 7+ days → not profitable
}
```

**Status:** ✅ **MITIGATED** via:

- 7-day minimum coverage requirement
- Time-based accrual (cannot withdraw unaccrued funds)
- Withdrawal limited to `elapsed_time * rate`

---

### 4. Precision Loss in Rate Calculation

**Attack Vector:**

```solidity
// Small amount over long period causes precision loss
createInfiniteStream(employee, 1, 1000 days);
// rate = 1 / 86,400,000 = 0.0000000115... → rounds to 0
// Employee earns nothing!
```

**Mitigation:**

```solidity
// ✅ Minimum amount validation
if (_amount < _durationInSeconds) {
    revert GainJar__AmountTooSmall();
}

// Ensures: rate = amount / duration >= 1 wei/sec minimum
```

**Additional Protection:**

```solidity
// Finite streams use finalPayout for remainder
finalPayout = totalAmount % duration;
// Employee receives exact totalAmount over time
```

**Status:** ✅ **MITIGATED** via:

- Minimum amount >= duration check
- `finalPayout` ensures no loss on finite streams
- Rate always >= 1 wei/second

---

### 5. Liquidation Front-running

**Attack Vector:**

```solidity
// Liquidator sees profitable liquidation in mempool
// Attacker front-runs with higher gas to steal reward
```

**Mitigation:**

```solidity
// ⚠️ Not fully mitigated - inherent to public mempools
// Partial mitigation: Cooldown period prevents spam
```

**Status:** ⚠️ **PARTIALLY MITIGATED**

- Liquidation cooldown (1 hour) reduces MEV extraction
- Reward cap ($50 max) limits incentive for complex attacks
- Consider: Private mempool support (Flashbots, etc.) for liquidators

---

### 6. Fee Manipulation

**Attack Vector:**

```solidity
// Owner suddenly increases fee to 1% before large withdrawal
owner.updateFee(100); // 1%

// Employee loses 1% instead of 0.05%
employee.withdraw(employer); // Large withdrawal
```

**Mitigation:**

```solidity
// ✅ Fee capped at maximum 1%
if (_newFeeBasisPoints > MAX_FEE_BASIS_POINTS) {
    revert GainJar__FeeExceedsMax(_newFeeBasisPoints, MAX_FEE_BASIS_POINTS);
}

// Constant: MAX_FEE_BASIS_POINTS = 100 (1%)
```

**Status:** ✅ **MITIGATED** via:

- Hard cap at 1% maximum fee
- Transparent on-chain fee changes
- Employees can monitor and react to fee changes

**Best Practice:**

- Implement timelock for fee changes (future improvement)
- Notify users before fee updates

---

### 7. Timestamp Manipulation

**Attack Vector:**

```solidity
// Miner manipulates block.timestamp to game withdrawals
// Move time forward to accrue more earnings
```

**Mitigation:**

```solidity
// ⚠️ Limited mitigation - inherent to blockchain design
// Ethereum: ~15 second drift tolerance
// Impact: Minimal (seconds of extra earnings)
```

**Analysis:**

```
Maximum manipulation: ~15 seconds
Maximum extra earnings: 15 * ratePerSecond

Example:
- Rate: $100/day = 1,157 wei/sec
- Max manipulation: 15 seconds
- Extra earnings: 15 * 1,157 = 17,355 wei = $0.017

Economic impact: Negligible
```

**Status:** ✅ **ACCEPTABLE RISK**

- Manipulation limited by blockchain consensus
- Economic impact minimal
- Cost of manipulation >> potential gain

---

### 8. Griefing via Minimum Coverage

**Attack Vector:**

```solidity
// Employer creates many small streams to lock funds
createHourlyStream(emp1, 1e6); // $1/hour each
createHourlyStream(emp2, 1e6);
// ... 1000 employees
// Total: $1000/hour = $168,000 minimum vault

// Employer's funds locked, cannot create new streams
```

**Mitigation:**

```solidity
// ⚠️ Intentional design - protects employees
// Employer can pause streams to free up capacity

pauseStream(emp1); // Reduces flow rate
// Minimum requirement decreases
// Can now create new streams
```

**Status:** ✅ **FEATURE NOT BUG**

- Protects employees from under-funded vaults
- Employer controls via pause/create workflow
- Predictable via `getVaultHealth()`

---

### 9. Locked Funds from Inactive Streams

**Attack Vector:**

```solidity
// Employer pauses stream, employee never withdraws pending earnings
// Funds stuck in vault forever
```

**Mitigation:**

```solidity
// ✅ Employee can withdraw even after pause
function withdraw(address _employer) external {
    // Works even if stream.isActive == false
    // As long as withdrawable > 0
}

// Employer can see pending amounts via:
getSafeWithdrawableAmount(employer, employee);
```

**Status:** ✅ **MITIGATED** via:

- Withdrawals work regardless of stream active status
- Clear view functions for pending amounts
- No time limit on withdrawals

---

### 10. Gas Griefing on Liquidation

**Attack Vector:**

```solidity
// Attacker creates 1000 active streams with tiny rates
// Liquidation must process all 1000 → high gas cost
// Liquidator reward ($1-$50) < gas cost → unprofitable
```

**Mitigation:**

```solidity
// ✅ Dual-list architecture limits impact
// ⚠️ Still possible if truly 1000+ active streams

// Potential improvements:
// - Batch liquidation (process N employees at a time)
// - Higher minimum coverage requirement
// - Employer-funded liquidation priority
```

**Status:** ⚠️ **PARTIALLY MITIGATED**

- Dual-list reduces gas significantly
- Edge case: Legitimate employer with 1000+ active employees
- Reward may not cover gas on L1 (but fine on L2s)

**Recommendation:**

- Deploy on L2s (Arbitrum, Optimism) for lower gas costs
- Consider batch liquidation for large employers

---

## Access Control

### Role-based Permissions

| Function       | Employer | Employee | Liquidator | Owner | Anyone |
| -------------- | -------- | -------- | ---------- | ----- | ------ |
| deposit()      | ✅       | ❌       | ❌         | ✅    | ❌     |
| createStream() | ✅       | ❌       | ❌         | ❌    | ❌     |
| updateRate()   | ✅       | ❌       | ❌         | ❌    | ❌     |
| pauseStream()  | ✅       | ❌       | ❌         | ❌    | ❌     |
| withdraw()     | ❌       | ✅       | ❌         | ❌    | ❌     |
| liquidate()    | ❌       | ❌       | ✅         | ✅    | ✅     |
| updateFee()    | ❌       | ❌       | ❌         | ✅    | ❌     |
| claimFees()    | ❌       | ❌       | ❌         | ✅    | ❌     |
| View functions | ✅       | ✅       | ✅         | ✅    | ✅     |

### Critical Access Patterns

```solidity
// 1. msg.sender is employer (implicit)
function createStream(address _employee, ...) public {
    // Creates: s_streams[msg.sender][_employee]
    // Only msg.sender can create streams as employer
}

// 2. msg.sender is employee (implicit)
function withdraw(address _employer) external {
    // Withdraws: s_streams[_employer][msg.sender]
    // Only msg.sender can withdraw their earnings
}

// 3. Owner-only (explicit)
function updateFee(uint256 _newFee) external onlyOwner {
    // OpenZeppelin Ownable modifier
}

// 4. Anyone can liquidate (intentional)
function liquidate(address _employer) external {
    // Public good - protects employees
    // Incentivized via reward
}
```

---

## Reentrancy Protection

### Protected Functions

All functions with external calls are protected:

```solidity
// ✅ Protected
function withdraw(address _employer) external nonReentrant { ... }
function withdrawPartial(address _employer, uint256 _amount) external nonReentrant { ... }
function liquidate(address _employer) external nonReentrant { ... }

// ❌ Not needed (no external calls)
function deposit(uint256 _amount) external { ... }
function createStream(...) public { ... }
function pauseStream(...) external { ... }
```

### CEI Pattern Implementation

```solidity
// Checks-Effects-Interactions Pattern

function withdraw(address _employer) external nonReentrant {
    // 1. CHECKS
    Stream storage stream = s_streams[_employer][msg.sender];
    if (!stream.isActive) revert GainJar__StreamNotActive();
    uint256 amount = withdrawable(_employer, msg.sender);
    if (amount == 0) revert GainJar__NothingToWithdraw();
    if (s_vaultBalances[_employer] < amount) revert();

    // 2. EFFECTS (state changes)
    stream.lastWithdrawal = block.timestamp;
    stream.totalWithdrawn += amount;
    s_vaultBalances[_employer] -= amount;
    s_accumulatedFees += fee;

    // 3. INTERACTIONS (external calls)
    i_paymentToken.transfer(msg.sender, netAmount);

    // Safe: State already updated, reentrancy blocked
}
```

---

## Integer Overflow Protection

### Solidity ^0.8.0 Built-in Protection

```solidity
// ✅ Automatic overflow/underflow checks
uint256 a = type(uint256).max;
uint256 b = a + 1; // Reverts automatically

uint256 c = 0;
uint256 d = c - 1; // Reverts automatically
```

### Critical Calculations

```solidity
// Rate calculation (safe from overflow)
ratePerSecond = totalAmount / duration;
// Division never overflows

// Withdrawable calculation (safe)
earned = elapsed * ratePerSecond;
// Maximum: (type(uint256).max seconds) * (type(uint256).max wei/sec)
// Practically impossible to overflow
// Would require: 10^77 years OR 10^77 USDC

// Vault balance (safe)
vaultBalance += depositAmount;
// Protected by USDC total supply cap (< 2^256)
```

### Unchecked Blocks (Intentional)

None currently used. All arithmetic uses checked math.

---

## Best Practices

### For Employers

1. **Maintain Healthy Vault:**

   ```solidity
   // Check before creating streams
   (,, uint256 daysRemaining, VaultStatus status,,) =
       gainJar.getVaultHealth(employerAddress);

   require(daysRemaining >= 30, "Deposit more funds");
   ```

2. **Monitor Vault Status:**

   ```solidity
   // Set up alerts for WARNING status
   if (status == VaultStatus.WARNING) {
       // Alert employer to deposit more funds
   }
   ```

3. **Plan for Minimum Coverage:**

   ```solidity
   uint256 minRequired = gainJar.getMinRequiredVaultBalance(employerAddress);
   uint256 recommended = minRequired * 4; // 28 days coverage

   // Deposit recommended amount
   gainJar.deposit(recommended);
   ```

4. **Pause Before Removing Funds:**

   ```solidity
   // Don't rely on external vault draining
   // Always pause streams first
   pauseStream(employee1);
   pauseStream(employee2);
   // Then withdraw excess (future feature)
   ```

### For Employees

1. **Regular Withdrawals:**

   ```solidity
   // Don't accumulate large amounts
   // Withdraw regularly to minimize risk

   if (withdrawable >= threshold) {
       gainJar.withdraw(employer);
   }
   ```

2. **Check Vault Safety:**

   ```solidity
   (uint256 earned, uint256 safe, bool isFullySafe) =
       gainJar.getSafeWithdrawableAmount(employer, employee);

   if (!isFullySafe) {
       // Employer vault low, withdraw carefully
       gainJar.withdrawPartial(employer, safe);
   }
   ```

3. **Monitor Employer Health:**

   ```solidity
   VaultStatus status = gainJar.getVaultStatus(employer);

   if (status == VaultStatus.EMERGENCY) {
       // Employer in trouble
       // Withdraw immediately or wait for liquidation
   }
   ```

### For Liquidators

1. **Monitor Multiple Employers:**

   ```solidity
   // Off-chain script
   for (employer in employerList) {
       (bool eligible,,,,,) = gainJar.getLiquidationPreview(employer);

       if (eligible) {
           // Calculate if profitable (gas vs reward)
           if (estimatedReward > estimatedGasCost) {
               gainJar.liquidate(employer);
           }
       }
   }
   ```

2. **Gas Optimization:**

   ```solidity
   // On L2s (Arbitrum, Optimism) - much cheaper
   // On L1 - only liquidate if reward > $10 (covers gas)
   ```

3. **Cooldown Awareness:**

   ```solidity
   // Check cooldown before attempting
   (,,,, uint256 cooldown) = gainJar.getLiquidationPreview(employer);

   if (cooldown > 0) {
       // Schedule retry after cooldown
       scheduleRetry(employer, block.timestamp + cooldown);
   }
   ```

### For Integrators

1. **Event Monitoring:**

   ```solidity
   // Listen to events for real-time updates
   gainJar.on("StreamCreated", (employer, employee, rate, ...) => {
       // Update UI
   });

   gainJar.on("Withdrawal", (employee, amount, fee) => {
       // Update balance
   });
   ```

2. **Error Handling:**

   ```solidity
   try {
       await gainJar.withdraw(employer);
   } catch (error) {
       if (error.code === "INSUFFICIENT_VAULT") {
           // Show user: "Employer vault insufficient"
       }
   }
   ```

3. **Batch Queries:**

   ```solidity
   // Use multicall for efficiency
   const results = await multicall([
       gainJar.getStreamInfo(employer, employee),
       gainJar.withdrawable(employer, employee),
       gainJar.getVaultHealth(employer)
   ]);
   ```

---

## Known Limitations

### 1. No Partial Refunds for Employers

**Limitation:** Employers cannot withdraw unused vault funds.

**Workaround:**

- Pause all streams
- Wait for all employees to withdraw
- Calculate remaining balance manually

**Future Improvement:** Add `withdrawExcess()` function for employers.

---

### 2. Paused Streams Stay in History

**Limitation:** Paused streams remain in `s_employeeList` forever.

**Impact:**

- Minimal gas impact (dual-list architecture)
- Complete audit trail preserved

**Trade-off:** Historical record vs storage bloat → chose history.

---

### 3. No Stream Modification

**Limitation:** Cannot modify stream parameters (except rate for infinite).

**Workaround:**

- Pause old stream
- Create new stream with desired parameters

**Rationale:** Ensures immutability and clear accounting.

---

### 4. Fixed 1-Hour Liquidation Cooldown

**Limitation:** Cannot liquidate more than once per hour per employer.

**Impact:**

- Employers have time to refill
- Employees protected continuously

**Trade-off:** Recovery time vs liquidation frequency → chose recovery.

---

### 5. Gas Costs on Large Employee Lists

**Limitation:** Liquidating employer with 1000+ active employees is gas-intensive.

**Mitigation:**

- Dual-list architecture helps significantly
- Deploy on L2s for lower gas

**Future Improvement:** Batch liquidation support.

---

### 6. No Emergency Stop

**Limitation:** No pause mechanism for entire contract.

**Risk:** If critical bug found, cannot halt operations.

**Mitigation:**

- Thorough testing
- Formal audit recommended
- Users can always withdraw earnings

**Future Improvement:** Add circuit breaker pattern.

---

## Audit Recommendations

### Critical Areas for Review

1. **Reentrancy:**
   - Verify CEI pattern in all withdrawal functions
   - Check ReentrancyGuard coverage

2. **Arithmetic:**
   - Review rate calculations for precision loss
   - Verify finalPayout logic for finite streams
   - Check overflow scenarios in extreme cases

3. **Access Control:**
   - Verify employer-employee isolation
   - Check owner-only function protection
   - Review liquidation permissions

4. **State Management:**
   - Verify dual-list synchronization
   - Check for state inconsistencies
   - Review edge cases (pause, resume, extend)

5. **Economic Security:**
   - Verify liquidation incentives
   - Check fee mechanism
   - Review minimum coverage calculations

### Test Coverage Goals

- ✅ Unit tests: 100% function coverage
- ✅ Integration tests: All user flows
- ⚠️ Fuzzing: Recommended for arithmetic
- ⚠️ Formal verification: Recommended for critical invariants

### Formal Verification Targets

```
Invariant 1: Sum of all withdrawable ≤ vault balance
Invariant 2: totalWithdrawn ≤ totalEarned
Invariant 3: Active employees in active list, inactive not
Invariant 4: Fee always ≤ 1%
Invariant 5: Liquidation reward always ≤ $50
```

---

## Security Checklist

Before deployment:

- [ ] Comprehensive unit tests written and passing
- [ ] Integration tests for all user flows
- [ ] Fuzz testing on arithmetic operations
- [ ] Gas optimization reviewed
- [ ] External audit completed (if budget allows)
- [ ] Deployment script tested on testnet
- [ ] Emergency procedures documented
- [ ] Bug bounty program prepared
- [ ] Monitoring and alerting setup
- [ ] Documentation reviewed and finalized

---

## Incident Response

### If Critical Bug Found

1. **Immediate:**
   - Assess severity and impact
   - Document exploit path
   - Estimate affected users/funds

2. **Short-term:**
   - Notify users via all channels
   - If possible, guide users to withdraw
   - Prepare mitigation contract

3. **Long-term:**
   - Deploy fix or migration path
   - Compensate affected users if needed
   - Post-mortem analysis
   - Update documentation

### Contact

- **Security Issues:** <security@gainjar.io> (example)
- **Bug Bounty:** <bounty@gainjar.io> (example)

---

## Conclusion

GainJar implements multiple layers of security:

✅ **Strong protections:**

- Reentrancy guards
- Overflow protection
- DoS mitigation via dual-list
- Access controls

⚠️ **Areas for improvement:**

- Formal audit
- Circuit breaker pattern
- Batch liquidation support

**Overall Risk Assessment:** **MEDIUM**

Recommended for:

- ✅ L2 deployments (lower gas risk)
- ✅ Bug bounty program
- ✅ Gradual rollout with limits

Not recommended until:

- ❌ Formal security audit completed
- ❌ Extensive mainnet testing
- ❌ Emergency procedures established

---

**Next:** [Examples](./EXAMPLES.md) | [Back to README](./README.md)
