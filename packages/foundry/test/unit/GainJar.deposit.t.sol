// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { GainJar } from "../../contracts/GainJar.sol";
import { MockERC20 } from "../../contracts/mock/MockERC20.sol";

/**
 * Unit tests for Deposit domain GainJar.sol.
 */
contract GainJarDepositTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
  }

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
}
