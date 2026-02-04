//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/console.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * A Payroll contract with ability to stream payment from employer to their employee
 * This contract support 2 type of stream, (INFINITE, FINITE)
 *
 * INIFNITE -> there is no set of end time for the stream, this can be suitable for full time employee
 * FINITE -> the end time is specified, so the stream payment only work with in the interval time, suitable for project based employee
 *
 * @author raihanmd
 */
contract GainJar is Context, ReentrancyGuard, Ownable {
  // ==============
  // Events
  // ==============

  event FundDeposited(address indexed _employer, uint256 _amount);
  event Withdrawal(address indexed _employee, uint256 _amount, uint256 _fee);
  event StreamCreated(
    address indexed _employer,
    address indexed _employee,
    uint256 _ratePerSecond,
    uint256 _startTime,
    uint256 _endTime,
    uint256 _totalAmount,
    StreamType _type,
    uint256 _finalPayout
  );
  event StreamPaused(address indexed _employer, address indexed _employee);
  event StreamEnded(address indexed _employer, address indexed _employee);
  event Liquidated(
    address indexed _liquidator,
    address indexed _employer,
    uint256 _totalPaidToEmployees,
    uint256 _reward,
    uint256 _streamsPaused
  );
  event FeeUpdated(uint256 _oldFee, uint256 _newFee);
  event FeeClaimed(address indexed _owner, uint256 _amount);

  // ==============
  // Errors
  // ==============

  error GainJar__DepositCantBeZero();

  error GainJar__InvalidAddress();

  error GainJar__PeriodCantBeZero();

  error GainJar__StreamExists();
  error GainJar__StreamNotActive();
  error GainJar__StreamAlreadyActive();

  error GainJar__AmountExceedsEarned();
  error GainJar__AmountTooSmall();

  error GainJar__OnlyInfiniteStream();
  error GainJar__OnlyFiniteStream();

  error GainJar__NothingToWithdraw();

  error GainJar__InsufficientEmployerVault(address _employer);

  error GainJar__VaultNotEligibleForLiquidation(VaultStatus _currentStatus);
  error GainJar__InsufficientVaultForLiquidation(uint256 _vaultBalance, uint256 _required);

  error GainJar__LiquidationCooldownActive(uint256 _timeRemaining);

  error GainJar__FeeExceedsMax(uint256 _requested, uint256 _max);
  error GainJar__NoFeesToClaim();

  // ======================
  // State & Data types
  // ======================

  enum StreamType {
    INFINITE,
    FINITE
  }

  /**
   * @notice Enum represent health factor status of vault
   */
  enum VaultStatus {
    // > 30 days
    HEALTHY,

    // 7-30 days
    WARNING,

    // 3-7 days
    CRITICAL,

    // <3 days
    EMERGENCY
  }

  struct Stream {
    // Rate wei in second
    uint256 ratePerSecond;

    // When streaming started
    uint256 startTime;

    // When streaming ended (0 = infinity stream type)
    uint256 endTime;

    // Total locked amount (for finite stream type)
    uint256 totalAmount;

    // When employee di their last withdrawal
    uint256 lastWithdrawal;

    // Total employee withdrawed so far
    uint256 totalWithdrawn;

    // Amount that cannot be evenly distributed per second, paid together with the final claim to ensure totalAmount == employer will to pay
    uint256 finalPayout;

    // Stream type
    StreamType streamType;

    // This stream also can be paused
    bool isActive;
  }

  // 1 week minimum vault coverage based by flow rate
  uint256 private constant MIN_COVERAGE_DAYS_SECOND = 7 days;

  // Reward floor: $1 USDC - minimum for profitable on Arbitrum
  uint256 private constant LIQUIDATION_REWARD_FLOOR = 1e6;

  // Reward cap: $50 USDC - protect employees from over taking
  uint256 private constant LIQUIDATION_REWARD_CAP = 50e6;

  // Base reward 5% from employees earning
  uint256 private constant LIQUIDATION_BASE_RATE_BPS = 500;

  // Severity multiplier for EMERGENCY (CRITICAL = 1x, EMERGENCY = 2x)
  uint256 private constant EMERGENCY_SEVERITY_MULTIPLIER = 2;

  uint256 private constant LIQUIDATION_COOLDOWN = 1 hours;

  uint256 private constant MAX_FEE_BASIS_POINTS = 100;

  // Employer => Employee => Stream
  mapping(address => mapping(address => Stream)) private s_streams;

  // Employer => USDC stored balance on this contract
  mapping(address => uint256) private s_vaultBalances;

  // Employer => Employee[]
  mapping(address => address[]) private s_employeeList;

  mapping(address => address[]) private s_activeEmployeeList;

  // Employer => Employee => Has Exist stream on s_employeeList
  mapping(address => mapping(address => bool)) private s_employeeExist;

  mapping(address => mapping(address => uint256)) private s_activeEmployeeIndex;

  mapping(address => mapping(address => bool)) private s_isActiveEmployee;

  // Track last liquidation time per employer
  mapping(address => uint256) private s_lastLiquidationTime;

  // USDC as for payment token
  IERC20 private immutable i_paymentToken;

  uint256 private s_feeBasisPoints = 5;

  uint256 private s_accumulatedFees;

  // ==============
  // Constructor
  // ==============

  constructor(address _paymentTokenAddress) Ownable(_msgSender()) {
    i_paymentToken = IERC20(_paymentTokenAddress);
  }

  // =====================
  // External functions
  // =====================

  /**
   * @notice Update protocol fee (only owner)
   * @param _newFeeBasisPoints New fee in basis points (max 100 = 1%)
   */
  function updateFee(uint256 _newFeeBasisPoints) external onlyOwner {
    if (_newFeeBasisPoints > MAX_FEE_BASIS_POINTS) {
      revert GainJar__FeeExceedsMax(_newFeeBasisPoints, MAX_FEE_BASIS_POINTS);
    }

    uint256 oldFee = s_feeBasisPoints;
    s_feeBasisPoints = _newFeeBasisPoints;

    emit FeeUpdated(oldFee, _newFeeBasisPoints);
  }

  /**
   * @notice Claim accumulated fees (only owner)
   */
  function claimFees() external onlyOwner {
    if (s_accumulatedFees == 0) revert GainJar__NoFeesToClaim();

    uint256 amount = s_accumulatedFees;
    s_accumulatedFees = 0;

    i_paymentToken.transfer(_msgSender(), amount);

    emit FeeClaimed(_msgSender(), amount);
  }

  /**
   * Deposit payment token (USDC) to this contract
   * @param _amount Amount of payment token (USDC) will be deposited
   */
  function deposit(uint256 _amount) external {
    if (_amount == 0) {
      revert GainJar__DepositCantBeZero();
    }

    i_paymentToken.transferFrom(_msgSender(), address(this), _amount);

    s_vaultBalances[_msgSender()] += _amount;

    emit FundDeposited(_msgSender(), _amount);
  }

  /**
   * @notice Create infinite stream with specified rate
   * @param _employee Employee address
   * @param _amount Amount per period (e.g., 50e6 for $50/hour) (WEI)
   * @param _period Time period on SECOND (3600 = hourly, 2592000 = monthly)
   */
  function createInfiniteStream(address _employee, uint256 _amount, uint256 _period) public {
    _createStream(_employee, _amount, _period, StreamType.INFINITE);
  }

  /**
   * @notice Create finite stream with specified end time
   * @param _employee Employee address
   * @param _amount Amount per period (e.g., 50e6 for $50/hour) (WEI)
   * @param _durationInSeconds Streaming time
   */
  function createFiniteStream(address _employee, uint256 _amount, uint256 _durationInSeconds) public {
    _createStream(_employee, _amount, _durationInSeconds, StreamType.FINITE);
  }

  // ========================================
  // CONVENIENCE FUNCTIONS FOR COMMON PERIODS
  // ========================================

  /**
   * @notice Create finite stream with days instead of seconds
   */
  function createFiniteStreamDays(address _employee, uint256 _totalAmount, uint256 _durationInDays) external {
    uint256 durationSeconds = _durationInDays * 1 days;

    // Call internal create function
    createFiniteStream(_employee, _totalAmount, durationSeconds);
  }

  /**
   * @notice Create infinite stream with hourly rate
   */
  function createHourlyStream(
    address _employee,
    uint256 _hourlyRate // e.g., 50e6 for $50/hour
  )
    external
  {
    createInfiniteStream(_employee, _hourlyRate, 1 hours);
  }

  /**
   * @notice Create infinite stream with monthly rate
   */
  function createMonthlyStream(
    address _employee,
    uint256 _monthlyRate // e.g., 5000e6 for $5,000/month
  )
    external
  {
    createInfiniteStream(_employee, _monthlyRate, 30 days);
  }

  /**
   * @notice Update rate for infinite stream
   */
  function updateInfiniteRate(address _employee, uint256 _newRateAmount, uint256 _newRatePeriod) external {
    Stream storage stream = s_streams[_msgSender()][_employee];
    if (!stream.isActive) revert GainJar__StreamNotActive();
    if (stream.streamType != StreamType.INFINITE) revert GainJar__OnlyInfiniteStream();

    if (_newRatePeriod == 0) {
      revert GainJar__PeriodCantBeZero();
    }

    if (_newRateAmount < _newRatePeriod) {
      revert GainJar__AmountTooSmall();
    }

    _processWithdrawal(_msgSender(), _employee);

    uint256 newRatePerSecond = _newRateAmount / _newRatePeriod;

    uint256 oldRatePerSecond = stream.ratePerSecond;
    uint256 currentTotalFlowRate = getTotalFlowRate(_msgSender());
    uint256 newTotalFlowRate = currentTotalFlowRate - oldRatePerSecond + newRatePerSecond;
    uint256 minRequiredBalance = newTotalFlowRate * MIN_COVERAGE_DAYS_SECOND;

    if (s_vaultBalances[_msgSender()] < minRequiredBalance) {
      revert GainJar__InsufficientEmployerVault(_msgSender());
    }

    stream.ratePerSecond = newRatePerSecond;
  }

  /**
   * @notice Extend finite stream
   */
  function extendFiniteStream(address _employee, uint256 _additionalAmount, uint256 _additionalSeconds) external {
    Stream storage stream = s_streams[_msgSender()][_employee];
    if (!stream.isActive) revert GainJar__StreamNotActive();
    if (stream.streamType != StreamType.FINITE) revert GainJar__OnlyFiniteStream();

    // Withdraw accumulated first
    _processWithdrawal(_msgSender(), _employee);

    uint256 remainingAmount = stream.totalAmount - stream.totalWithdrawn;
    uint256 newTotalAmount = remainingAmount + _additionalAmount;
    uint256 remainingTime = stream.endTime > block.timestamp ? stream.endTime - block.timestamp : 0;
    uint256 newTotalTime = remainingTime + _additionalSeconds;

    uint256 newRatePerSecond = newTotalAmount / newTotalTime;
    uint256 newFinalPayout = newTotalAmount % newTotalTime;

    stream.totalAmount = stream.totalWithdrawn + newTotalAmount;
    stream.endTime = block.timestamp + newTotalTime;
    stream.ratePerSecond = newRatePerSecond;
    stream.finalPayout = newFinalPayout;
    stream.startTime = block.timestamp;
    stream.lastWithdrawal = block.timestamp;

    // Check vault balance for new flow rate
    uint256 newFlowRate = getTotalFlowRate(_msgSender());
    uint256 minRequiredBalance = newFlowRate * MIN_COVERAGE_DAYS_SECOND;
    if (s_vaultBalances[_msgSender()] < minRequiredBalance) {
      revert GainJar__InsufficientEmployerVault(_msgSender());
    }
  }

  /**
   * @notice Pause stream, called by employer
   */
  function pauseStream(address _employee) external {
    Stream storage stream = s_streams[_msgSender()][_employee];
    if (!stream.isActive) revert GainJar__StreamNotActive();

    _processWithdrawal(_msgSender(), _employee);

    stream.isActive = false;

    _removeFromActiveList(_msgSender(), _employee);

    emit StreamPaused(_msgSender(), _employee);
  }

  /**
   * @notice Process withdraw current available amount
   * @param _employer Employer assiciated stream
   */
  function withdraw(address _employer) external nonReentrant {
    _processWithdrawal(_employer, _msgSender());

    Stream storage stream = s_streams[_employer][_msgSender()];
    if (_isStreamExpired(stream)) {
      stream.isActive = false;

      _removeFromActiveList(_employer, _msgSender());

      emit StreamEnded(_employer, _msgSender());
    }
  }

  function withdrawPartial(address _employer, uint256 _amount) external nonReentrant {
    Stream storage stream = s_streams[_employer][_msgSender()];
    if (!stream.isActive) revert GainJar__StreamNotActive();

    uint256 maxWithdrawable = withdrawable(_employer, _msgSender());

    bool isExpired = _isStreamExpired(stream);
    if (isExpired && stream.streamType == StreamType.FINITE) {
      maxWithdrawable += stream.finalPayout;
    }

    if (_amount > maxWithdrawable) revert GainJar__AmountExceedsEarned();

    uint256 vaultBalance = s_vaultBalances[_employer];
    if (_amount > vaultBalance) revert GainJar__InsufficientEmployerVault(_employer);

    if (isExpired) {
      stream.lastWithdrawal = stream.endTime;
    } else {
      stream.lastWithdrawal = block.timestamp;
    }

    stream.totalWithdrawn += _amount;
    s_vaultBalances[_employer] -= _amount;

    (uint256 fee, uint256 netAmount) = _calculateFee(_amount);

    i_paymentToken.transfer(_msgSender(), netAmount);
    s_accumulatedFees += fee;

    emit Withdrawal(_msgSender(), _amount, fee);

    if (isExpired && stream.totalWithdrawn >= stream.totalAmount) {
      stream.isActive = false;
      _removeFromActiveList(_employer, _msgSender());
      emit StreamEnded(_employer, _msgSender());
    }
  }

  /**
   * @notice Liquidate an employer's streams when vault is in EMERGENCY status
   * @param _employer Employer address to liquidate
   *
   * Flow:
   * 1. Check vault status is EMERGENCY
   * 2. Check cooldown passed
   * 3. Check vault has enough for reward
   * 4. Pause all active streams
   * 5. Pay liquidator reward
   */
  function liquidate(address _employer) external nonReentrant {
    // 1. Check status is EMERGENCY
    VaultStatus status = getVaultStatus(_employer);
    if (status != VaultStatus.CRITICAL && status != VaultStatus.EMERGENCY) {
      revert GainJar__VaultNotEligibleForLiquidation(status);
    }

    // 2. Check cooldown
    uint256 lastLiquidation = s_lastLiquidationTime[_employer];
    if (block.timestamp < lastLiquidation + LIQUIDATION_COOLDOWN) {
      revert GainJar__LiquidationCooldownActive((lastLiquidation + LIQUIDATION_COOLDOWN) - block.timestamp);
    }

    address[] memory employees = s_activeEmployeeList[_employer];

    // 3. First pass: hitung total earned (view-only, no state change)
    uint256 totalEmployeeEarnings = 0;
    for (uint256 i = 0; i < employees.length; i++) {
      Stream memory stream = s_streams[_employer][employees[i]];
      if (stream.isActive && !_isStreamExpired(stream)) {
        totalEmployeeEarnings += withdrawable(_employer, employees[i]);
      }
    }

    // 4. Calculate dynamic reward
    uint256 reward = _calculateLiquidationReward(totalEmployeeEarnings, status);

    // 5. Check vault can cover everything
    uint256 totalRequired = totalEmployeeEarnings + reward;
    if (s_vaultBalances[_employer] < totalRequired) {
      revert GainJar__InsufficientVaultForLiquidation(s_vaultBalances[_employer], totalRequired);
    }

    // 6. Second pass: withdraw + pause (state changes)
    uint256 streamsPaused = 0;
    for (uint256 i = 0; i < employees.length; i++) {
      Stream storage stream = s_streams[_employer][employees[i]];

      if (stream.isActive && !_isStreamExpired(stream)) {
        uint256 earned = withdrawable(_employer, employees[i]);

        if (earned > 0) {
          // Apply fee on employee withdrawal
          (uint256 fee, uint256 netAmount) = _calculateFee(earned);

          // Update stream state
          stream.lastWithdrawal = block.timestamp;
          stream.totalWithdrawn += earned;

          // Transfer to employee
          s_vaultBalances[_employer] -= earned;
          i_paymentToken.transfer(employees[i], netAmount);
          s_accumulatedFees += fee;

          emit Withdrawal(employees[i], netAmount, fee);
        }

        // Pause stream
        stream.isActive = false;
        streamsPaused++;
        emit StreamPaused(_employer, employees[i]);
      }
    }

    delete s_activeEmployeeList[_employer];

    // 7. Pay liquidator reward (no fee on reward)
    s_vaultBalances[_employer] -= reward;
    i_paymentToken.transfer(_msgSender(), reward);

    // 8. Update state
    s_lastLiquidationTime[_employer] = block.timestamp;

    emit Liquidated(_msgSender(), _employer, totalEmployeeEarnings, reward, streamsPaused);
  }

  /**
   * @notice Reactivate the stream
   */
  function activateStream(address _employee) external {
    Stream storage stream = s_streams[_msgSender()][_employee];
    if (stream.isActive) {
      revert GainJar__StreamAlreadyActive();
    }

    stream.isActive = true;

    s_activeEmployeeIndex[_msgSender()][_employee] = s_activeEmployeeList[_msgSender()].length;
    s_activeEmployeeList[_msgSender()].push(_employee);
    s_isActiveEmployee[_msgSender()][_employee] = true;
  }

  // =====================
  // View functions
  // =====================

  function getFeeBasisPoints() external view returns (uint256) {
    return s_feeBasisPoints;
  }

  function getAccumulatedFees() external view returns (uint256) {
    return s_accumulatedFees;
  }

  /**
   * @notice Preview liquidation outcome before executing
   */
  function getLiquidationPreview(address _employer)
    external
    view
    returns (
      bool eligible,
      VaultStatus status,
      uint256 totalEmployeeEarnings,
      uint256 estimatedReward,
      uint256 vaultAfterLiquidation,
      uint256 cooldownRemaining
    )
  {
    status = getVaultStatus(_employer);
    eligible = (status == VaultStatus.CRITICAL || status == VaultStatus.EMERGENCY);

    // Cooldown check
    uint256 lastLiquidation = s_lastLiquidationTime[_employer];
    if (block.timestamp < lastLiquidation + LIQUIDATION_COOLDOWN) {
      cooldownRemaining = (lastLiquidation + LIQUIDATION_COOLDOWN) - block.timestamp;
      eligible = false;
    }

    // Calculate total earned
    address[] memory employees = s_employeeList[_employer];
    for (uint256 i = 0; i < employees.length; i++) {
      Stream memory stream = s_streams[_employer][employees[i]];
      if (stream.isActive && !_isStreamExpired(stream)) {
        totalEmployeeEarnings += withdrawable(_employer, employees[i]);
      }
    }

    estimatedReward = _calculateLiquidationReward(totalEmployeeEarnings, status);

    uint256 totalRequired = totalEmployeeEarnings + estimatedReward;
    if (s_vaultBalances[_employer] < totalRequired) {
      eligible = false;
    }

    vaultAfterLiquidation = s_vaultBalances[_employer] > totalRequired ? s_vaultBalances[_employer] - totalRequired : 0;
  }

  /**
   * @notice Get detailed information about employer's vault health
   */
  function getVaultHealth(address _employer)
    external
    view
    returns (
      uint256 balance,
      uint256 flowRate,
      uint256 daysRemaining,
      VaultStatus status,
      bool canCreateNewStream,
      uint256 maxAdditionalFlowRate
    )
  {
    balance = s_vaultBalances[_employer];
    flowRate = getTotalFlowRate(_employer);

    uint256 depletionTime = getVaultDepletionTime(_employer);
    daysRemaining = depletionTime / 1 days;

    status = getVaultStatus(_employer);

    // Can create new stream only if HEALTHY or WARNING
    canCreateNewStream = (status == VaultStatus.HEALTHY || status == VaultStatus.WARNING);

    // Max additional flow rate before hitting minimum threshold
    uint256 currentRequired = flowRate * MIN_COVERAGE_DAYS_SECOND;
    if (balance > currentRequired) {
      maxAdditionalFlowRate = (balance - currentRequired) / MIN_COVERAGE_DAYS_SECOND;
    } else {
      maxAdditionalFlowRate = 0;
    }

    return (balance, flowRate, daysRemaining, status, canCreateNewStream, maxAdditionalFlowRate);
  }

  /**
   * @notice Get amount that have earned so far but if employer's balance insufficient is lesser than total earned, return the max of employer's balance
   */
  function getSafeWithdrawableAmount(address _employer, address _employee)
    external
    view
    returns (uint256 totalEarned, uint256 safeAmount, bool isFullySafe)
  {
    totalEarned = withdrawable(_employer, _employee);
    uint256 vaultBalance = s_vaultBalances[_employer];

    if (vaultBalance >= totalEarned) {
      // Vault has enough, fully safe
      safeAmount = totalEarned;
      isFullySafe = true;
    } else {
      // Vault doesn't have enough, can only withdraw what's available
      safeAmount = vaultBalance;
      isFullySafe = false;
    }

    return (totalEarned, safeAmount, isFullySafe);
  }

  /**
   * @return Bool has the employer's vault has the minimum amount of required based flow rate within MIN DAYS (7 days)
   */
  function hasMinimumCoverage(address _employer) external view returns (bool) {
    uint256 required = getMinRequiredVaultBalance(_employer);
    return s_vaultBalances[_employer] >= required;
  }

  /**
   * @return MIN_COVERAGE_DAYS_SECOND
   */
  function getMinCoverageDaysSecond() external pure returns (uint256) {
    return MIN_COVERAGE_DAYS_SECOND;
  }

  /**
   * @notice Get stream info with specified employer address and employee address
   * @param _employer Employer address
   * @param _employee Employee address
   */
  function getStreamInfo(address _employer, address _employee)
    external
    view
    returns (
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
  {
    Stream memory stream = s_streams[_employer][_employee];

    uint256 earnUntil = block.timestamp;
    if (stream.streamType == StreamType.FINITE && stream.endTime > 0 && earnUntil > stream.endTime) {
      earnUntil = stream.endTime;
    }

    uint256 elapsed = earnUntil - stream.startTime;
    totalEarned = elapsed * stream.ratePerSecond;

    // Cap at totalAmount for finite streams
    if (stream.streamType == StreamType.FINITE && totalEarned > stream.totalAmount) {
      totalEarned = stream.totalAmount;
    }

    withdrawableNow = withdrawable(_employer, _employee);

    bool isStreamExpired = _isStreamExpired(stream);

    return (
      stream.ratePerSecond,
      stream.startTime,
      stream.endTime,
      stream.totalAmount,
      stream.streamType,
      totalEarned,
      stream.totalWithdrawn,
      withdrawableNow,
      stream.isActive,
      isStreamExpired
    );
  }

  /**
   * @notice This function get withdrawable amount of stream specified
   * @param _employer Employer address
   * @param _employee Employee address
   */
  function withdrawable(address _employer, address _employee) public view returns (uint256 earned) {
    Stream memory stream = s_streams[_employer][_employee];

    if (!stream.isActive) return 0;

    uint256 earnUntil = block.timestamp;

    if (stream.streamType == StreamType.FINITE && stream.endTime > 0 && earnUntil > stream.endTime) {
      earnUntil = stream.endTime;
    }

    uint256 elapsed = earnUntil - stream.lastWithdrawal;
    earned = elapsed * stream.ratePerSecond;

    if (stream.streamType == StreamType.FINITE) {
      uint256 remainingBudget = stream.totalAmount - stream.totalWithdrawn;
      if (earned > remainingBudget) {
        earned = remainingBudget;
      }
    }
  }

  /**
   * @notice Get total of amount streamed per second accross all of the active streams
   * @param _employer Employer address
   * @return totalRate Sum of all the amount streamed per second
   */
  function getTotalFlowRate(address _employer) public view returns (uint256 totalRate) {
    address[] memory employees = s_activeEmployeeList[_employer];

    for (uint256 i = 0; i < employees.length; i++) {
      Stream memory stream = s_streams[_employer][employees[i]];

      if (!_isStreamExpired(stream)) {
        totalRate += stream.ratePerSecond;
      }
    }
  }

  /**
   * @notice Get remaining time of vault to be zero with current flow rate
   * @param _employer Employer address
   * @return secondsUntilEmpty
   */
  function getVaultDepletionTime(address _employer) public view returns (uint256 secondsUntilEmpty) {
    uint256 balance = s_vaultBalances[_employer];
    uint256 flowRate = getTotalFlowRate(_employer);

    if (flowRate == 0) return type(uint256).max;

    secondsUntilEmpty = balance / flowRate;
  }

  /**
   * @notice Get minimum amount employer vault that required for MIN_COVERAGE_DAYS_SECOND coverage based on flow rate
   * @param _employer Employer
   */
  function getMinRequiredVaultBalance(address _employer) public view returns (uint256) {
    uint256 flowRate = getTotalFlowRate(_employer);
    uint256 minRequiredBalance = flowRate * MIN_COVERAGE_DAYS_SECOND;
    return minRequiredBalance;
  }

  /**
   * @notice Get employer vault health status
   */
  function getVaultStatus(address _employer) public view returns (VaultStatus) {
    uint256 depletionTime = getVaultDepletionTime(_employer);
    uint256 daysRemaining = depletionTime / 1 days;

    if (daysRemaining >= 30) return VaultStatus.HEALTHY;
    if (daysRemaining >= 7) return VaultStatus.WARNING;
    if (daysRemaining >= 3) return VaultStatus.CRITICAL;
    return VaultStatus.EMERGENCY;
  }

  // =====================
  // Internal functions
  // =====================

  /**
   * @notice Calculate fee from given amount
   * @return fee amount, and net amount after fee
   */
  function _calculateFee(uint256 _amount) internal view returns (uint256 fee, uint256 netAmount) {
    fee = (_amount * s_feeBasisPoints) / 10000; // basis points math
    netAmount = _amount - fee;
  }

  /**
   * @return Is stream that passed in expired state (FINITE case only)
   */
  function _isStreamExpired(Stream memory _stream) internal view returns (bool) {
    if (_stream.streamType == StreamType.INFINITE) return false;
    return block.timestamp >= _stream.endTime;
  }

  /**
   * @notice Internal implementation withdrawal
   * @param _employer Employer address
   * @param _employee Employee address
   */
  function _processWithdrawal(address _employer, address _employee) internal {
    Stream storage stream = s_streams[_employer][_employee];
    if (!stream.isActive) revert GainJar__StreamNotActive();

    uint256 amount = withdrawable(_employer, _employee);
    if (amount == 0) revert GainJar__NothingToWithdraw();
    if (s_vaultBalances[_employer] < amount) revert GainJar__InsufficientEmployerVault(_employer);

    if (_isStreamExpired(stream)) {
      stream.lastWithdrawal = stream.endTime;
      amount += stream.finalPayout;
    } else {
      stream.lastWithdrawal = block.timestamp;
    }

    stream.totalWithdrawn += amount;
    s_vaultBalances[_employer] -= amount;

    (uint256 fee, uint256 netAmount) = _calculateFee(amount);

    i_paymentToken.transfer(_employee, netAmount);
    s_accumulatedFees += fee;

    emit Withdrawal(_employee, amount, fee);
  }

  /**
   * @notice Internal implementation of creat stream logic
   * @param _employee Employee address
   * @param _amount Amount per period (e.g., 50e6 for $50/hour) (WEI)
   * @param _durationInSeconds Streaming time
   */
  function _createStream(address _employee, uint256 _amount, uint256 _durationInSeconds, StreamType _type) internal {
    if (_employee == address(0)) {
      revert GainJar__InvalidAddress();
    }

    if (_durationInSeconds == 0) {
      revert GainJar__PeriodCantBeZero();
    }

    if (_amount < _durationInSeconds) {
      revert GainJar__AmountTooSmall();
    }

    if (s_employeeExist[_msgSender()][_employee] || s_streams[_msgSender()][_employee].isActive) {
      revert GainJar__StreamExists();
    }

    uint256 ratePerSecond = _amount / _durationInSeconds;

    uint256 newFlowRate = getTotalFlowRate(_msgSender()) + ratePerSecond;
    uint256 minRequiredBalance = newFlowRate * MIN_COVERAGE_DAYS_SECOND;

    if (s_vaultBalances[_msgSender()] < minRequiredBalance) revert GainJar__InsufficientEmployerVault(_msgSender());

    uint256 endTime = _type == StreamType.FINITE ? block.timestamp + _durationInSeconds : 0;
    uint256 totalAmount = _type == StreamType.FINITE ? _amount : 0;
    uint256 finalPayout = _type == StreamType.FINITE ? _amount % _durationInSeconds : 0;

    s_streams[_msgSender()][_employee] = Stream({
      ratePerSecond: ratePerSecond,
      startTime: block.timestamp,
      endTime: endTime,
      totalAmount: totalAmount,
      lastWithdrawal: block.timestamp,
      totalWithdrawn: 0,
      finalPayout: finalPayout,
      streamType: _type,
      isActive: true
    });

    s_employeeExist[_msgSender()][_employee] = true;
    s_employeeList[_msgSender()].push(_employee);

    s_activeEmployeeIndex[_msgSender()][_employee] = s_activeEmployeeList[_msgSender()].length;
    s_activeEmployeeList[_msgSender()].push(_employee);
    s_isActiveEmployee[_msgSender()][_employee] = true;

    emit StreamCreated(_msgSender(), _employee, ratePerSecond, block.timestamp, endTime, _amount, _type, finalPayout);
  }

  /**
   * @notice Calculate dynamic liquidation reward
   * @param _totalEmployeeEarnings Sum of all employees' withdrawable amounts
   * @param _status Current vault status (must be CRITICAL or EMERGENCY)
   * @return reward Amount liquidator receives
   */
  function _calculateLiquidationReward(uint256 _totalEmployeeEarnings, VaultStatus _status)
    internal
    pure
    returns (uint256 reward)
  {
    // Base reward: 5% dari total earned
    reward = (_totalEmployeeEarnings * LIQUIDATION_BASE_RATE_BPS) / 10000;

    // Severity multiplier: EMERGENCY = 2x
    if (_status == VaultStatus.EMERGENCY) {
      reward = reward * EMERGENCY_SEVERITY_MULTIPLIER;
    }

    // Apply floor dan cap
    if (reward < LIQUIDATION_REWARD_FLOOR) {
      reward = LIQUIDATION_REWARD_FLOOR;
    }
    if (reward > LIQUIDATION_REWARD_CAP) {
      reward = LIQUIDATION_REWARD_CAP;
    }
  }

  /**
   * @notice Remove employee from active list (keep in history)
   * @param _employer Employer address
   * @param _employee Employee to remove from active
   */
  function _removeFromActiveList(address _employer, address _employee) internal {
    if (!s_isActiveEmployee[_employer][_employee]) return; // Already removed

    uint256 index = s_activeEmployeeIndex[_employer][_employee];
    address[] storage activeList = s_activeEmployeeList[_employer];
    uint256 lastIndex = activeList.length - 1;

    // Swap with last element
    if (index != lastIndex) {
      address lastEmployee = activeList[lastIndex];
      activeList[index] = lastEmployee;
      s_activeEmployeeIndex[_employer][lastEmployee] = index;
    }

    // Remove last element
    activeList.pop();
    delete s_activeEmployeeIndex[_employer][_employee];
    s_isActiveEmployee[_employer][_employee] = false;
  }

  /**
   * @notice Get active employees count (O(1))
   */
  function getActiveEmployeeCount(address _employer) external view returns (uint256) {
    return s_activeEmployeeList[_employer].length;
  }

  /**
   * @notice Get all employees count (O(1))
   */
  function getTotalEmployeeCount(address _employer) external view returns (uint256) {
    return s_employeeList[_employer].length;
  }

  /**
   * @notice Get active employees list (efficient)
   */
  function getActiveEmployees(address _employer) external view returns (address[] memory) {
    return s_activeEmployeeList[_employer];
  }

  /**
   * @notice Get all employees list (history)
   */
  function getAllEmployees(address _employer) external view returns (address[] memory) {
    return s_employeeList[_employer];
  }

  /**
   * @notice Check if employee is active (O(1))
   */
  function isActiveEmployee(address _employer, address _employee) external view returns (bool) {
    return s_isActiveEmployee[_employer][_employee];
  }
}
