// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { GainJar } from "../../contracts/GainJar.sol";

/**
 * Unit tests for View/read functions on GainJar.sol.
 */
contract GainJarViewsTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
  }

  // ============== getMinCoverageDaysSecond ==============

  function test_GetMinCoverageDaysSecond() public view {
    assertEq(gainjar.getMinCoverageDaysSecond(), MIN_COVERAGE_DAYS, "min coverage");
  }

  // ============== getVaultHealth ==============

  function test_GetVaultHealth_ReturnsCorrectValues() public {
    uint256 depositAmount = 3000 * 1e6;
    vm.prank(employer);
    gainjar.deposit(depositAmount);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    (uint256 balance, uint256 flowRate, uint256 daysRemaining, GainJar.VaultStatus status, bool canCreate,) =
      gainjar.getVaultHealth(employer);

    assertEq(balance, depositAmount, "balance");
    assertEq(flowRate, (100 * 1e6) / ONE_DAY, "flowRate");
    assertGe(daysRemaining, 7, "daysRemaining");
    assertEq(uint256(status), uint256(GainJar.VaultStatus.HEALTHY), "HEALTHY");
    assertTrue(canCreate, "canCreateNewStream");
  }

  function test_GetVaultHealth_WarningStatus() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    (,,, GainJar.VaultStatus status,,) = gainjar.getVaultHealth(employer);
    assertEq(uint256(status), uint256(GainJar.VaultStatus.WARNING), "WARNING");
  }

  // ============== getStreamInfo ==============

  function test_GetStreamInfo_InfiniteStream() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    (
      uint256 ratePerSecond,,
      uint256 endTime,
      uint256 totalAmount,
      GainJar.StreamType streamType,
      uint256 totalEarned,
      uint256 totalWithdrawn,
      uint256 withdrawableNow,
      bool isActive,
      bool isExpired
    ) = gainjar.getStreamInfo(employer, employee);

    assertEq(ratePerSecond, (100 * 1e6) / ONE_DAY, "rate");
    assertEq(endTime, 0, "infinite endTime");
    assertEq(totalAmount, 0, "infinite totalAmount");
    assertEq(uint256(streamType), uint256(GainJar.StreamType.INFINITE), "INFINITE");
    assertEq(totalWithdrawn, 0, "totalWithdrawn");
    assertEq(withdrawableNow, totalEarned, "withdrawableNow");
    assertTrue(isActive, "active");
    assertFalse(isExpired, "not expired");
  }

  function test_GetStreamInfo_FiniteStream() public {
    uint256 total = 600 * 1e6;
    uint256 duration = 30 days;
    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);

    vm.warp(block.timestamp + 10 days);
    (
      uint256 rate,
      uint256 startTime,
      uint256 endTime,
      uint256 totalAmount,
      GainJar.StreamType streamType,
      uint256 totalEarned,
      uint256 totalWithdrawn,
      uint256 withdrawableNow,
      bool isActive,
      bool isExpired
    ) = gainjar.getStreamInfo(employer, employee);

    assertEq(uint256(streamType), uint256(GainJar.StreamType.FINITE), "FINITE");
    assertEq(totalAmount, total, "totalAmount");
    assertEq(rate, total / duration, "rate");
    assertEq(totalEarned, (10 days) * rate, "totalEarned");
    assertEq(totalWithdrawn, 0, "totalWithdrawn");
    assertEq(withdrawableNow, totalEarned, "withdrawableNow");
    assertTrue(isActive, "active");
    assertFalse(isExpired, "not expired");
    assertEq(endTime, startTime + duration, "endTime");
  }

  // ============== withdrawable ==============

  function test_Withdrawable_RespectsFiniteCap() public {
    uint256 total = 100 * 1e6;
    uint256 duration = 1 days;
    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);

    vm.warp(block.timestamp + 2 days);
    uint256 w = gainjar.withdrawable(employer, employee);
    assertEq(w, (total / duration) * duration, "capped at totalAmount (rate * duration)");
  }

  function test_Withdrawable_InactiveStream_ReturnsZero() public view {
    assertEq(gainjar.withdrawable(employer, employee), 0, "no stream");
  }

  // ============== getTotalFlowRate / getVaultDepletionTime / getMinRequiredVaultBalance / getVaultStatus ==============

  function test_GetTotalFlowRate_SingleStream() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    assertEq(gainjar.getTotalFlowRate(employer), (100 * 1e6) / ONE_DAY, "flowRate");
  }

  function test_GetVaultDepletionTime_NoStream_ReturnsMax() public view {
    assertEq(gainjar.getVaultDepletionTime(employer), type(uint256).max, "no flow");
  }

  function test_GetVaultStatus_Healthy() public {
    vm.prank(employer);
    gainjar.deposit(3000 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    assertEq(uint256(gainjar.getVaultStatus(employer)), uint256(GainJar.VaultStatus.HEALTHY), "HEALTHY");
  }

  function test_GetVaultStatus_Emergency() public {
    _setupEmployerInEmergency();
    assertEq(uint256(gainjar.getVaultStatus(employer)), uint256(GainJar.VaultStatus.EMERGENCY), "EMERGENCY");
  }

  // ============== hasMinimumCoverage ==============

  function test_HasMinimumCoverage_WhenSufficient() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    assertTrue(gainjar.hasMinimumCoverage(employer), "has min coverage");
  }

  function test_HasMinimumCoverage_WhenInsufficient() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 1 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
    assertFalse(gainjar.hasMinimumCoverage(employer), "below min after withdraw");
  }

  // ============== getSafeWithdrawableAmount ==============

  function test_GetSafeWithdrawableAmount_WhenVaultSufficient() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 1 days);

    uint256 expectedEarned = gainjar.withdrawable(employer, employee);
    (uint256 totalEarned, uint256 safeAmount, bool isFullySafe) = gainjar.getSafeWithdrawableAmount(employer, employee);
    assertEq(totalEarned, expectedEarned, "totalEarned");
    assertEq(safeAmount, expectedEarned, "safeAmount");
    assertTrue(isFullySafe, "isFullySafe");
  }

  function test_GetSafeWithdrawableAmount_WhenVaultInsufficient() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 10 days);
    (uint256 balance,,,,,) = gainjar.getVaultHealth(employer);
    (uint256 totalEarned, uint256 safeAmount, bool isFullySafe) = gainjar.getSafeWithdrawableAmount(employer, employee);
    assertGt(totalEarned, balance, "earned > vault");
    assertEq(safeAmount, balance, "safe = vault balance");
    assertFalse(isFullySafe, "not fully safe");
  }

  // ============== getLiquidationPreview ==============

  function test_GetLiquidationPreview_WhenEligible() public {
    _setupEmployerInEmergency();
    (bool eligible, GainJar.VaultStatus status,, uint256 estimatedReward,) = gainjar.getLiquidationPreview(employer);

    assertTrue(eligible, "eligible");
    assertTrue(
      status == GainJar.VaultStatus.CRITICAL || status == GainJar.VaultStatus.EMERGENCY, "CRITICAL or EMERGENCY"
    );
    assertGt(estimatedReward, 0, "reward > 0");
  }

  function test_GetLiquidationPreview_WhenNotEligible() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    (bool eligible,,,,) = gainjar.getLiquidationPreview(employer);
    assertFalse(eligible, "not eligible");
  }

  function test_GetLiquidationPreview_WhenCooldownActive_Ineligible() public {
    _setupEmployerInEmergency();
    vm.prank(employee);
    gainjar.liquidate(employer);

    vm.warp(block.timestamp + 30 minutes);
    (bool eligible,,,,) = gainjar.getLiquidationPreview(employer);
    assertFalse(eligible, "not eligible during cooldown");
  }

  function test_GetVaultHealth_MaxAdditionalFlowRate_WhenBalanceExceedsRequired() public {
    vm.prank(employer);
    gainjar.deposit(3000 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    (,,,,, uint256 maxAdditionalFlowRate) = gainjar.getVaultHealth(employer);
    assertGt(maxAdditionalFlowRate, 0, "can add more flow");
  }

  // ============== getActiveEmployeeCount / getTotalEmployeeCount ==============

  function test_GetActiveEmployeeCount_NoEmployees() public view {
    assertEq(gainjar.getActiveEmployeeCount(employer), 0, "no active employees");
  }

  function test_GetActiveEmployeeCount_SingleActiveEmployee() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    assertEq(gainjar.getActiveEmployeeCount(employer), 1, "1 active employee");
  }

  function test_GetActiveEmployeeCount_AfterPause_DecreasesCount() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    assertEq(gainjar.getActiveEmployeeCount(employer), 1, "1 active before pause");

    vm.warp(block.timestamp + 1 days);

    vm.prank(employer);
    gainjar.pauseStream(employee);

    assertEq(gainjar.getActiveEmployeeCount(employer), 0, "0 active after pause");
  }

  function test_GetTotalEmployeeCount_IncludesInactive() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    assertEq(gainjar.getTotalEmployeeCount(employer), 1, "1 total");

    vm.warp(block.timestamp + 1 days);

    vm.prank(employer);
    gainjar.pauseStream(employee);

    assertEq(gainjar.getTotalEmployeeCount(employer), 1, "still 1 total (history)");
    assertEq(gainjar.getActiveEmployeeCount(employer), 0, "but 0 active");
  }

  function test_GetActiveEmployeeCount_MultipleEmployees() public {
    vm.prank(employer);
    gainjar.deposit(2100 * 1e6);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee3, 100 * 1e6, 1 days);

    assertEq(gainjar.getActiveEmployeeCount(employer), 3, "3 active");
    assertEq(gainjar.getTotalEmployeeCount(employer), 3, "3 total");

    vm.warp(block.timestamp + 1 days);

    // Pause one
    vm.prank(employer);
    gainjar.pauseStream(employee2);

    assertEq(gainjar.getActiveEmployeeCount(employer), 2, "2 active after pause");
    assertEq(gainjar.getTotalEmployeeCount(employer), 3, "still 3 total");
  }

  // ============== getActiveEmployees / getAllEmployees ==============

  function test_GetActiveEmployees_ReturnsEmptyWhenNone() public view {
    address[] memory active = gainjar.getActiveEmployees(employer);
    assertEq(active.length, 0, "empty array");
  }

  function test_GetActiveEmployees_ReturnsSingleEmployee() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    address[] memory active = gainjar.getActiveEmployees(employer);
    assertEq(active.length, 1, "1 employee");
    assertEq(active[0], employee, "correct employee");
  }

  function test_GetActiveEmployees_ExcludesPausedStreams() public {
    vm.prank(employer);
    gainjar.deposit(1400 * 1e6);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);

    address[] memory activeBefore = gainjar.getActiveEmployees(employer);
    assertEq(activeBefore.length, 2, "2 active before pause");

    vm.warp(block.timestamp + 1 days);

    vm.prank(employer);
    gainjar.pauseStream(employee);

    address[] memory activeAfter = gainjar.getActiveEmployees(employer);
    assertEq(activeAfter.length, 1, "1 active after pause");
    assertEq(activeAfter[0], employee2, "employee2 still active");
  }

  function test_GetAllEmployees_IncludesInactive() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    vm.warp(block.timestamp + 1 days);

    vm.prank(employer);
    gainjar.pauseStream(employee);

    address[] memory all = gainjar.getAllEmployees(employer);
    address[] memory active = gainjar.getActiveEmployees(employer);

    assertEq(all.length, 1, "1 in history");
    assertEq(active.length, 0, "0 active");
    assertEq(all[0], employee, "employee in history");
  }

  function test_GetActiveEmployees_AfterStreamEnds_RemovesFromActive() public {
    uint256 total = 100 * 1e6;
    uint256 duration = 1 days;

    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);

    assertEq(gainjar.getActiveEmployeeCount(employer), 1, "1 active initially");

    // Warp past end time
    vm.warp(block.timestamp + duration + 1);

    // Withdraw to trigger stream end
    vm.prank(employee);
    gainjar.withdraw(employer);

    assertEq(gainjar.getActiveEmployeeCount(employer), 0, "0 active after stream ends");
    assertEq(gainjar.getTotalEmployeeCount(employer), 1, "still 1 in history");
  }

  // ============== isActiveEmployee ==============

  function test_IsActiveEmployee_ReturnsFalseWhenNoStream() public view {
    assertFalse(gainjar.isActiveEmployee(employer, employee), "no stream");
  }

  function test_IsActiveEmployee_ReturnsTrueWhenActive() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    assertTrue(gainjar.isActiveEmployee(employer, employee), "active");
  }

  function test_IsActiveEmployee_ReturnsFalseAfterPause() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    assertTrue(gainjar.isActiveEmployee(employer, employee), "active before pause");

    vm.warp(block.timestamp + 1 days);

    vm.prank(employer);
    gainjar.pauseStream(employee);

    assertFalse(gainjar.isActiveEmployee(employer, employee), "inactive after pause");
  }

  function test_IsActiveEmployee_ReturnsFalseAfterStreamEnds() public {
    uint256 total = 100 * 1e6;
    uint256 duration = 1 days;

    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);

    assertTrue(gainjar.isActiveEmployee(employer, employee), "active before end");

    vm.warp(block.timestamp + duration + 1);
    vm.prank(employee);
    gainjar.withdraw(employer);

    assertFalse(gainjar.isActiveEmployee(employer, employee), "inactive after stream ends");
  }

  // ============== Edge Cases: Multiple Operations ==============

  function test_ActiveEmployees_ComplexScenario() public {
    vm.prank(employer);
    gainjar.deposit(5000 * 1e6);

    // Create 3 streams
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee3, 100 * 1e6, 1 days);

    vm.warp(block.timestamp * 1 days);

    assertEq(gainjar.getActiveEmployeeCount(employer), 3, "3 active");

    // Pause one
    vm.prank(employer);
    gainjar.pauseStream(employee);

    assertEq(gainjar.getActiveEmployeeCount(employer), 2, "2 active after pause");
    assertTrue(gainjar.isActiveEmployee(employer, employee2), "employee2 still active");
    assertTrue(gainjar.isActiveEmployee(employer, employee3), "employee3 still active");
    assertFalse(gainjar.isActiveEmployee(employer, employee), "employee paused");

    // Check active list doesn't contain paused employee
    address[] memory active = gainjar.getActiveEmployees(employer);
    assertEq(active.length, 2, "2 in active list");
    assertTrue(active[0] == employee2 || active[0] == employee3, "active[0] is employee2 or employee3");
    assertTrue(active[1] == employee2 || active[1] == employee3, "active[1] is employee2 or employee3");

    // Total list still has all 3
    address[] memory all = gainjar.getAllEmployees(employer);
    assertEq(all.length, 3, "3 in total list");
  }

  // ============== getTotalFlowRate with Active List ==============

  function test_GetTotalFlowRate_OnlyCountsActiveStreams() public {
    vm.prank(employer);
    gainjar.deposit(14000 * 1e6);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee2, 200 * 1e6, 1 days);

    uint256 expectedRate = (100 * 1e6) / ONE_DAY + (200 * 1e6) / ONE_DAY;
    assertEq(gainjar.getTotalFlowRate(employer), expectedRate, "combined flow rate");

    vm.warp(block.timestamp + 1 days);

    // Pause one
    vm.prank(employer);
    gainjar.pauseStream(employee);

    uint256 expectedRateAfter = (200 * 1e6) / ONE_DAY;
    assertEq(gainjar.getTotalFlowRate(employer), expectedRateAfter, "flow rate after pause");
  }
}
