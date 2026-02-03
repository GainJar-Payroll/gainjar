// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { GainJar } from "../../contracts/GainJar.sol";
import { MockERC20 } from "../../contracts/mock/MockERC20.sol";

/**
 * Unit tests for Deposit domain GainJar.sol.
 */
contract GainJarWithdrawTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
  }

  // ============== withdraw ==============

  function test_Withdraw_Success() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    vm.warp(block.timestamp + 1 days);
    uint256 expectedEarned = gainjar.withdrawable(employer, employee);
    uint256 balanceBefore = mockToken.balanceOf(employee);

    vm.prank(employee);
    gainjar.withdraw(employer);

    (uint256 fee,) = _feeAndNet(expectedEarned);
    assertEq(mockToken.balanceOf(employee), balanceBefore + expectedEarned - fee, "employee received");
  }

  function test_Withdraw_EmitsWithdrawal() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 1 days);

    uint256 amount = gainjar.withdrawable(employer, employee);
    (uint256 fee,) = _feeAndNet(amount);
    vm.expectEmit(true, true, true, true);
    emit GainJar.Withdrawal(employee, amount, fee);
    vm.prank(employee);
    gainjar.withdraw(employer);
  }

  function test_RevertWhen_Withdraw_StreamNotActive() public {
    vm.prank(employee);
    vm.expectRevert(GainJar.GainJar__StreamNotActive.selector);
    gainjar.withdraw(employer);
  }

  function test_RevertWhen_Withdraw_NothingToWithdraw() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    // no time warp
    vm.prank(employee);
    vm.expectRevert(GainJar.GainJar__NothingToWithdraw.selector);
    gainjar.withdraw(employer);
  }

  // ============== withdrawPartial ==============

  function test_WithdrawPartial_Success() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 12 hours);
    uint256 earnable = gainjar.withdrawable(employer, employee);
    assertGt(earnable, 0, "has withdrawable");

    vm.prank(employee);
    gainjar.withdrawPartial(employer, earnable);

    (,,,,, uint256 totalWithdrawn,,,,) = gainjar.getStreamInfo(employer, employee);
    assertEq(totalWithdrawn, earnable, "partial withdrawn");
  }

  function test_RevertWhen_WithdrawPartial_AmountExceedsEarned() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 1 hours);

    vm.prank(employee);
    vm.expectRevert(GainJar.GainJar__AmountExceedsEarned.selector);
    gainjar.withdrawPartial(employer, 100 * 1e6);
  }

  function test_RevertWhen_WithdrawPartial_InsufficientEmployerVault() public {
    vm.prank(employer);
    gainjar.deposit(1400 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 10 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
    (uint256 balance,,,,,) = gainjar.getVaultHealth(employer);
    uint256 withdrawable2 = gainjar.withdrawable(employer, employee2);
    assertGt(withdrawable2, balance, "employee2 earned more than vault has");
    vm.prank(employee2);
    vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__InsufficientEmployerVault.selector, employer));
    gainjar.withdrawPartial(employer, withdrawable2);
  }

  function test_Withdraw_FiniteStreamEnd_EmitsStreamEnded() public {
    uint256 total = 100 * 1e6;
    uint256 duration = 1 days;
    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);
    vm.warp(block.timestamp + 1 days);

    vm.expectEmit(true, true, true, true);
    emit GainJar.StreamEnded(employer, employee);
    vm.prank(employee);
    gainjar.withdraw(employer);

    (,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
    assertFalse(isActive, "stream ended");
  }
}
