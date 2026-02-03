// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { BaseTest } from "../BaseTest.t.sol";
import { GainJar } from "../../contracts/GainJar.sol";

/**
 * Unit tests for SetUp / initial state of GainJar.
 */
contract GainJarSetupTest is BaseTest {
  function setUp() public {
    baseTestSetUp();
  }

  function test_SetUpState() public view {
    assertEq(gainjar.getFeeBasisPoints(), 5, "feeBasisPoints");
    assertEq(gainjar.getAccumulatedFees(), 0, "accumulatedFees");
    assertEq(gainjar.owner(), owner, "owner");
    assertEq(mockToken.balanceOf(employer), INITIAL_MINT, "employer balance");
  }
}
