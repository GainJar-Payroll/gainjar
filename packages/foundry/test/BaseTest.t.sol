// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import { GainJar } from "../contracts/GainJar.sol";
import { MockERC20 } from "../contracts/mock/MockERC20.sol";

/**
 * BaseTest abstraction.
 */
contract BaseTest is Test {
  GainJar public gainjar;
  MockERC20 public mockToken;

  address public owner;
  address public employer;
  address public employee;
  address public employee2;

  uint256 constant INITIAL_MINT = 10_000_000 * 1e6; // 10M USDC (6 decimals)
  uint256 constant MIN_COVERAGE_DAYS = 7 days;
  uint256 constant ONE_DAY = 1 days;

  function baseTestSetUp() public {
    owner = makeAddr("owner");
    employer = makeAddr("employer");
    employee = makeAddr("employee");
    employee2 = makeAddr("employee2");

    mockToken = new MockERC20("USDC Mock", "USDC");
    mockToken.mint(employer, INITIAL_MINT);

    vm.prank(owner);
    gainjar = new GainJar(address(mockToken));

    vm.startPrank(employer);
    mockToken.approve(address(gainjar), type(uint256).max);
    vm.stopPrank();
  }

  // ============== Helpers ==============

  function _feeAndNet(uint256 amount) internal view returns (uint256 fee, uint256 net) {
    uint256 bp = gainjar.getFeeBasisPoints();
    fee = (amount * bp) / 10000;
    net = amount - fee;
  }

  function _createInfiniteStreamAndWithdrawFees() internal {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 1 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
  }

  /// @dev Deposit, create stream, then warp so vault drops to EMERGENCY (< 3 days coverage).
  /// Vault is left with enough balance for liquidate() to pay employee earnings + dynamic reward.
  function _setupEmployerInEmergency() internal {
    uint256 rate = (100 * 1e6) / ONE_DAY;
    uint256 minForHealthy = rate * 30 days;
    uint256 depositAmount = minForHealthy + 50 * 1e6; // extra buffer for liquidation reward (cap 50e6)
    vm.prank(employer);
    gainjar.deposit(depositAmount);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 28 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
    vm.warp(block.timestamp + 1 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
    assertEq(
      uint256(gainjar.getVaultStatus(employer)),
      uint256(GainJar.VaultStatus.EMERGENCY),
      "EMERGENCY"
    );
  }
}
