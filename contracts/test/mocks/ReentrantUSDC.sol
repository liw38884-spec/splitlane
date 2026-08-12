// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockUSDC} from "../../src/mocks/MockUSDC.sol";

contract ReentrantUSDC is MockUSDC {
    address public reentryTarget;
    bytes public reentryCall;
    bool public attackEnabled;
    bool public lastReentrySucceeded;
    bytes4 public lastReentrySelector;

    function configureReentry(address target, bytes calldata callData) external {
        reentryTarget = target;
        reentryCall = callData;
        attackEnabled = true;
        lastReentrySucceeded = false;
        lastReentrySelector = bytes4(0);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (attackEnabled) {
            attackEnabled = false;
            (bool succeeded, bytes memory returnData) = reentryTarget.call(reentryCall);
            lastReentrySucceeded = succeeded;
            if (returnData.length >= 4) {
                bytes4 selector;
                assembly ("memory-safe") {
                    selector := mload(add(returnData, 32))
                }
                lastReentrySelector = selector;
            }
        }

        return super.transferFrom(from, to, amount);
    }
}
