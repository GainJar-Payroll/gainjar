// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {BaseTest} from "../BaseTest.t.sol";
import {GainJar} from "../../contracts/GainJar.sol";

contract GainJarWithdrawSurplusTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
  }

  function test_WithdrawSurplus_NoActiveStreams_AllowsFullWithdraw() public {
    uint256 depositAmt = 1_000 * 1e6;
    vm.prank(employer);
    gainjar.deposit(depositAmt);

    uint256 before = mockToken.balanceOf(employer);

    uint256 withdrawAmt = 500 * 1e6;

    vm.expectEmit(true, true, true, true);
    emit GainJar.SurplusWithdrawn(employer, withdrawAmt);
    vm.prank(employer);
    gainjar.withdrawSurplus(withdrawAmt);

    assertEq(mockToken.balanceOf(employer), before + withdrawAmt, "employer receives withdrawn surplus");

    (uint256 vaultBalance,,,,,) = gainjar.getVaultHealth(employer);
    assertEq(vaultBalance, depositAmt - withdrawAmt, "vault reduced");
  }

  function test_WithdrawSurplus_WithActiveStream_AllowsWhenSafe() public {
    // Setup: 100 USDC per day stream -> min required for 7 days = 700 USDC
    uint256 ratePerPeriod = 100 * 1e6; // per day

    // deposit min required + extra
    vm.prank(employer);
    gainjar.deposit(700 * 1e6 + 200 * 1e6);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, ratePerPeriod, 1 days);

    // withdrawing the extra 200 should be allowed (leaves exactly 7 days coverage)
    uint256 withdrawAmt = 200 * 1e6;
    vm.expectEmit(true, true, true, true);
    emit GainJar.SurplusWithdrawn(employer, withdrawAmt);
    vm.prank(employer);
    gainjar.withdrawSurplus(withdrawAmt);

    (uint256 vaultBalance,,,,,) = gainjar.getVaultHealth(employer);
    assertEq(vaultBalance, 700 * 1e6, "vault left with min coverage");
  }

  function test_RevertWhen_WithdrawSurplus_LeavesVaultUnsafe() public {
    // Start by depositing enough for creation (min coverage + buffer), then let employee withdraw
    // so vault drops to ~4 days coverage and withdrawSurplus should revert when leaving <3 days.
    uint256 ratePerPeriod = 100 * 1e6; // per day

    // deposit 10 days worth (100 * 10 = 1000)
    vm.prank(employer);
    gainjar.deposit(100 * 1e6 * 10);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, ratePerPeriod, 1 days);

    // advance 6 days so employee can withdraw 600 => vault becomes 400 (4 days)
    vm.warp(block.timestamp + 6 days);
    vm.prank(employee);
    gainjar.withdraw(employer);

    // Attempt to withdraw 200 USDC -> remaining would be 200 USDC (2 days) which is < 3 days -> revert
    uint256 withdrawAmt = 200 * 1e6;

    uint256 minRequired = gainjar.getMinRequiredVaultBalance(employer);
    vm.prank(employer);
    vm.expectRevert(
      abi.encodeWithSelector(GainJar.GainJar__WithdrawLeavesVaultUnsafe.selector, withdrawAmt, minRequired)
    );
    gainjar.withdrawSurplus(withdrawAmt);
  }
}
