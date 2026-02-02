// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import { GainJar } from "../contracts/GainJar.sol";
import { MockERC20 } from "../contracts/mock/MockERC20.sol";

/**
 * Unit tests for GainJar.sol.
 * Setup: MockERC20 + GainJar deployed in setUp; no deploy script / _loadConfig.
 */
contract GainJarTest is Test {
  GainJar public gainjar;
  MockERC20 public mockToken;

  address public owner;
  address public employer;
  address public employee;
  address public employee2;

  uint256 constant INITIAL_MINT = 10_000_000 * 1e6; // 10M USDC (6 decimals)
  uint256 constant MIN_COVERAGE_DAYS = 7 days;
  uint256 constant ONE_DAY = 1 days;

  function setUp() public {
    owner = address(this);
    employer = makeAddr("employer");
    employee = makeAddr("employee");
    employee2 = makeAddr("employee2");

    mockToken = new MockERC20("USDC Mock", "USDC");
    mockToken.mint(employer, INITIAL_MINT);

    gainjar = new GainJar(address(mockToken));

    vm.startPrank(employer);
    mockToken.approve(address(gainjar), type(uint256).max);
    vm.stopPrank();
  }

  // ============== SetUp state ==============

  function test_SetUpState() public view {
    assertEq(gainjar.getFeeBasisPoints(), 5, "feeBasisPoints");
    assertEq(gainjar.getAccumulatedFees(), 0, "accumulatedFees");
    assertEq(gainjar.owner(), owner, "owner");
    assertEq(mockToken.balanceOf(employer), INITIAL_MINT, "employer balance");
  }

  // ============== updateFee ==============

  function test_UpdateFee_SetsNewFee() public {
    vm.prank(owner);
    gainjar.updateFee(10);
    assertEq(gainjar.getFeeBasisPoints(), 10, "fee updated");
  }

  function test_UpdateFee_EmitsFeeUpdated() public {
    vm.expectEmit(true, true, true, true);
    emit GainJar.FeeUpdated(5, 25);
    vm.prank(owner);
    gainjar.updateFee(25);
  }

  function test_RevertWhen_UpdateFee_CallerNotOwner() public {
    vm.prank(employer);
    vm.expectRevert();
    gainjar.updateFee(10);
  }

  function test_RevertWhen_UpdateFee_FeeExceedsMax() public {
    vm.prank(owner);
    vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__FeeExceedsMax.selector, 101, 100));
    gainjar.updateFee(101);
  }

  // ============== claimFees ==============

  function test_RevertWhen_ClaimFees_NoFeesToClaim() public {
    vm.prank(owner);
    vm.expectRevert(GainJar.GainJar__NoFeesToClaim.selector);
    gainjar.claimFees();
  }

  function test_ClaimFees_TransfersAccumulatedFees() public {
    _createInfiniteStreamAndWithdrawFees();
    uint256 accumulated = gainjar.getAccumulatedFees();
    assertGt(accumulated, 0, "has fees");
    uint256 ownerBefore = mockToken.balanceOf(owner);
    vm.prank(owner);
    gainjar.claimFees();
    assertEq(gainjar.getAccumulatedFees(), 0, "fees zeroed");
    assertEq(mockToken.balanceOf(owner), ownerBefore + accumulated, "owner received fees");
  }

  function test_RevertWhen_ClaimFees_SecondClaimNoFees() public {
    _createInfiniteStreamAndWithdrawFees();
    vm.prank(owner);
    gainjar.claimFees();
    vm.prank(owner);
    vm.expectRevert(GainJar.GainJar__NoFeesToClaim.selector);
    gainjar.claimFees();
  }

  // ============== deposit ==============

  function test_Deposit_IncreasesVaultBalance() public {
    uint256 amount = 1000 * 1e6;
    vm.prank(employer);
    gainjar.deposit(amount);
    (uint256 balance,,,,,) = gainjar.getVaultHealth(employer);
    assertEq(balance, amount, "vault balance");
  }

  function test_Deposit_EmitsFundDeposited() public {
    uint256 amount = 1000 * 1e6;
    vm.expectEmit(true, true, true, true);
    emit GainJar.FundDeposited(employer, amount);
    vm.prank(employer);
    gainjar.deposit(amount);
  }

  function test_RevertWhen_Deposit_AmountZero() public {
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__DepositCantBeZero.selector);
    gainjar.deposit(0);
  }

  // ============== createInfiniteStream ==============

  function test_CreateInfiniteStream_Success() public {
    uint256 depositAmount = 700 * 1e6; // min for 100e6/1day over 7 days
    vm.prank(employer);
    gainjar.deposit(depositAmount);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    (uint256 ratePerSecond,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
    uint256 expectedRate = (100 * 1e6) / ONE_DAY;
    assertEq(ratePerSecond, expectedRate, "ratePerSecond");
    assertTrue(isActive, "stream active");
  }

  function test_CreateInfiniteStream_EmitsStreamCreated() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);

    vm.expectEmit(true, true, true, true);
    emit GainJar.StreamCreated(
      employer,
      employee,
      (100 * 1e6) / ONE_DAY,
      block.timestamp,
      0,
      100 * 1e6,
      GainJar.StreamType.INFINITE,
      0
    );
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
  }

  function test_RevertWhen_CreateInfiniteStream_InvalidAddress() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__InvalidAddress.selector);
    gainjar.createInfiniteStream(address(0), 100 * 1e6, 1 days);
  }

  function test_RevertWhen_CreateInfiniteStream_PeriodZero() public {
    vm.prank(employer);
    gainjar.deposit(INITIAL_MINT);
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__PeriodCantBeZero.selector);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 0);
  }

  function test_RevertWhen_CreateInfiniteStream_AmountTooSmall() public {
    vm.prank(employer);
    gainjar.deposit(INITIAL_MINT);
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__AmountTooSmall.selector);
    gainjar.createInfiniteStream(employee, 1, 1 days);
  }

  function test_RevertWhen_CreateInfiniteStream_StreamExists() public {
    vm.prank(employer);
    gainjar.deposit(1400 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__StreamExists.selector);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
  }

  function test_RevertWhen_CreateInfiniteStream_InsufficientVault() public {
    vm.prank(employer);
    gainjar.deposit(100 * 1e6); // below 700e6 needed for 100e6/day
    vm.prank(employer);
    vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__InsufficientEmployerVault.selector, employer));
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
  }

  // ============== createFiniteStream ==============

  function test_CreateFiniteStream_Success() public {
    uint256 totalAmount = 1000 * 1e6;
    uint256 duration = 30 days;
    uint256 minVault = (totalAmount / duration) * MIN_COVERAGE_DAYS;
    vm.prank(employer);
    gainjar.deposit(minVault);

    vm.prank(employer);
    gainjar.createFiniteStream(employee, totalAmount, duration);

    (uint256 rate, uint256 startTime, uint256 endTime, uint256 total,,,,, bool isActive,) =
      gainjar.getStreamInfo(employer, employee);
    assertEq(rate, totalAmount / duration, "rate");
    assertEq(endTime, startTime + duration, "endTime");
    assertEq(total, totalAmount, "totalAmount");
    assertTrue(isActive, "active");
  }

  function test_RevertWhen_CreateFiniteStream_InsufficientVault() public {
    vm.prank(employer);
    gainjar.deposit(100 * 1e6);
    vm.prank(employer);
    vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__InsufficientEmployerVault.selector, employer));
    gainjar.createFiniteStream(employee, 1000 * 1e6, 30 days);
  }

  // ============== createFiniteStreamDays ==============
  // Note: createFiniteStreamDays uses this.createFiniteStream so msg.sender becomes the contract;
  // we test equivalent behavior by calling createFiniteStream directly with duration in days.

  function test_CreateFiniteStreamDays_EquivalentViaCreateFiniteStream() public {
    uint256 totalAmount = 500 * 1e6;
    uint256 durationDays = 14;
    uint256 durationSeconds = durationDays * ONE_DAY;
    uint256 minVault = (totalAmount / durationSeconds) * MIN_COVERAGE_DAYS;
    vm.prank(employer);
    gainjar.deposit(minVault);

    vm.prank(employer);
    gainjar.createFiniteStream(employee, totalAmount, durationSeconds);

    (, uint256 startTime, uint256 endTime, uint256 total,,,,,,) = gainjar.getStreamInfo(employer, employee);
    assertEq(endTime - startTime, durationSeconds, "duration days");
    assertEq(total, totalAmount, "totalAmount");
  }

  // ============== createHourlyStream / createMonthlyStream ==============
  // Note: createHourlyStream/createMonthlyStream use this.createInfiniteStream so msg.sender becomes the contract;
  // we test equivalent behavior by calling createInfiniteStream directly.

  function test_CreateHourlyStream_EquivalentViaCreateInfiniteStream() public {
    uint256 hourlyRate = 50 * 1e6;
    uint256 minVault = (hourlyRate / 1 hours) * MIN_COVERAGE_DAYS;
    vm.prank(employer);
    gainjar.deposit(minVault);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, hourlyRate, 1 hours);

    (uint256 rate,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
    assertEq(rate, hourlyRate / (1 hours), "hourly rate");
    assertTrue(isActive, "active");
  }

  function test_CreateMonthlyStream_EquivalentViaCreateInfiniteStream() public {
    uint256 monthlyRate = 5000 * 1e6;
    uint256 minVault = (monthlyRate / (30 days)) * MIN_COVERAGE_DAYS;
    vm.prank(employer);
    gainjar.deposit(minVault);

    vm.prank(employer);
    gainjar.createInfiniteStream(employee, monthlyRate, 30 days);

    (uint256 rate,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
    assertEq(rate, monthlyRate / (30 days), "monthly rate");
    assertTrue(isActive, "active");
  }

  // ============== updateInfiniteRate ==============

  function test_UpdateInfiniteRate_Success() public {
    vm.prank(employer);
    gainjar.deposit(1400 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.warp(block.timestamp + 1 hours); // so _processWithdrawal has something to withdraw

    vm.prank(employer);
    gainjar.updateInfiniteRate(employee, 200 * 1e6, 1 days);

    (uint256 rate,,,,,,,,,) = gainjar.getStreamInfo(employer, employee);
    assertEq(rate, (200 * 1e6) / ONE_DAY, "updated rate");
  }

  function test_RevertWhen_UpdateInfiniteRate_StreamNotActive() public {
    vm.prank(employer);
    gainjar.deposit(1400 * 1e6);
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__StreamNotActive.selector);
    gainjar.updateInfiniteRate(employee, 200 * 1e6, 1 days);
  }

  function test_RevertWhen_UpdateInfiniteRate_OnlyInfiniteStream() public {
    vm.prank(employer);
    gainjar.deposit(1000 * 1e6);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, 500 * 1e6, 30 days);

    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__OnlyInfiniteStream.selector);
    gainjar.updateInfiniteRate(employee, 200 * 1e6, 1 days);
  }

  // ============== extendFiniteStream ==============

  function test_ExtendFiniteStream_Success() public {
    uint256 totalAmount = 300 * 1e6;
    uint256 duration = 30 days;
    uint256 minVault = (totalAmount / duration) * 30 days; // enough for 30 days so after 10 days we still have balance
    vm.prank(employer);
    gainjar.deposit(minVault);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, totalAmount, duration);

    vm.warp(block.timestamp + 10 days);
    vm.prank(employer);
    gainjar.extendFiniteStream(employee, 200 * 1e6, 20 days);

    (,, uint256 endTime, uint256 streamTotal,,,,,,) = gainjar.getStreamInfo(employer, employee);
    assertEq(streamTotal, totalAmount + 200 * 1e6, "total extended");
    assertGt(endTime, block.timestamp, "endTime in future");
  }

  function test_RevertWhen_ExtendFiniteStream_OnlyFiniteStream() public {
    vm.prank(employer);
    gainjar.deposit(1400 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__OnlyFiniteStream.selector);
    gainjar.extendFiniteStream(employee, 100 * 1e6, 7 days);
  }

  // ============== pauseStream ==============

  function test_PauseStream_Success() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

    vm.prank(employer);
    gainjar.pauseStream(employee);

    (,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
    assertFalse(isActive, "paused");
  }

  function test_RevertWhen_PauseStream_StreamNotActive() public {
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__StreamNotActive.selector);
    gainjar.pauseStream(employee);
  }

  function test_RevertWhen_PauseStream_AlreadyPaused() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    vm.prank(employer);
    gainjar.pauseStream(employee);
    vm.prank(employer);
    vm.expectRevert(GainJar.GainJar__StreamNotActive.selector);
    gainjar.pauseStream(employee);
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

  // ============== liquidate ==============

  function test_Liquidate_Success() public {
    _setupEmployerInEmergency();
    uint256 balanceBefore = mockToken.balanceOf(employee);
    vm.prank(employee);
    gainjar.liquidate(employer);

    assertTrue(gainjar.isLiquidated(employer), "liquidated");
    assertEq(mockToken.balanceOf(employee), balanceBefore + LIQUIDATION_REWARD, "liquidator reward");
  }

  function test_RevertWhen_Liquidate_VaultNotEligible() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    vm.expectRevert(
      abi.encodeWithSelector(GainJar.GainJar__VaultNotEligibleForLiquidation.selector, GainJar.VaultStatus.HEALTHY)
    );
    gainjar.liquidate(employer);
  }

  function test_RevertWhen_Liquidate_AgainAfterLiquidation_VaultNotEligible() public {
    _setupEmployerInEmergency();
    vm.prank(employee);
    gainjar.liquidate(employer);
    // After liquidation streams are paused, so vault is no longer EMERGENCY
    vm.prank(employee);
    vm.expectRevert(
      abi.encodeWithSelector(GainJar.GainJar__VaultNotEligibleForLiquidation.selector, GainJar.VaultStatus.HEALTHY)
    );
    gainjar.liquidate(employer);
  }

  // ============== restoreAfterLiquidation ==============

  function test_RestoreAfterLiquidation_ClearsFlag() public {
    _setupEmployerInEmergency();
    vm.prank(employee);
    gainjar.liquidate(employer);
    assertTrue(gainjar.isLiquidated(employer), "was liquidated");

    vm.prank(employer);
    gainjar.restoreAfterLiquidation();
    assertFalse(gainjar.isLiquidated(employer), "restored");
  }

  // ============== View functions ==============

  function test_GetVaultHealth_ReturnsCorrectValues() public {
    uint256 depositAmount = 3000 * 1e6; // 30 days at 100e6/day
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

  function test_GetStreamInfo_FiniteStream() public {
    uint256 total = 600 * 1e6;
    uint256 duration = 30 days;
    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);

    vm.warp(block.timestamp + 10 days);
    (uint256 rate, uint256 startTime, uint256 endTime, uint256 totalAmount, GainJar.StreamType streamType,
      uint256 totalEarned, uint256 totalWithdrawn, uint256 withdrawableNow, bool isActive, bool isExpired) =
      gainjar.getStreamInfo(employer, employee);

    assertEq(uint256(streamType), uint256(GainJar.StreamType.FINITE), "FINITE");
    assertEq(totalAmount, total, "totalAmount");
    assertEq(rate, total / duration, "rate");
    assertEq(totalEarned, (10 days) * rate, "totalEarned");
    assertEq(totalWithdrawn, 0, "totalWithdrawn");
    assertEq(withdrawableNow, totalEarned, "withdrawableNow");
    assertTrue(isActive, "active");
    assertFalse(isExpired, "not expired");
  }

  function test_Withdrawable_RespectsFiniteCap() public {
    uint256 total = 100 * 1e6;
    uint256 duration = 1 days;
    vm.prank(employer);
    gainjar.deposit((total / duration) * MIN_COVERAGE_DAYS);
    vm.prank(employer);
    gainjar.createFiniteStream(employee, total, duration);

    vm.warp(block.timestamp + 2 days);
    uint256 w = gainjar.withdrawable(employer, employee);
    // Finite stream: earn until endTime only; rate truncation gives slightly less than total
    assertEq(w, (total / duration) * duration, "capped at totalAmount (rate * duration)");
  }

  function test_GetLiquidationInfo_WhenEligible() public {
    _setupEmployerInEmergency();
    (bool eligible, uint256 cooldownLeft, bool isLiquidated, uint256 reward) = gainjar.getLiquidationInfo(employer);
    assertTrue(eligible, "eligible");
    assertEq(cooldownLeft, 0, "cooldown");
    assertFalse(isLiquidated, "not yet liquidated");
    assertEq(reward, LIQUIDATION_REWARD, "reward");
  }

  function test_GetMinCoverageDaysSecond() public view {
    assertEq(gainjar.getMinCoverageDaysSecond(), MIN_COVERAGE_DAYS, "min coverage");
  }

  function test_HasMinimumCoverage_WhenSufficient() public {
    vm.prank(employer);
    gainjar.deposit(700 * 1e6);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    assertTrue(gainjar.hasMinimumCoverage(employer), "has min coverage");
  }

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

  // ============== Helpers ==============

  uint256 constant LIQUIDATION_REWARD = 10e6;

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

  /// @dev Deposit, create stream, then warp so vault drops to EMERGENCY (< 3 days coverage)
  function _setupEmployerInEmergency() internal {
    uint256 rate = (100 * 1e6) / ONE_DAY;
    uint256 minForHealthy = rate * 30 days;
    vm.prank(employer);
    gainjar.deposit(minForHealthy + LIQUIDATION_REWARD);
    vm.prank(employer);
    gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
    // Warp so balance/flowRate < 3 days
    vm.warp(block.timestamp + 28 days);
    // Now vault has ~2 days left -> CRITICAL or EMERGENCY; drain more to be sure EMERGENCY
    vm.prank(employee);
    gainjar.withdraw(employer);
    vm.warp(block.timestamp + 1 days);
    vm.prank(employee);
    gainjar.withdraw(employer);
    // Should be EMERGENCY now
    assertEq(uint256(gainjar.getVaultStatus(employer)), uint256(GainJar.VaultStatus.EMERGENCY), "EMERGENCY");
  }
}
