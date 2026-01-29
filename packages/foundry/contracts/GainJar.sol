//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/console.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
contract GainJar {
  // ==============
  // Events
  // ==============

  event FundDeposited(address indexed _employer, uint256 _amount);
  event Withdrawal(address indexed _employee, uint256 _amount);
  event StreamPaused(address indexed _employer, address indexed _employee);
  event StreamEnded(address indexed _employer, address indexed _employee);

  // ==============
  // Errors
  // ==============

  error GainJar__DepositCantBeZero();

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
    uint256 totalWithdrawal;

    // Stream type
    StreamType streamType;

    // This stream also can be paused
    bool isActive;
  }

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

    s_paymentToken.transferFrom(msg.sender, address(this), _amount);

    s_vaultBalances[msg.sender] += _amount;

    emit FundDeposited(msg.sender, _amount);
  }
}
