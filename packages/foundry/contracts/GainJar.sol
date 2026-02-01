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
  event Withdrawal(address indexed _employee, uint256 _amount);
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

  // ==============
  // Errors
  // ==============

  error GainJar__DepositCantBeZero();

  error GainJar__InvalidAddress();

  error GainJar__SalaryCantBeZero();

  error GainJar__PeriodCantBeZero();

  error GainJar__StreamExists();
  error GainJar__StreamNotActive();
  error GainJar__StreamAlreadyPaused();
  error GainJar__AmountExceedsEarned();

  error GainJar__AmountTooSmall();

  error GainJar__OnlyInfiniteStream();
  error GainJar__OnlyFiniteStream();

  error GainJar__NothingToWithdraw();

  error GainJar__InsufficientEmployerVault(address _employer);

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

  // Employer => Employee => Stream
  mapping(address => mapping(address => Stream)) s_streams;

  // Employer => USDC stored balance on this contract
  mapping(address => uint256) s_vaultBalances;

  // Employer => Employee[]
  mapping(address => address[]) s_employeeList;

  // Employer => Employee => Employee index on s_employeeList
  mapping(address => mapping(address => uint256)) s_employeeIndex;

  // USDC as for payment token
  IERC20 private immutable i_paymentToken;

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
  function createInfiniteStream(address _employee, uint256 _amount, uint256 _period) external {
    _createStream(_employee, _amount, _period, StreamType.INFINITE);
  }

  /**
   * @notice Create finite stream with specified end time
   * @param _employee Employee address
   * @param _amount Amount per period (e.g., 50e6 for $50/hour) (WEI)
   * @param _durationInSeconds Streaming time
   */
  function createFiniteStream(address _employee, uint256 _amount, uint256 _durationInSeconds) external {
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
    this.createFiniteStream(_employee, _totalAmount, durationSeconds);
  }

  /**
   * @notice Create infinite stream with hourly rate
   */
  function createHourlyStream(
    address _employee,
    uint256 _hourlyRate // e.g., 50 for $50/hour
  )
    external
  {
    this.createInfiniteStream(_employee, _hourlyRate, 1 hours);
  }

  /**
   * @notice Create infinite stream with monthly rate
   */
  function createMonthlyStream(
    address _employee,
    uint256 _monthlyRate // e.g., 5000 for $5,000/month
  )
    external
  {
    this.createInfiniteStream(_employee, _monthlyRate, 30 days);
  }

  /**
   * @notice Update rate for infinite stream
   */
  function updateInfiniteRate(address _employee, uint256 _newRateAmount, uint256 _newRatePeriod) external {
    Stream storage stream = s_streams[_msgSender()][_employee];
    if (!stream.isActive) revert GainJar__StreamNotActive();
    if (stream.streamType != StreamType.INFINITE) revert GainJar__OnlyInfiniteStream();

    // Withdraw pending first
    _processWithdrawal(msg.sender, _employee);

    // Update rate
    stream.ratePerSecond = _newRateAmount / _newRatePeriod;
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

    // Calculate new total and recalculate rate
    uint256 remainingTime = stream.endTime - block.timestamp;
    uint256 newTotalTime = remainingTime + _additionalSeconds;
    uint256 newTotalAmount = stream.totalAmount + _additionalAmount;

    stream.totalAmount = newTotalAmount;
    stream.endTime = block.timestamp + newTotalTime;
    stream.ratePerSecond = newTotalAmount / newTotalTime;
    stream.startTime = block.timestamp; // Reset for clean calculation
    stream.lastWithdrawal = block.timestamp;
  }

  /**
   * @notice Pause stream, called by employer
   */
  function pauseStream(address _employee) external {
    Stream storage stream = s_streams[_msgSender()][_employee];
    if (!stream.isActive) revert GainJar__StreamAlreadyPaused();

    _processWithdrawal(msg.sender, _employee);

    stream.isActive = false;
    emit StreamPaused(msg.sender, _employee);
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
      emit StreamEnded(_employer, _msgSender());
    }
  }

  function withdrawPartial(address _employer, uint256 _amount) external nonReentrant {
    Stream storage stream = s_streams[_employer][_msgSender()];
    if (!stream.isActive) revert GainJar__StreamNotActive();

    uint256 maxWithdrawable = withdrawable(_employer, _msgSender());
    if (_amount > maxWithdrawable) revert GainJar__AmountExceedsEarned();

    uint256 vaultBalance = s_vaultBalances[_employer];
    if (_amount > vaultBalance) revert GainJar__InsufficientEmployerVault(_employer);

    // Update state
    stream.lastWithdrawal = block.timestamp;
    stream.totalWithdrawn += _amount;
    s_vaultBalances[_employer] -= _amount;

    // Transfer
    i_paymentToken.transfer(_msgSender(), _amount);

    emit Withdrawal(_msgSender(), _amount);
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

  // =====================
  // Public functions
  // =====================

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

    return (
      stream.ratePerSecond,
      stream.startTime,
      stream.endTime,
      stream.totalAmount,
      stream.streamType,
      totalEarned,
      stream.totalWithdrawn,
      withdrawable(_employer, _employee),
      stream.isActive,
      _isStreamExpired(stream)
    );
  }

  /**
   * @notice Get total of amount streamed per second accross all of the active streams
   * @param _employer Employer address
   * @return totalRate Sum of all the amount streamed per second
   */
  function getTotalFlowRate(address _employer) public view returns (uint256 totalRate) {
    address[] memory employees = s_employeeList[_employer];

    for (uint256 i = 0; i < employees.length; i++) {
      Stream memory stream = s_streams[_employer][employees[i]];

      if (stream.isActive && !_isStreamExpired(stream)) {
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

    i_paymentToken.transfer(_employee, amount);

    emit Withdrawal(_employee, amount);
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

    if (s_streams[_msgSender()][_employee].isActive) {
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

    s_employeeIndex[_msgSender()][_employee] = s_employeeList[_msgSender()].length;
    s_employeeList[_msgSender()].push(_employee);

    emit StreamCreated(_msgSender(), _employee, ratePerSecond, block.timestamp, endTime, _amount, _type, finalPayout);
  }
}
