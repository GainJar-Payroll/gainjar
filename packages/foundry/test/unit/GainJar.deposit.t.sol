// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {BaseTest} from "../BaseTest.t.sol";
import {GainJar} from "../../contracts/GainJar.sol";
import {MockERC20} from "../../contracts/mock/MockERC20.sol";

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

    function test_Deposit_MultipleDepositAccumulates() public {
        uint256 amount = 1_000 * 1e6;
        uint256 depositTime = 3;

        uint256 balance;

        vm.startPrank(employer);
        gainjar.deposit(amount / depositTime);

        (balance,,,,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(balance, amount / depositTime);

        gainjar.deposit(amount / depositTime);

        (balance,,,,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(balance, (amount / depositTime) * 2);

        gainjar.deposit(amount / depositTime);

        (balance,,,,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(balance, (amount / depositTime) * 3);

        vm.stopPrank();
    }

    function test_Deposit_LargeAmount() public {
        // Deposit uint256.max
        uint256 depositAmount = type(uint256).max;

        // INITIAL_MINT defined in BaseTest.sol
        mockToken.mint(employer, depositAmount - INITIAL_MINT);

        vm.prank(employer);
        mockToken.approve(address(gainjar), depositAmount);

        vm.prank(employer);
        gainjar.deposit(depositAmount);

        (uint256 balance,,,,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(balance, depositAmount);
    }

    function test_Deposit_MinimalAmount() public {
        // Deposit uint256.max
        uint256 depositAmount = 1;

        vm.prank(employer);
        gainjar.deposit(depositAmount);

        (uint256 balance,,,,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(balance, depositAmount);
    }

    function test_Deposit_RecoveryFromEmergency() public {
        GainJar.VaultStatus status;

        _setupEmployerInEmergency();

        (,,, status,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(uint256(status), uint256(GainJar.VaultStatus.EMERGENCY));

        uint256 minDeposit = gainjar.getMinRequiredVaultBalance(employer);

        vm.prank(employer);
        gainjar.deposit(minDeposit);

        (,,, status,,) = gainjar.getVaultHealth(employer);

        vm.assertEq(uint256(status), uint256(GainJar.VaultStatus.WARNING));
    }
}
