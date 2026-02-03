// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { GainJar } from "../../contracts/GainJar.sol";

/**
 * Unit tests for Liquidation domain on GainJar.sol.
 */
contract GainJarLiquidationTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
  }

  function test_Liquidate_Success() public {
    _setupEmployerInEmergency();
    (bool eligible,, uint256 totalEmployeeEarnings, uint256 estimatedReward,,) = gainjar.getLiquidationPreview(employer);
    assertTrue(eligible, "eligible");
    uint256 balanceBefore = mockToken.balanceOf(employee);

    vm.prank(employee);
    gainjar.liquidate(employer);

    uint256 balanceAfter = mockToken.balanceOf(employee);
    uint256 received = balanceAfter - balanceBefore;
    assertGe(received, estimatedReward, "liquidator received at least estimated reward");
    assertGe(
      received,
      totalEmployeeEarnings + estimatedReward - (totalEmployeeEarnings * gainjar.getFeeBasisPoints() / 10000),
      "employee payout + reward"
    );
  }

  function test_Liquidate_EmitsLiquidated() public {
    _setupEmployerInEmergency();
    (,, uint256 totalEarnings, uint256 reward,,) = gainjar.getLiquidationPreview(employer);

    vm.expectEmit(true, true, true, true);
    emit GainJar.Liquidated(employee, employer, totalEarnings, reward, 1);
    vm.prank(employee);
    gainjar.liquidate(employer);
  }

  function test_RevertWhen_Liquidate_VaultNotEligible() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    assertEq(uint256(gainjar.getVaultStatus(employer)), uint256(GainJar.VaultStatus.WARNING), "WARNING");

    vm.prank(employee);
    vm.expectRevert(
      abi.encodeWithSelector(GainJar.GainJar__VaultNotEligibleForLiquidation.selector, GainJar.VaultStatus.WARNING)
    );
    gainjar.liquidate(employer);
  }

  function test_RevertWhen_Liquidate_AgainAfterLiquidation_VaultNotEligible() public {
    _setupEmployerInEmergency();
    vm.prank(employee);
    gainjar.liquidate(employer);

    vm.prank(employee);
    vm.expectRevert(
      abi.encodeWithSelector(GainJar.GainJar__VaultNotEligibleForLiquidation.selector, GainJar.VaultStatus.HEALTHY)
    );
    gainjar.liquidate(employer);
  }

  /// @dev Vault in EMERGENCY but balance < totalRequired (earnings + reward): drain vault then try to liquidate.
  function test_RevertWhen_Liquidate_InsufficientVaultForLiquidation() public {
    vm.prank(employer);
    gainjar.deposit(800 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 8 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
    (uint256 balance,,,,,) = gainjar.getVaultHealth(employer);
    (,, uint256 totalEarnings, uint256 reward,,) = gainjar.getLiquidationPreview(employer);
    uint256 totalRequired = totalEarnings + reward;
    assertLt(balance, totalRequired, "vault below totalRequired");
    assertGe(uint256(gainjar.getVaultStatus(employer)), uint256(GainJar.VaultStatus.CRITICAL), "CRITICAL or EMERGENCY");

    vm.prank(employee);
    vm.expectRevert(
      abi.encodeWithSelector(GainJar.GainJar__InsufficientVaultForLiquidation.selector, balance, totalRequired)
    );
    gainjar.liquidate(employer);
  }
}
