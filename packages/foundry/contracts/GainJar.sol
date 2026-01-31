//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/console.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";

/**
 * A Payroll contract with ability to stream payment from employer to their employee
 * This contract support 2 type of stream, (INFINITE, FINITE)
 *
 * INIFNITE -> there is no set of end time for the stream, this can be suitable for full time employee
 * FINITE -> the end time is specified, so the stream payment only work with in the interval time, suitable for project based employee
 *
 * @author raihanmd
 */
contract GainJar is Context {
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
  error GainJar__StreamExists();
  error GainJar__PeriodCantBeZero();
  error GainJar__AmountTooSmall();

  // ======================
  // State & Data types
  // ======================

  enum StreamType {
    INFINITE,
    FINITE
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

  // Vault token precission
  uint256 constant VAULT_TOKEN_PRECISION = 1e6;

  // Employer => Employee => Stream
  mapping(address => mapping(address => Stream)) s_streams;

  // Employer => USDC stored balance on this contract
  mapping(address => uint256) s_vaultBalances;

  // Employer => Employee[]
  mapping(address => address[]) s_employeeList;

  // Employer => Employee => Employee index on s_employeeList
  mapping(address => mapping(address => uint256)) s_employeeIndex;

  // USDC as for payment token
  IERC20 private immutable s_paymentToken;

  // ==============
  // Constructor
  // ==============

  constructor(address _paymentTokenAddress) {
    s_paymentToken = IERC20(_paymentTokenAddress);
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

    s_paymentToken.transferFrom(_msgSender(), address(this), _amount);

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
    if (_employee == address(0)) {
      revert GainJar__InvalidAddress();
    }

    if (_period == 0) {
      revert GainJar__PeriodCantBeZero();
    }

    if (_amount < _period) {
      revert GainJar__AmountTooSmall();
    }

    if (!s_streams[_msgSender()][_employee].isActive) {
      revert GainJar__StreamExists();
    }

    // Calculate rate per second based on period given
    uint256 ratePerSecond = _amount / _period;
    uint256 finalPayout = _amount % _period;

    s_streams[_msgSender()][_employee] = Stream({
      ratePerSecond: ratePerSecond,
      startTime: block.timestamp,
      endTime: 0,
      totalAmount: 0,
      lastWithdrawal: block.timestamp,
      totalWithdrawn: 0,
      finalPayout: finalPayout,
      streamType: StreamType.INFINITE,
      isActive: true
    });

    s_employeeIndex[_msgSender()][_employee] = s_employeeList[_msgSender()].length;
    s_employeeList[_msgSender()].push(_employee);

    emit StreamCreated(_msgSender(), _employee, ratePerSecond, block.timestamp, 0, 0, StreamType.INFINITE, finalPayout);
  }

  /**
   * @notice Create finite stream with specified end time
   * @param _employee Employee address
   * @param _amount Amount per period (e.g., 50e6 for $50/hour) (WEI)
   * @param _durationInSeconds Streaming time
   */
  function createFiniteStream(address _employee, uint256 _amount, uint256 _durationInSeconds) external {
    if (_employee == address(0)) {
      revert GainJar__InvalidAddress();
    }

    if (_durationInSeconds == 0) {
      revert GainJar__PeriodCantBeZero();
    }

    if (_amount < _durationInSeconds) {
      revert GainJar__AmountTooSmall();
    }

    if (!s_streams[_msgSender()][_employee].isActive) {
      revert GainJar__StreamExists();
    }

    uint256 ratePerSecond = _amount / _durationInSeconds;
    uint256 finalPayout = _amount % _durationInSeconds;

    uint256 endTime = block.timestamp + _durationInSeconds;

    s_streams[_msgSender()][_employee] = Stream({
      ratePerSecond: ratePerSecond,
      startTime: block.timestamp,
      endTime: endTime,
      totalAmount: _amount,
      lastWithdrawal: block.timestamp,
      totalWithdrawn: 0,
      finalPayout: finalPayout,
      streamType: StreamType.FINITE,
      isActive: true
    });

    s_employeeIndex[_msgSender()][_employee] = s_employeeList[_msgSender()].length;
    s_employeeList[_msgSender()].push(_employee);

    emit StreamCreated(
      _msgSender(), _employee, ratePerSecond, block.timestamp, endTime, _amount, StreamType.FINITE, finalPayout
    );
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
}
