// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { console } from "forge-std/console.sol";
import { GainJar } from "../../contracts/GainJar.sol";
import { MockERC20 } from "../../contracts/mock/MockERC20.sol";

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
