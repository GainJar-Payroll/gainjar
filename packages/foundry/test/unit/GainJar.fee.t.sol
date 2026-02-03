// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { GainJar } from "../../contracts/GainJar.sol";
import { MockERC20 } from "../../contracts/mock/MockERC20.sol";

/**
 * Unit tests for Fee domain on GainJar.sol.
 */
contract GainJarFeeTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
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
    vm.expectEmit(true, true, true, true);
    emit GainJar.FeeClaimed(owner, accumulated);
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
}
