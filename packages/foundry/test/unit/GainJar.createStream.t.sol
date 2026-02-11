// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {BaseTest} from "../BaseTest.t.sol";
import {console} from "forge-std/console.sol";
import {GainJar} from "../../contracts/GainJar.sol";
import {MockERC20} from "../../contracts/mock/MockERC20.sol";

/**
 * Unit tests for Deposit domain GainJar.sol.
 */
contract GainJarCreateStreamTest is BaseTest {
    function setUp() public {
        baseTestSetUp();
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
            employer, employee, (100 * 1e6) / ONE_DAY, block.timestamp, 0, 100 * 1e6, GainJar.StreamType.INFINITE, 0
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

    function test_CreateInfiniteStream_WithExactMinimumVault() public {
        uint256 depositAmount = (100 * 1e6) * 7; // 7 mean for 7 days

        vm.startPrank(employer);
        gainjar.deposit(depositAmount);

        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
        vm.stopPrank();
    }

    function test_CreateInfiniteStream_MoreThanOneEmployeeVault() public {
        uint256 depositAmount = (100 * 1e6) * 14;

        vm.startPrank(employer);
        gainjar.deposit(depositAmount);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);
        gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);
        vm.stopPrank();

        (, uint256 flowRate,,,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(flowRate, 200e6 / ONE_DAY);
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

    function test_CreateFiniteStream_WithVerySmallDuration() public {
        vm.startPrank(employer);
        gainjar.deposit(100 * 1e6);

        gainjar.createFiniteStream(employee, 5, 2);
        vm.stopPrank();

        (uint256 rate,,, uint256 total,,,,,,) = gainjar.getStreamInfo(employer, employee);

        assertEq(rate, 2);
        assertEq(total, 5);

        vm.warp(block.timestamp + 2);
        vm.prank(employee);
        gainjar.withdraw(employer);

        assertEq(mockToken.balanceOf(employee), 5);
    }

    function test_CreateFiniteStream_WithLargeDuration() public {
        uint256 total = 36500 * 1e6; // 365 days worth
        uint256 duration = 365 days;
        uint256 ratePerSecond = total / duration;
        uint256 minVault = ratePerSecond * MIN_COVERAGE_DAYS;

        vm.prank(employer);
        gainjar.deposit(minVault);

        vm.prank(employer);
        gainjar.createFiniteStream(employee, total, duration);

        (uint256 rate, uint256 startTime, uint256 endTime, uint256 streamTotal,,,,, bool isActive,) =
            gainjar.getStreamInfo(employer, employee);

        assertEq(rate, ratePerSecond, "rate correct");
        assertEq(endTime, startTime + duration, "endTime correct");
        assertEq(streamTotal, total, "totalAmount correct");
        assertTrue(isActive, "stream active");
    }

    function test_RevertWhen_CreateStream_VaultInCritical() public {
        // Setup vault in CRITICAL state - need to drain more
        vm.prank(employer);
        gainjar.deposit(800 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        // Drain to CRITICAL (need 7 days of withdrawals to get there)
        vm.warp(block.timestamp + 5 days);
        vm.prank(employee);
        gainjar.withdraw(employer);

        // Verify CRITICAL status
        GainJar.VaultStatus status = gainjar.getVaultStatus(employer);
        assertTrue(
            status == GainJar.VaultStatus.CRITICAL || status == GainJar.VaultStatus.EMERGENCY,
            "vault should be in CRITICAL or EMERGENCY state"
        );

        // Try to create new stream - should fail
        vm.prank(employer);
        vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__InsufficientEmployerVault.selector, employer));
        gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);
    }

    function test_RevertWhen_CreateStream_VaultInEmergency() public {
        // Setup vault in EMERGENCY state
        _setupEmployerInEmergency();

        // Try to create new stream - should fail
        vm.prank(employer);
        vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__InsufficientEmployerVault.selector, employer));
        gainjar.createInfiniteStream(employee2, 10 * 1e6, 1 days);
    }

    function test_CreateStream_WhenVaultInWarning() public {
        // Setup vault in WARNING state but with capacity
        vm.prank(employer);
        gainjar.deposit(1400 * 1e6); // Enough for 2 streams

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        // Verify WARNING status
        GainJar.VaultStatus status = gainjar.getVaultStatus(employer);
        assertTrue(status == GainJar.VaultStatus.WARNING, "vault should be in WARNING state");

        // Should be able to create another stream (has capacity)
        vm.prank(employer);
        gainjar.createInfiniteStream(employee2, 100 * 1e6, 1 days);

        (,,,,,,,, bool isActive1,) = gainjar.getStreamInfo(employer, employee);
        (,,,,,,,, bool isActive2,) = gainjar.getStreamInfo(employer, employee2);

        assertTrue(isActive1, "first stream active");
        assertTrue(isActive2, "second stream active");
    }

    function test_CreateStreamEmployeeMultipleEmployers() public {
        address employer2 = makeAddr("employer2");
        mockToken.mint(employer2, INITIAL_MINT);

        vm.prank(employer2);
        mockToken.approve(address(gainjar), type(uint256).max);

        uint256 rate = 100 * 1e6;
        uint256 minVault = (rate / 1 days) * MIN_COVERAGE_DAYS;

        // Employer 1 creates stream for employee
        vm.prank(employer);
        gainjar.deposit(minVault);
        vm.prank(employer);
        gainjar.createInfiniteStream(employee, rate, 1 days);

        // Employer 2 creates stream for SAME employee
        vm.prank(employer2);
        gainjar.deposit(minVault);
        vm.prank(employer2);
        gainjar.createInfiniteStream(employee, rate, 1 days);

        // Both streams should be independent
        (uint256 rate1,,,,,,,, bool active1,) = gainjar.getStreamInfo(employer, employee);
        (uint256 rate2,,,,,,,, bool active2,) = gainjar.getStreamInfo(employer2, employee);

        assertEq(rate1, rate / 1 days, "employer1 stream rate correct");
        assertEq(rate2, rate / 1 days, "employer2 stream rate correct");
        assertTrue(active1, "employer1 stream active");
        assertTrue(active2, "employer2 stream active");
    }

    function test_UpdateInfiniteRate_ToVerySmallRate() public {
        vm.prank(employer);
        gainjar.deposit(14000 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        vm.warp(block.timestamp + 1 hours);

        // Update to minimum rate (1 wei per second)
        vm.prank(employer);
        gainjar.updateInfiniteRate(employee, 1, 1 seconds);

        (uint256 newRate,,,,,,,,,) = gainjar.getStreamInfo(employer, employee);
        assertEq(newRate, 1, "rate updated to minimum");
    }

    function test_UpdateInfiniteRate_ToVeryLargeRate() public {
        vm.prank(employer);
        gainjar.deposit(1400 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        vm.warp(block.timestamp + 1 hours);

        // Try to update to very large rate - should fail (insufficient vault)
        vm.prank(employer);
        vm.expectRevert(abi.encodeWithSelector(GainJar.GainJar__InsufficientEmployerVault.selector, employer));
        gainjar.updateInfiniteRate(employee, 1000 * 1e6, 1 days);
    }

    function test_UpdateInfiniteRate_ProcessesWithdrawalFirst() public {
        vm.prank(employer);
        gainjar.deposit(14000 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        // Wait for earnings
        vm.warp(block.timestamp + 1 days);

        uint256 earnedBefore = gainjar.withdrawable(employer, employee);
        assertGt(earnedBefore, 0, "has earnings");

        // Update rate
        vm.prank(employer);
        gainjar.updateInfiniteRate(employee, 200 * 1e6, 1 days);

        // Earnings should be zeroed (processed)
        uint256 earnedAfter = gainjar.withdrawable(employer, employee);
        assertEq(earnedAfter, 0, "earnings reset after update");

        // Check totalWithdrawn increased
        (,,,,,, uint256 totalWithdrawn,,,) = gainjar.getStreamInfo(employer, employee);
        assertEq(totalWithdrawn, earnedBefore, "earnings moved to totalWithdrawn");
    }

    function test_UpdateInfiniteRate_MultipleRateChanges() public {
        vm.prank(employer);
        gainjar.deposit(30000 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        // First rate change after 1 day
        vm.warp(block.timestamp + 1 days);
        uint256 earned1 = gainjar.withdrawable(employer, employee);

        vm.prank(employer);
        gainjar.updateInfiniteRate(employee, 200 * 1e6, 1 days);

        // Second rate change after 1 day
        vm.warp(block.timestamp + 1 days);
        uint256 earned2 = gainjar.withdrawable(employer, employee);

        vm.prank(employer);
        gainjar.updateInfiniteRate(employee, 300 * 1e6, 1 days);

        // Third rate change after 1 day
        vm.warp(block.timestamp + 1 days);
        uint256 earned3 = gainjar.withdrawable(employer, employee);

        // Verify earnings progression: 100e6 -> 200e6 -> 300e6
        // Allow small rounding error (within 1%)
        assertApproxEqAbs(earned1, 100 * 1e6, 1 * 1e6, "first period at 100e6");
        assertApproxEqAbs(earned2, 200 * 1e6, 2 * 1e6, "second period at 200e6");
        assertApproxEqAbs(earned3, 300 * 1e6, 3 * 1e6, "third period at 300e6");
    }

    function test_ExtendFiniteStream_WhenAlmostExpired() public {
        uint256 total = 100 * 1e6;
        uint256 duration = 30 days;
        uint256 minVault = (total / duration) * MIN_COVERAGE_DAYS;

        vm.prank(employer);
        gainjar.deposit(minVault + 500 * 1e6);

        vm.prank(employer);
        gainjar.createFiniteStream(employee, total, duration);

        // Warp to day 29 (almost expired)
        vm.warp(block.timestamp + 29 days);

        // Extend
        vm.prank(employer);
        gainjar.extendFiniteStream(employee, 100 * 1e6, 30 days);

        (,, uint256 newEndTime, uint256 newTotal,,,,,,) = gainjar.getStreamInfo(employer, employee);

        assertTrue(newEndTime > block.timestamp, "new end time in future");
        assertEq(newTotal, total + 100 * 1e6, "total extended correctly");
    }

    function test_ExtendFiniteStream_MultipleExtensions() public {
        uint256 initial = 100 * 1e6;
        uint256 duration = 10 days;
        uint256 minVault = (initial / duration) * MIN_COVERAGE_DAYS;

        vm.prank(employer);
        gainjar.deposit(minVault + 1000 * 1e6);

        vm.prank(employer);
        gainjar.createFiniteStream(employee, initial, duration);

        uint256 expectedTotal = initial;

        // First extension
        vm.warp(block.timestamp + 5 days);
        vm.prank(employer);
        gainjar.extendFiniteStream(employee, 100 * 1e6, 10 days);
        expectedTotal += 100 * 1e6;

        (,,, uint256 total1,,,,,,) = gainjar.getStreamInfo(employer, employee);
        assertEq(total1, expectedTotal, "first extension correct");

        // Second extension
        vm.warp(block.timestamp + 5 days);
        vm.prank(employer);
        gainjar.extendFiniteStream(employee, 100 * 1e6, 10 days);
        expectedTotal += 100 * 1e6;

        (,,, uint256 total2,,,,,,) = gainjar.getStreamInfo(employer, employee);
        assertEq(total2, expectedTotal, "second extension correct");

        // Third extension
        vm.warp(block.timestamp + 5 days);
        vm.prank(employer);
        gainjar.extendFiniteStream(employee, 100 * 1e6, 10 days);
        expectedTotal += 100 * 1e6;

        (,,, uint256 total3,,,,,,) = gainjar.getStreamInfo(employer, employee);
        assertEq(total3, expectedTotal, "third extension correct");
    }

    function test_ActivateStream_FailsWhenStreamAlreadyActive() public {
        vm.prank(employer);
        gainjar.deposit(700 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        // Try to activate stream that's already active - should fail
        vm.prank(employer);
        vm.expectRevert(GainJar.GainJar__StreamAlreadyActive.selector);
        gainjar.activateStream(employee);
    }

    function test_ActivateStream_MultipleTimesWithoutPause() public {
        vm.prank(employer);
        gainjar.deposit(700 * 1e6);

        vm.prank(employer);
        gainjar.createInfiniteStream(employee, 100 * 1e6, 1 days);

        // Try to activate stream that's already active - should fail
        vm.prank(employer);
        vm.expectRevert(GainJar.GainJar__StreamAlreadyActive.selector);
        gainjar.activateStream(employee);
    }

    // ============== createFiniteStreamDays ==============

    function test_CreateFiniteStreamDays_Success() public {
        uint256 depositAmount = 700 * 1e6;
        uint256 streamAmount = 100 * 1e6;
        uint256 period = 7;

        vm.startPrank(employer);
        gainjar.deposit(depositAmount);

        gainjar.createFiniteStreamDays(employee, streamAmount, period);
        vm.stopPrank();

        (uint256 rate, uint256 startTime, uint256 endTime, uint256 total,,,,, bool isActive,) =
            gainjar.getStreamInfo(employer, employee);

        assertEq(rate, streamAmount / (period * 1 days), "rate");
        assertEq(endTime, startTime + period * 1 days, "endTime");
        assertEq(total, streamAmount, "totalAmount");
        assertTrue(isActive, "active");
    }

    // ============== createHourlyStream ==============

    function test_CreateHourlyStream_Success() public {
        uint256 depositAmount = 10000 * 1e6;
        uint256 hourlyRate = 20e6;

        vm.startPrank(employer);
        gainjar.deposit(depositAmount);

        gainjar.createHourlyStream(employee, hourlyRate);
        vm.stopPrank();

        (uint256 rate,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);

        assertEq(rate, hourlyRate / 1 hours, "rate");
        assertTrue(isActive, "active");
    }

    // ============== createMonthlyStream ==============

    function test_CreateMonthlyStream_Success() public {
        uint256 depositAmount = 700 * 1e6;
        uint256 monthlyRate = 100e6;

        vm.startPrank(employer);
        gainjar.deposit(depositAmount);

        gainjar.createMonthlyStream(employee, monthlyRate);
        vm.stopPrank();

        (uint256 rate,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);

        assertEq(rate, monthlyRate / 30 days, "rate");
        assertTrue(isActive, "active");
    }

    // ============== updateInfiniteRate ==============

    function test_UpdateInfiniteRate_Success() public {
        vm.prank(employer);
        gainjar.deposit(14000 * 1e6);
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

    function test_RevertWhen_ExtendFiniteStream_StreamNotActive() public {
        vm.prank(employer);
        gainjar.deposit(1000 * 1e6);
        vm.prank(employer);
        vm.expectRevert(GainJar.GainJar__StreamNotActive.selector);
        gainjar.extendFiniteStream(employee, 100 * 1e6, 7 days);
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

        vm.warp(block.timestamp + 1); // make sure time has passed some seccond

        vm.prank(employer);
        gainjar.pauseStream(employee);

        (,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
        assertFalse(isActive, "paused");
    }

    function test_PauseStream_ThenReactivate_Sucess() public {
        vm.startPrank(employer);
        gainjar.deposit(800e6);
        gainjar.createInfiniteStream(employee, 100e6, 1 days);

        vm.warp(block.timestamp + 1 days);

        gainjar.pauseStream(employee);

        (,,,,,,,, bool isActive,) = gainjar.getStreamInfo(employer, employee);
        assertFalse(isActive, "paused");

        gainjar.activateStream(employee);

        (,,,,,,,, bool isActiveAfter,) = gainjar.getStreamInfo(employer, employee);
        assertTrue(isActiveAfter, "active");
        vm.stopPrank();
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

        vm.warp(block.timestamp + 1); // make sure time has passed some seccond

        vm.prank(employer);
        gainjar.pauseStream(employee);
        vm.prank(employer);
        vm.expectRevert(GainJar.GainJar__StreamNotActive.selector);
        gainjar.pauseStream(employee);
    }
}
