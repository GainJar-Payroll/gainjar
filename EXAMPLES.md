# GainJar Examples 💡

> Practical examples, integration patterns, and real-world use cases.

## Table of Contents

- [Basic Usage Examples](#basic-usage-examples)
- [Advanced Patterns](#advanced-patterns)
- [Integration Examples](#integration-examples)
- [Frontend Integration](#frontend-integration)
- [Monitoring & Automation](#monitoring--automation)
- [Real-world Scenarios](#real-world-scenarios)

---

## Basic Usage Examples

### Example 1: Simple Full-time Employment

```solidity
// Scenario: Company hires Alice at $5,000/month

// 1. Deploy GainJar (one-time)
GainJar gainjar = new GainJar(USDC_ADDRESS);

// 2. Employer deposits funds (6 months runway)
IERC20(USDC).approve(address(gainjar), 30000e6);
gainjar.deposit(30000e6); // $30,000

// 3. Create monthly stream for Alice
gainjar.createMonthlyStream(aliceAddress, 5000e6);

// 4. Alice withdraws after 1 week
vm.warp(block.timestamp + 7 days);
vm.prank(aliceAddress);
gainjar.withdraw(employerAddress);
// Alice receives: ~$1,250 (1/4 of monthly salary)

// 5. Alice withdraws after 1 month total
vm.warp(block.timestamp + 23 days); // Total 30 days
vm.prank(aliceAddress);
gainjar.withdraw(employerAddress);
// Alice receives: ~$3,750 (remaining 3/4)
```

---

### Example 2: Project-based Contractor

```solidity
// Scenario: Hire Bob for 3-month project at $12,000 total

// 1. Employer deposits with 7-day buffer
uint256 totalPay = 12000e6;
uint256 duration = 90 days;
uint256 ratePerSec = totalPay / duration;
uint256 minRequired = ratePerSec * 7 days;

IERC20(USDC).approve(address(gainjar), minRequired);
gainjar.deposit(minRequired); // Minimum ~$933

// 2. Create finite stream
gainjar.createFiniteStreamDays(bobAddress, totalPay, 90);

// 3. Bob withdraws periodically
vm.warp(block.timestamp + 30 days); // After 1 month
vm.prank(bobAddress);
gainjar.withdraw(employerAddress);
// Bob receives: ~$4,000 (1/3 of total)

vm.warp(block.timestamp + 30 days); // After 2 months
vm.prank(bobAddress);
gainjar.withdraw(employerAddress);
// Bob receives: ~$4,000 (another 1/3)

vm.warp(block.timestamp + 30 days); // After 3 months (end)
vm.prank(bobAddress);
gainjar.withdraw(employerAddress);
// Bob receives: ~$4,000 + finalPayout (final 1/3 + remainder)

// Stream automatically ends
(,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employerAddress, bobAddress);
assert(!isActive); // Stream ended
```

---

### Example 3: Partial Withdrawals

```solidity
// Scenario: Charlie wants to withdraw gradually for budgeting

// 1. Create hourly stream: $50/hour
gainjar.createHourlyStream(charlieAddress, 50e6);

// 2. After 8 hours (workday)
vm.warp(block.timestamp + 8 hours);

uint256 available = gainjar.withdrawable(employerAddress, charlieAddress);
// available = $400

// 3. Charlie withdraws only $100 for immediate needs
vm.prank(charlieAddress);
gainjar.withdrawPartial(employerAddress, 100e6);

// 4. Remaining $300 still withdrawable
uint256 remaining = gainjar.withdrawable(employerAddress, charlieAddress);
assert(remaining == 300e6);

// 5. Next day, Charlie withdraws everything
vm.warp(block.timestamp + 16 hours); // Total 24 hours
vm.prank(charlieAddress);
gainjar.withdraw(employerAddress);
// Receives: $300 (previous) + $800 (16 hours) = $1,100
```

---

### Example 4: Salary Adjustment

```solidity
// Scenario: Employee gets a raise from $100/day to $150/day

// 1. Initial stream
gainjar.createInfiniteStream(employeeAddress, 100e6, 1 days);

// 2. After 30 days, give raise
vm.warp(block.timestamp + 30 days);

// Old earned: 30 days * $100 = $3,000
uint256 oldEarnings = gainjar.withdrawable(employerAddress, employeeAddress);

// 3. Update rate (automatically withdraws pending)
vm.prank(employerAddress);
gainjar.updateInfiniteRate(employeeAddress, 150e6, 1 days);

// Employee automatically received $3,000
// New rate starts from now: $150/day

// 4. After 10 more days
vm.warp(block.timestamp + 10 days);
uint256 newEarnings = gainjar.withdrawable(employerAddress, employeeAddress);
// newEarnings = 10 days * $150 = $1,500
```

---

## Advanced Patterns

### Pattern 1: Multi-employee Management

```solidity
contract PayrollManager {
    GainJar public gainjar;
    address public company;

    struct Employee {
        address wallet;
        uint256 monthlySalary;
        bool isActive;
    }

    Employee[] public employees;

    function hireBatch(
        address[] calldata _wallets,
        uint256[] calldata _salaries
    ) external {
        require(_wallets.length == _salaries.length);

        // Calculate total monthly flow
        uint256 totalMonthly = 0;
        for (uint256 i = 0; i < _salaries.length; i++) {
            totalMonthly += _salaries[i];
        }

        // Ensure sufficient vault (6 months runway)
        uint256 required = (totalMonthly / 30 days) * 180 days;
        require(gainjar.hasMinimumCoverage(company));

        // Create streams
        for (uint256 i = 0; i < _wallets.length; i++) {
            gainjar.createMonthlyStream(_wallets[i], _salaries[i]);

            employees.push(Employee({
                wallet: _wallets[i],
                monthlySalary: _salaries[i],
                isActive: true
            }));
        }
    }

    function terminateEmployee(uint256 _index) external {
        require(_index < employees.length);
        require(employees[_index].isActive);

        address employee = employees[_index].wallet;
        gainjar.pauseStream(employee);

        employees[_index].isActive = false;
    }

    function getActiveCount() external view returns (uint256) {
        return gainjar.getActiveEmployeeCount(company);
    }
}
```

---

### Pattern 2: Vault Health Monitor

```solidity
contract VaultMonitor {
    GainJar public gainjar;

    event VaultAlert(
        address indexed employer,
        GainJar.VaultStatus status,
        uint256 daysRemaining
    );

    function checkVaultHealth(address employer) external {
        (
            ,
            ,
            uint256 daysRemaining,
            GainJar.VaultStatus status,
            ,
        ) = gainjar.getVaultHealth(employer);

        if (status == GainJar.VaultStatus.WARNING) {
            emit VaultAlert(employer, status, daysRemaining);
            // Send notification to employer
        } else if (status == GainJar.VaultStatus.CRITICAL) {
            emit VaultAlert(employer, status, daysRemaining);
            // Send urgent notification
        } else if (status == GainJar.VaultStatus.EMERGENCY) {
            emit VaultAlert(employer, status, daysRemaining);
            // Send critical alert + trigger liquidation
        }
    }

    function autoRefill(
        address employer,
        uint256 targetDays
    ) external {
        uint256 flowRate = gainjar.getTotalFlowRate(employer);
        uint256 currentBalance = /* get from vault health */;
        uint256 currentDays = currentBalance / (flowRate * 1 days);

        if (currentDays < targetDays) {
            uint256 needed = (flowRate * 1 days * targetDays) - currentBalance;
            // Transfer USDC to employer or trigger deposit
        }
    }
}
```

---

### Pattern 3: Liquidation Bot

```solidity
contract LiquidationBot {
    GainJar public gainjar;
    address[] public monitoredEmployers;

    mapping(address => uint256) public lastChecked;

    function addEmployer(address employer) external {
        monitoredEmployers.push(employer);
    }

    function scanAndLiquidate() external {
        for (uint256 i = 0; i < monitoredEmployers.length; i++) {
            address employer = monitoredEmployers[i];

            // Rate limit: check each employer max once per hour
            if (block.timestamp < lastChecked[employer] + 1 hours) {
                continue;
            }

            (
                bool eligible,
                ,
                ,
                uint256 estimatedReward,
                ,
                uint256 cooldownRemaining
            ) = gainjar.getLiquidationPreview(employer);

            lastChecked[employer] = block.timestamp;

            if (eligible && cooldownRemaining == 0) {
                // Calculate if profitable
                uint256 estimatedGas = 500000; // Estimate
                uint256 gasPrice = tx.gasprice;
                uint256 gasCost = estimatedGas * gasPrice;

                // Only liquidate if reward > gas cost
                if (estimatedReward > gasCost) {
                    gainjar.liquidate(employer);
                    // Reward received automatically
                }
            }
        }
    }
}
```

---

## Integration Examples

### Example: Frontend Integration (React + ethers.js)

```javascript
import { ethers } from "ethers";

// ABI (simplified)
const GAINJAR_ABI = [
  "function getStreamInfo(address employer, address employee) view returns (tuple(uint256 ratePerSecond, uint256 startTime, uint256 endTime, uint256 totalAmount, uint8 streamType, uint256 totalEarned, uint256 totalWithdrawn, uint256 withdrawableNow, bool isActive, bool isExpired))",
  "function withdraw(address employer)",
  "function withdrawPartial(address employer, uint256 amount)",
  "function createMonthlyStream(address employee, uint256 monthlyRate)",
  "event Withdrawal(address indexed employee, uint256 amount, uint256 fee)",
];

class GainJarClient {
  constructor(contractAddress, provider) {
    this.contract = new ethers.Contract(contractAddress, GAINJAR_ABI, provider);
  }

  // Get employee earnings
  async getEarnings(employer, employee) {
    const streamInfo = await this.contract.getStreamInfo(employer, employee);

    return {
      ratePerSecond: streamInfo.ratePerSecond,
      totalEarned: ethers.formatUnits(streamInfo.totalEarned, 6), // USDC decimals
      totalWithdrawn: ethers.formatUnits(streamInfo.totalWithdrawn, 6),
      withdrawableNow: ethers.formatUnits(streamInfo.withdrawableNow, 6),
      isActive: streamInfo.isActive,
    };
  }

  // Withdraw all earnings
  async withdraw(employer, signer) {
    const contract = this.contract.connect(signer);
    const tx = await contract.withdraw(employer);
    const receipt = await tx.wait();

    // Parse Withdrawal event
    const event = receipt.logs
      .map((log) => this.contract.interface.parseLog(log))
      .find((e) => e?.name === "Withdrawal");

    return {
      amount: ethers.formatUnits(event.args.amount, 6),
      fee: ethers.formatUnits(event.args.fee, 6),
      txHash: receipt.hash,
    };
  }

  // Real-time earnings (updates every second)
  async startEarningsStream(employer, employee, callback) {
    const streamInfo = await this.contract.getStreamInfo(employer, employee);

    if (!streamInfo.isActive) {
      throw new Error("Stream not active");
    }

    const ratePerSecond = streamInfo.ratePerSecond;
    const initialWithdrawable = streamInfo.withdrawableNow;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const newEarnings = ratePerSecond * BigInt(elapsed);
      const total = initialWithdrawable + newEarnings;

      callback({
        withdrawable: ethers.formatUnits(total, 6),
        ratePerDay: ethers.formatUnits(ratePerSecond * BigInt(86400), 6),
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }
}

// Usage in React component
function EmployeeDashboard({ employerAddress, employeeAddress }) {
  const [earnings, setEarnings] = useState(null);
  const [liveEarnings, setLiveEarnings] = useState("0");

  useEffect(() => {
    const client = new GainJarClient(GAINJAR_ADDRESS, provider);

    // Load initial data
    client.getEarnings(employerAddress, employeeAddress).then(setEarnings);

    // Start live earnings stream
    const cleanup = client.startEarningsStream(
      employerAddress,
      employeeAddress,
      (data) => setLiveEarnings(data.withdrawable),
    );

    return cleanup;
  }, [employerAddress, employeeAddress]);

  const handleWithdraw = async () => {
    const signer = provider.getSigner();
    const client = new GainJarClient(GAINJAR_ADDRESS, provider);

    const result = await client.withdraw(employerAddress, signer);
    alert(`Withdrawn $${result.amount} (Fee: $${result.fee})`);
  };

  return (
    <div>
      <h2>Live Earnings: ${liveEarnings}</h2>
      <p>Total Earned: ${earnings?.totalEarned}</p>
      <p>Withdrawn: ${earnings?.totalWithdrawn}</p>
      <button onClick={handleWithdraw}>Withdraw All</button>
    </div>
  );
}
```

---

### Example: Backend Monitoring (Node.js)

```javascript
const { ethers } = require("ethers");
const cron = require("node-cron");

class GainJarMonitor {
  constructor(contractAddress, provider) {
    this.contract = new ethers.Contract(contractAddress, GAINJAR_ABI, provider);
    this.employers = new Set();
  }

  addEmployer(address) {
    this.employers.add(address);
  }

  async checkVaultHealth(employer) {
    const health = await this.contract.getVaultHealth(employer);

    const status = ["HEALTHY", "WARNING", "CRITICAL", "EMERGENCY"][
      health.status
    ];
    const daysRemaining = Number(health.daysRemaining);

    console.log(`Employer ${employer}:`);
    console.log(`  Status: ${status}`);
    console.log(`  Days Remaining: ${daysRemaining}`);

    if (status === "WARNING") {
      this.sendAlert(
        employer,
        "Vault low - deposit recommended",
        daysRemaining,
      );
    } else if (status === "CRITICAL" || status === "EMERGENCY") {
      this.sendAlert(employer, "URGENT: Vault critically low!", daysRemaining);
      await this.attemptLiquidation(employer);
    }
  }

  async attemptLiquidation(employer) {
    const preview = await this.contract.getLiquidationPreview(employer);

    if (!preview.eligible) {
      console.log(`Liquidation not eligible for ${employer}`);
      return;
    }

    if (preview.cooldownRemaining > 0) {
      console.log(`Cooldown active: ${preview.cooldownRemaining}s remaining`);
      return;
    }

    const reward = ethers.formatUnits(preview.estimatedReward, 6);
    console.log(`Liquidating ${employer} for $${reward} reward...`);

    try {
      const tx = await this.contract.liquidate(employer);
      await tx.wait();
      console.log(`Liquidation successful! Reward: $${reward}`);
    } catch (error) {
      console.error(`Liquidation failed: ${error.message}`);
    }
  }

  sendAlert(employer, message, daysRemaining) {
    // Integration with notification service
    console.log(`ALERT: ${employer} - ${message} (${daysRemaining} days)`);
    // Send email, Slack message, etc.
  }

  startMonitoring() {
    // Check every hour
    cron.schedule("0 * * * *", async () => {
      console.log("Running vault health checks...");

      for (const employer of this.employers) {
        await this.checkVaultHealth(employer);
      }
    });

    console.log("Monitoring started (checks every hour)");
  }
}

// Usage
const provider = new ethers.JsonRpcProvider(RPC_URL);
const monitor = new GainJarMonitor(GAINJAR_ADDRESS, provider);

monitor.addEmployer("0x1234...");
monitor.addEmployer("0x5678...");
monitor.startMonitoring();
```

---

## Monitoring & Automation

### Example: Automated Vault Refill

```solidity
// Smart contract that auto-refills vault when low
contract AutoRefiller {
    GainJar public gainjar;
    IERC20 public usdc;

    mapping(address => RefillConfig) public configs;

    struct RefillConfig {
        uint256 targetDays;      // Target coverage in days
        uint256 minTrigger;      // Refill when below this many days
        bool enabled;
    }

    function setRefillConfig(
        uint256 _targetDays,
        uint256 _minTrigger
    ) external {
        configs[msg.sender] = RefillConfig({
            targetDays: _targetDays,
            minTrigger: _minTrigger,
            enabled: true
        });
    }

    function checkAndRefill(address employer) external {
        RefillConfig memory config = configs[employer];
        require(config.enabled, "Not enabled");

        (
            uint256 balance,
            uint256 flowRate,
            uint256 daysRemaining,
            ,
            ,
        ) = gainjar.getVaultHealth(employer);

        if (daysRemaining < config.minTrigger) {
            uint256 targetBalance = flowRate * config.targetDays * 1 days;
            uint256 refillAmount = targetBalance - balance;

            // Transfer from employer's separate wallet
            usdc.transferFrom(employer, address(this), refillAmount);
            usdc.approve(address(gainjar), refillAmount);
            gainjar.deposit(refillAmount);

            emit VaultRefilled(employer, refillAmount, daysRemaining);
        }
    }

    event VaultRefilled(
        address indexed employer,
        uint256 amount,
        uint256 daysRemainingBefore
    );
}
```

---

### Example: Employee Earnings Dashboard

```typescript
// TypeScript utility for displaying earnings
interface EarningsData {
  ratePerSecond: bigint;
  ratePerHour: string;
  ratePerDay: string;
  ratePerMonth: string;
  totalEarned: string;
  totalWithdrawn: string;
  withdrawableNow: string;
  projectedEarnings: {
    nextHour: string;
    nextDay: string;
    nextWeek: string;
    nextMonth: string;
  };
}

async function getEarningsBreakdown(
  gainjar: Contract,
  employer: string,
  employee: string,
): Promise<EarningsData> {
  const streamInfo = await gainjar.getStreamInfo(employer, employee);

  const rate = streamInfo.ratePerSecond;
  const HOUR = 3600n;
  const DAY = 86400n;
  const WEEK = 604800n;
  const MONTH = 2592000n;

  return {
    ratePerSecond: rate,
    ratePerHour: formatUSDC(rate * HOUR),
    ratePerDay: formatUSDC(rate * DAY),
    ratePerMonth: formatUSDC(rate * MONTH),
    totalEarned: formatUSDC(streamInfo.totalEarned),
    totalWithdrawn: formatUSDC(streamInfo.totalWithdrawn),
    withdrawableNow: formatUSDC(streamInfo.withdrawableNow),
    projectedEarnings: {
      nextHour: formatUSDC(rate * HOUR),
      nextDay: formatUSDC(rate * DAY),
      nextWeek: formatUSDC(rate * WEEK),
      nextMonth: formatUSDC(rate * MONTH),
    },
  };
}

function formatUSDC(wei: bigint): string {
  const usdc = Number(wei) / 1e6;
  return usdc.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Usage
const earnings = await getEarningsBreakdown(gainjar, employer, employee);
console.log(`Hourly Rate: ${earnings.ratePerHour}`);
console.log(`Daily Rate: ${earnings.ratePerDay}`);
console.log(`Withdrawable: ${earnings.withdrawableNow}`);
console.log(`Projected next month: ${earnings.projectedEarnings.nextMonth}`);
```

---

## Real-world Scenarios

### Scenario 1: Startup with Growing Team

```solidity
// Month 1: Hire first 3 employees
gainjar.deposit(45000e6); // 3 months runway for 3 employees
gainjar.createMonthlyStream(alice, 5000e6); // Dev
gainjar.createMonthlyStream(bob, 4000e6);   // Designer
gainjar.createMonthlyStream(charlie, 3000e6); // Marketing

// Month 3: Hire 2 more employees
// Check capacity first
(,, uint256 daysRemaining,, bool canCreate, uint256 maxAdditional) =
    gainjar.getVaultHealth(employer);

if (canCreate) {
    gainjar.deposit(30000e6); // Top up for new hires
    gainjar.createMonthlyStream(dave, 6000e6);   // Senior Dev
    gainjar.createMonthlyStream(eve, 4500e6);    // Sales
}

// Month 6: Give raises
gainjar.updateInfiniteRate(alice, 6000e6, 30 days); // 20% raise
gainjar.updateInfiniteRate(charlie, 3500e6, 30 days); // Promotion

// Monitor vault health weekly
function weeklyCheck() external {
    (uint256 balance,, uint256 daysRemaining,,) =
        gainjar.getVaultHealth(employer);

    if (daysRemaining < 45) {
        // Alert: Top up needed
        // Recommended: 3 months coverage
    }
}
```

---

### Scenario 2: Freelance Platform Integration

```solidity
contract FreelancePlatform {
    GainJar public gainjar;

    struct Project {
        address client;
        address freelancer;
        uint256 totalPay;
        uint256 duration;
        bool started;
    }

    mapping(uint256 => Project) public projects;
    uint256 public projectCount;

    function createProject(
        address _freelancer,
        uint256 _totalPay,
        uint256 _duration
    ) external returns (uint256 projectId) {
        // Client deposits escrow
        IERC20(usdc).transferFrom(msg.sender, address(this), _totalPay);

        projectId = projectCount++;
        projects[projectId] = Project({
            client: msg.sender,
            freelancer: _freelancer,
            totalPay: _totalPay,
            duration: _duration,
            started: false
        });
    }

    function startProject(uint256 _projectId) external {
        Project storage project = projects[_projectId];
        require(msg.sender == project.client);
        require(!project.started);

        // Deposit to GainJar vault
        IERC20(usdc).approve(address(gainjar), project.totalPay);
        gainjar.deposit(project.totalPay);

        // Create finite stream
        gainjar.createFiniteStream(
            project.freelancer,
            project.totalPay,
            project.duration
        );

        project.started = true;
    }

    function freelancerWithdraw(uint256 _projectId) external {
        Project memory project = projects[_projectId];
        require(msg.sender == project.freelancer);

        gainjar.withdraw(project.client);
    }
}
```

---

### Scenario 3: DAO Contributor Payments

```solidity
contract DAOPayroll {
    GainJar public gainjar;

    struct Contributor {
        address wallet;
        uint256 monthlyCompensation;
        uint256 startTime;
        bool active;
    }

    mapping(address => Contributor) public contributors;
    address public daoTreasury;

    // Governance: Vote to add contributor
    function addContributor(
        address _wallet,
        uint256 _monthlyComp
    ) external onlyGovernance {
        require(!contributors[_wallet].active);

        // Create stream from DAO treasury
        gainjar.createMonthlyStream(_wallet, _monthlyComp);

        contributors[_wallet] = Contributor({
            wallet: _wallet,
            monthlyCompensation: _monthlyComp,
            startTime: block.timestamp,
            active: true
        });
    }

    // Governance: Vote to adjust compensation
    function adjustCompensation(
        address _wallet,
        uint256 _newMonthlyComp
    ) external onlyGovernance {
        require(contributors[_wallet].active);

        gainjar.updateInfiniteRate(_wallet, _newMonthlyComp, 30 days);
        contributors[_wallet].monthlyCompensation = _newMonthlyComp;
    }

    // Governance: Vote to remove contributor
    function removeContributor(address _wallet) external onlyGovernance {
        require(contributors[_wallet].active);

        gainjar.pauseStream(_wallet);
        contributors[_wallet].active = false;
    }

    // Anyone can refill DAO treasury
    function refillTreasury(uint256 _amount) external {
        IERC20(usdc).transferFrom(msg.sender, address(this), _amount);
        IERC20(usdc).approve(address(gainjar), _amount);
        gainjar.deposit(_amount);
    }

    modifier onlyGovernance() {
        // Check governance contract approval
        require(msg.sender == governanceContract);
        _;
    }
}
```

---

## Testing Examples

### Example: Foundry Test Suite

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/GainJar.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USDC", "USDC") {
        _mint(msg.sender, 1000000e6); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract GainJarIntegrationTest is Test {
    GainJar public gainjar;
    MockUSDC public usdc;

    address employer = address(0x1);
    address employee = address(0x2);

    function setUp() public {
        usdc = new MockUSDC();
        gainjar = new GainJar(address(usdc));

        // Give employer USDC
        usdc.transfer(employer, 100000e6);
    }

    function testFullEmploymentLifecycle() public {
        // 1. Employer deposits
        vm.startPrank(employer);
        usdc.approve(address(gainjar), 30000e6);
        gainjar.deposit(30000e6);

        // 2. Create monthly stream
        gainjar.createMonthlyStream(employee, 5000e6);
        vm.stopPrank();

        // 3. Employee works for 1 week
        skip(7 days);

        // 4. Employee withdraws
        vm.prank(employee);
        gainjar.withdraw(employer);

        // Verify: Employee received ~$1,250 (1/4 month)
        uint256 received = usdc.balanceOf(employee);
        assertApproxEqRel(received, 1250e6, 0.01e18); // 1% tolerance

        // 5. Employee works another 3 weeks
        skip(21 days);

        // 6. Employee withdraws again
        vm.prank(employee);
        gainjar.withdraw(employer);

        // Verify: Employee received ~$5,000 total (1 month)
        uint256 totalReceived = usdc.balanceOf(employee);
        assertApproxEqRel(totalReceived, 5000e6, 0.01e18);
    }

    function testLiquidationFlow() public {
        // 1. Setup under-funded employer
        vm.startPrank(employer);
        usdc.approve(address(gainjar), 1000e6);
        gainjar.deposit(1000e6); // Only $1,000

        gainjar.createMonthlyStream(employee, 5000e6); // $5,000/month
        vm.stopPrank();

        // 2. Advance to EMERGENCY status (< 3 days coverage)
        skip(27 days);

        // Verify status
        GainJar.VaultStatus status = gainjar.getVaultStatus(employer);
        assertEq(uint256(status), uint256(GainJar.VaultStatus.EMERGENCY));

        // 3. Liquidator executes
        address liquidator = address(0x999);
        vm.prank(liquidator);
        gainjar.liquidate(employer);

        // 4. Verify outcomes
        // - Employee received earnings
        assertGt(usdc.balanceOf(employee), 0);

        // - Liquidator received reward
        assertGt(usdc.balanceOf(liquidator), 0);

        // - Stream paused
        (,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
        assertFalse(isActive);
    }
}
```

---

## Best Practices Checklist

### For Employers

- [ ] Maintain 30+ days vault coverage for HEALTHY status
- [ ] Set up monitoring for vault health
- [ ] Use `getVaultHealth()` before creating new streams
- [ ] Pause streams when removing employees
- [ ] Approve GainJar contract spending before deposits
- [ ] Keep track of active employee count

### For Employees

- [ ] Withdraw regularly (weekly/bi-weekly) to minimize risk
- [ ] Use `getSafeWithdrawableAmount()` to check vault safety
- [ ] Monitor employer's vault status
- [ ] Understand finite vs infinite stream differences
- [ ] Know when your finite stream expires

### For Integrators

- [ ] Implement event listeners for real-time updates
- [ ] Use multicall for batch queries
- [ ] Cache unchanging data (stream type, rate)
- [ ] Handle errors gracefully
- [ ] Display live earnings counter
- [ ] Show vault health status to employers
- [ ] Implement liquidation monitoring

---

## Common Pitfalls

### Pitfall 1: Not Checking Vault Balance

```solidity
// ❌ BAD
gainjar.withdraw(employer);
// May revert if vault insufficient

// ✅ GOOD
(uint256 earned, uint256 safe, bool isFullySafe) =
    gainjar.getSafeWithdrawableAmount(employer, employee);

if (isFullySafe) {
    gainjar.withdraw(employer);
} else {
    gainjar.withdrawPartial(employer, safe);
}
```

### Pitfall 2: Creating Stream Without Coverage Check

```solidity
// ❌ BAD
gainjar.createMonthlyStream(employee, 5000e6);
// May revert if insufficient coverage

// ✅ GOOD
(,,,, bool canCreate, uint256 maxAdditional) =
    gainjar.getVaultHealth(employer);

require(canCreate, "Insufficient vault");
gainjar.createMonthlyStream(employee, 5000e6);
```

### Pitfall 3: Forgetting to Approve USDC

```solidity
// ❌ BAD
gainjar.deposit(10000e6);
// Reverts: ERC20 insufficient allowance

// ✅ GOOD
usdc.approve(address(gainjar), 10000e6);
gainjar.deposit(10000e6);
```

---

**Back to:** [README](./README.md) | [API Reference](./API_REFERENCE.md) | [Security](./SECURITY.md)
