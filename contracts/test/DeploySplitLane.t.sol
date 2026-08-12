// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeploySplitLane} from "../script/DeploySplitLane.s.sol";

contract DeploySplitLaneTest is Test {
    DeploySplitLane private deploymentScript;

    function setUp() public {
        deploymentScript = new DeploySplitLane();
    }

    function test_ExpectedUSDCForBaseSepolia() public view {
        assertEq(
            deploymentScript.expectedUSDC(deploymentScript.BASE_SEPOLIA_CHAIN_ID()),
            deploymentScript.BASE_SEPOLIA_USDC()
        );
    }

    function test_ExpectedUSDCForEthereumSepolia() public view {
        assertEq(
            deploymentScript.expectedUSDC(deploymentScript.ETHEREUM_SEPOLIA_CHAIN_ID()),
            deploymentScript.ETHEREUM_SEPOLIA_USDC()
        );
    }

    function test_RejectsUnsupportedDeploymentChain() public {
        uint256 unsupportedChainId = 1;
        vm.expectRevert(abi.encodeWithSelector(DeploySplitLane.UnsupportedDeploymentChain.selector, unsupportedChainId));
        deploymentScript.expectedUSDC(unsupportedChainId);
    }

    function test_ValidateDeploymentRejectsWrongUSDCForSupportedChain() public {
        uint256 chainId = deploymentScript.BASE_SEPOLIA_CHAIN_ID();
        address wrongUSDC = deploymentScript.ETHEREUM_SEPOLIA_USDC();
        address expectedUSDC = deploymentScript.BASE_SEPOLIA_USDC();

        vm.expectRevert(
            abi.encodeWithSelector(DeploySplitLane.UnexpectedUSDC.selector, chainId, wrongUSDC, expectedUSDC)
        );
        deploymentScript.validateDeployment(chainId, wrongUSDC, address(this));
    }

    function test_ValidateDeploymentRejectsZeroDeployer() public {
        uint256 chainId = deploymentScript.BASE_SEPOLIA_CHAIN_ID();
        address expectedUSDC = deploymentScript.BASE_SEPOLIA_USDC();

        vm.expectRevert(DeploySplitLane.InvalidDeployer.selector);
        deploymentScript.validateDeployment(chainId, expectedUSDC, address(0));
    }
}
