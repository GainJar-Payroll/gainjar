# GainJar 💰

> A decentralized payroll streaming protocol enabling continuous, real-time salary payments on the blockchain.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.0-blue)](https://docs.soliditylang.org/)

## Overview

GainJar is a smart contract protocol that revolutionizes payroll by enabling **money streaming** - employees earn their salary in real-time, second by second, and can withdraw their earned wages at any moment without waiting for traditional pay cycles.

### Key Features

- **Real-time Streaming** - Salary streams continuously, second by second
- **Two Stream Types** - Support for both infinite (full-time) and finite (project-based) employment
- **Employer Vault System** - Secure fund management with health monitoring
- **Liquidation Protection** - Automatic employee protection when employer funds run low
- **Transparent Accounting** - All transactions and balances are on-chain and verifiable
- **Flexible Withdrawals** - Employees can withdraw earned wages anytime (full or partial)

### Use Cases

- **Full-time Employment** - Continuous salary streaming with hourly/daily/monthly rates
- **Project-based Work** - Fixed-duration contracts with predetermined total amounts
- **Freelance Payments** - Transparent, automated payments for independent contractors
- **DAO Contributors** - Decentralized payroll for DAO team members
- **Global Workforce** - Borderless payments in stablecoins (USDC)

## Table of Contents

- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Stream Types](#stream-types)
- [Vault Health System](#vault-health-system)
- [Liquidation Mechanism](#liquidation-mechanism)
- [Fee Structure](#fee-structure)
- [Documentation](#documentation)
- [Security](#security)
- [License](#license)

## How It Works

### The Flow

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Employer   │────────>│   GainJar    │────────>│   Employee   │
│   Deposit   │  USDC   │   Contract   │  Stream │  Withdrawal  │
│   Funds     │         │              │  Salary │              │
└─────────────┘         └──────────────┘         └──────────────┘
      │                        │                         │
      │                        │                         │
      ▼                        ▼                         ▼
  Vault Fund           Streaming Engine           Real-time Earn
```

1. **Employer deposits USDC** into their vault within the GainJar contract
2. **Employer creates a stream** for an employee (infinite or finite type)
3. **Salary streams automatically** - employee earns second by second
4. **Employee withdraws anytime** - full or partial withdrawal of earned wages
5. **Vault health monitored** - system alerts if employer funds are running low
6. **Liquidation protection** - employees protected if vault becomes critically low

## Quick Start

### For Employers

```solidity
// 1. Approve USDC spending
IERC20(usdcAddress).approve(gainJarAddress, depositAmount);

// 2. Deposit funds to your vault
gainJar.deposit(10000e6); // 10,000 USDC

// 3. Create a stream for your employee
// Option A: Monthly salary ($5,000/month)
gainJar.createMonthlyStream(employeeAddress, 5000e6);

// Option B: Hourly rate ($50/hour)
gainJar.createHourlyStream(employeeAddress, 50e6);

// Option C: Project-based (30 days, $6,000 total)
gainJar.createFiniteStreamDays(employeeAddress, 6000e6, 30);

// 4. Monitor your vault health
(uint256 balance, uint256 flowRate, uint256 daysRemaining,,,) =
    gainJar.getVaultHealth(employerAddress);
```

### For Employees

```solidity
// 1. Check your earnings
uint256 earned = gainJar.withdrawable(employerAddress, msg.sender);

// 2. Withdraw all earned salary
gainJar.withdraw(employerAddress);

// 3. Or withdraw partial amount
gainJar.withdrawPartial(employerAddress, 1000e6); // Withdraw 1,000 USDC

// 4. View your stream details
(
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
) = gainJar.getStreamInfo(employerAddress, employeeAddress);
```

### For Liquidators

```solidity
// 1. Check if employer vault is eligible for liquidation
(
    bool eligible,
    VaultStatus status,
    uint256 totalEmployeeEarnings,
    uint256 estimatedReward,
    uint256 vaultAfterLiquidation,
    uint256 cooldownRemaining
) = gainJar.getLiquidationPreview(employerAddress);

// 2. Execute liquidation if eligible (CRITICAL or EMERGENCY status)
if (eligible) {
    gainJar.liquidate(employerAddress);
    // Liquidator receives reward, all employees get paid, streams paused
}
```

## Stream Types

### 1. Infinite Stream (Full-time Employment)

For ongoing employment with no predetermined end date.

```solidity
// Hourly rate: $50/hour
gainJar.createHourlyStream(employee, 50e6);

// Monthly salary: $5,000/month
gainJar.createMonthlyStream(employee, 5000e6);

// Custom rate: $100 per day
gainJar.createInfiniteStream(employee, 100e6, 1 days);
```

**Characteristics:**

- No end time (`endTime = 0`)
- Streams indefinitely until paused by employer
- Perfect for full-time employees
- Can be updated with `updateInfiniteRate()`

### 2. Finite Stream (Project-based Work)

For fixed-duration contracts with a predetermined total amount.

```solidity
// Project: $6,000 over 30 days
gainJar.createFiniteStreamDays(employee, 6000e6, 30);

// Custom: $1,000 over 7 days (in seconds)
gainJar.createFiniteStream(employee, 1000e6, 7 days);
```

**Characteristics:**

- Fixed `endTime` and `totalAmount`
- Streams until duration expires
- Includes `finalPayout` for non-divisible remainder
- Automatically ends when fully withdrawn
- Can be extended with `extendFiniteStream()`

### Rate Calculation

```
Rate Per Second = Total Amount / Duration in Seconds

Example: $6,000 for 30 days
= 6,000,000,000 / (30 * 86,400)
= 6,000,000,000 / 2,592,000
= 2,314.814... USDC per second (in wei)

Final Payout = Total Amount % Duration
= 6,000,000,000 % 2,592,000
= 1,600,000 wei (paid with last withdrawal)
```

## 🏥 Vault Health System

GainJar monitors employer vaults and classifies them into health statuses:

| Status           | Days Remaining | Description           | Action                  |
| ---------------- | -------------- | --------------------- | ----------------------- |
| 🟢 **HEALTHY**   | ≥ 30 days      | Vault well-funded     | Normal operations       |
| 🟡 **WARNING**   | 7-29 days      | Vault needs attention | Employer should deposit |
| 🟠 **CRITICAL**  | 3-6 days       | Vault running low     | Liquidation eligible    |
| 🔴 **EMERGENCY** | < 3 days       | Vault critically low  | Liquidation eligible    |

### Minimum Coverage Requirement

All employers must maintain at least **7 days** of coverage based on their total flow rate:

```solidity
Minimum Vault Balance = Total Flow Rate × 7 days

Example:
- Employee 1: $100/day = 1,157,407 wei/second
- Employee 2: $200/day = 2,314,814 wei/second
- Total Flow Rate = 3,472,221 wei/second
- Minimum Required = 3,472,221 × 604,800 = 2,100,000,000 wei (~$2,100)
```

### Checking Vault Health

```solidity
// Get comprehensive vault health
(
    uint256 balance,              // Current vault balance
    uint256 flowRate,             // Total wei/second across all streams
    uint256 daysRemaining,        // Days until vault depletes
    VaultStatus status,           // HEALTHY/WARNING/CRITICAL/EMERGENCY
    bool canCreateNewStream,      // Can create more streams?
    uint256 maxAdditionalFlowRate // Max flow rate before hitting minimum
) = gainJar.getVaultHealth(employerAddress);

// Quick check: has minimum coverage?
bool hasCoverage = gainJar.hasMinimumCoverage(employerAddress);
```

## Liquidation Mechanism

The liquidation system protects employees when employer vaults run critically low.

### When Liquidation Occurs

- Vault status is **CRITICAL** (3-6 days) or **EMERGENCY** (<3 days)
- Cooldown period has passed (1 hour since last liquidation)
- Vault has sufficient balance to pay employees + liquidator reward

### Liquidation Process

```
1. Liquidator calls liquidate(employer)
2. System calculates total employee earnings
3. Dynamic reward calculated (5-10% of earnings, $1-$50 cap)
4. All active streams paused
5. Employees receive earned wages (minus 0.05% protocol fee)
6. Liquidator receives reward
7. Employer must redeposit and manually restart streams
```

### Liquidation Reward Formula

```solidity
Base Reward = Total Employee Earnings × 5% (500 bps)

If EMERGENCY status:
    Reward = Base Reward × 2 (severity multiplier)

Final Reward = max($1 USDC, min(Calculated Reward, $50 USDC))
```

**Example:**

- Total employee earnings: $1,000
- Base reward: $1,000 × 5% = $50
- Status: EMERGENCY
- Multiplied reward: $50 × 2 = $100
- Capped reward: min($100, $50) = **$50 USDC**

### Liquidation Preview

```solidity
(
    bool eligible,
    VaultStatus status,
    uint256 totalEmployeeEarnings,
    uint256 estimatedReward,
    uint256 vaultAfterLiquidation,
    uint256 cooldownRemaining
) = gainJar.getLiquidationPreview(employerAddress);

if (eligible && cooldownRemaining == 0) {
    // Safe to liquidate
    gainJar.liquidate(employerAddress);
}
```

## Fee Structure

GainJar charges a minimal protocol fee on employee withdrawals:

- **Default Fee:** 0.05% (5 basis points)
- **Maximum Fee:** 1% (100 basis points)
- **Fee Recipient:** Contract owner (for protocol maintenance)

### Fee Calculation

```solidity
Fee = Withdrawal Amount × Fee Basis Points / 10,000

Example: Withdraw $1,000 with 0.05% fee
- Fee = 1,000,000,000 × 5 / 10,000 = 500,000 wei ($0.50)
- Employee receives = $1,000 - $0.50 = $999.50
```

### Fee Functions

```solidity
// Owner can update fee (max 1%)
gainJar.updateFee(10); // Set to 0.1% (10 bps)

// Owner can claim accumulated fees
gainJar.claimFees();

// View current fee
uint256 currentFee = gainJar.getFeeBasisPoints(); // Returns 5 (0.05%)
uint256 accumulated = gainJar.getAccumulatedFees(); // Returns total fees
```

## Documentation

Comprehensive documentation is available:

- **[Architecture Guide](./ARCHITECTURE.md)** - Technical deep dive, design patterns, data structures
- **[API Reference](./API_REFERENCE.md)** - Complete function documentation with examples
- **[Security Guide](./SECURITY.md)** - Security considerations, attack vectors, best practices
- **[Examples](./EXAMPLES.md)** - Integration examples, use case implementations

## Security

### Audits

⚠️ **This contract has not been formally audited.** Use at your own risk.

### Security Features

- ✅ **ReentrancyGuard** on all withdrawal functions
- ✅ **Dual-list architecture** prevents DoS attacks via employee list bloat
- ✅ **Minimum coverage requirements** prevent vault depletion
- ✅ **Liquidation cooldown** prevents spam liquidations
- ✅ **Access control** with OpenZeppelin Ownable
- ✅ **Input validation** on all critical parameters
- ✅ **Integer overflow protection** (Solidity ^0.8.0)

### Known Limitations

- Stream creation requires minimum 7-day vault coverage
- Liquidation has 1-hour cooldown between executions
- Paused streams remain in employee list (historical record)
- Fee changes affect future withdrawals only

See [SECURITY.md](./SECURITY.md) for detailed security analysis.

## 🛠️ Development

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

### Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/unit/GainJarViews.t.sol

# Gas report
forge test --gas-report
```

<!-- ### Deployment

```solidity
// Deploy with USDC address
forge create GainJar --constructor-args <USDC_ADDRESS>

// Example for Arbitrum mainnet
forge create GainJar \
    --constructor-args 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 \
    --rpc-url $ARBITRUM_RPC_URL \
    --private-key $PRIVATE_KEY
```

-->

## Supported Networks

GainJar can be deployed on any EVM-compatible chain with USDC:

- **Arbitrum Sepolia** - Mock USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`forge test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenZeppelin for secure contract libraries
- Foundry for the development framework
- The DeFi community for inspiration

## Support

- **Issues:** [GitHub Issues](https://github.com/raihanmd/gainjar/issues)
- **Discussions:** [GitHub Discussions](https://github.com/raihanmd/gainjar/discussions)
- **Twitter:** [@raihanmd](https://twitter.com/raihanmddd)

---

**⚠️ Disclaimer:** This is experimental software. Use at your own risk. Always test thoroughly before deploying to production.

**Built with ❤️ by [@raihanmd](https://github.com/raihanmd)**

