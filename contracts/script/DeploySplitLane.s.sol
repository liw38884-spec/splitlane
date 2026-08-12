// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {SplitLane} from "../src/SplitLane.sol";

contract DeploySplitLane is Script {
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84_532;
    uint256 public constant ETHEREUM_SEPOLIA_CHAIN_ID = 11_155_111;

    address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address public constant ETHEREUM_SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    error UnsupportedDeploymentChain(uint256 chainId);
    error UnexpectedUSDC(uint256 chainId, address supplied, address expected);
    error InvalidDeployer();

    /// @dev Forge's --account option supplies the encrypted signer for DEPLOYER_ADDRESS.
    function run() external returns (SplitLane deployment) {
        address suppliedUSDC = vm.envAddress("USDC_ADDRESS");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        validateDeployment(block.chainid, suppliedUSDC, deployer);

        vm.startBroadcast(deployer);
        deployment = new SplitLane(suppliedUSDC);
        vm.stopBroadcast();
    }

    function expectedUSDC(uint256 chainId) public pure returns (address) {
        if (chainId == BASE_SEPOLIA_CHAIN_ID) return BASE_SEPOLIA_USDC;
        if (chainId == ETHEREUM_SEPOLIA_CHAIN_ID) return ETHEREUM_SEPOLIA_USDC;
        revert UnsupportedDeploymentChain(chainId);
    }

    function validateDeployment(uint256 chainId, address suppliedUSDC, address deployer)
        public
        pure
        returns (address expected)
    {
        expected = expectedUSDC(chainId);
        if (suppliedUSDC != expected) revert UnexpectedUSDC(chainId, suppliedUSDC, expected);
        if (deployer == address(0)) revert InvalidDeployer();
    }
}
