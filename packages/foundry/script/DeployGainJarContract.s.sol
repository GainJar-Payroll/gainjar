// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Config } from "forge-std/Config.sol";

import "./DeployHelpers.s.sol";
import { GainJar } from "../contracts/GainJar.sol";
import { MockERC20 } from "../contracts/mock/MockERC20.sol";

/**
 * @notice Deploy script for YourContract contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * bun deploy --file DeployYourContract.s.sol  # local anvil chain
 * bun deploy --file DeployYourContract.s.sol --network optimism # live network (requires keystore)
 */
contract DeployGainJarContract is ScaffoldETHDeploy, Config {
  /**
   * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
   *      - "scaffold-eth-default": Uses Anvil's account #9 (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720), no password prompt
   *      - "scaffold-eth-custom": requires password used while creating keystore
   *
   * Note: Must use ScaffoldEthDeployerRunner modifier to:
   *      - Setup correct `deployer` account and fund it
   *      - Export contract addresses & ABIs to `nextjs` packages
   */
  function run() external {
    deployContract();
  }

  function deployContract() public returns (GainJar) {
    _loadConfig("./config/deployments.toml", true);

    uint256 chainId = block.chainid;
    console.log("Deploying to chain:", chainId);

    address usdc = config.get("usdc").toAddress();
    bool withUSDCMock = config.get("with_usdc_mock").toBool();

    if (withUSDCMock) {
      vm.broadcast();
      usdc = address(new MockERC20("USDC Mock", "USDC"));
    }

    GainJar gainjar = _deploy(usdc);

    config.set("gainjar", address(gainjar));

    return gainjar;
  }

  function _deploy(address _usdcAddress) internal ScaffoldEthDeployerRunner returns (GainJar) {
    GainJar gainjar = new GainJar(_usdcAddress);
    return gainjar;
  }
}
