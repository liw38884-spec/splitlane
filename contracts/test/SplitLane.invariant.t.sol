// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {SplitLane} from "../src/SplitLane.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

contract SplitLaneHandler is Test {
    uint256 public constant TAB_ID = 1;

    SplitLane public immutable splitLane;
    address public immutable recipient;

    address[] private _participants;
    uint256 public paidTotal;

    constructor(SplitLane splitLane_, address recipient_, address[] memory participants_) {
        splitLane = splitLane_;
        recipient = recipient_;
        _participants = participants_;
    }

    function pay(uint256 participantSeed) external {
        (,,,,, SplitLane.TabStatus status,,) = splitLane.getTab(TAB_ID);
        if (status != SplitLane.TabStatus.Open) return;

        address participant = _participants[participantSeed % _participants.length];
        (uint256 amount, bool paid) = splitLane.getShare(TAB_ID, participant);
        if (paid) return;

        vm.prank(participant);
        splitLane.payShare(TAB_ID);
        paidTotal += amount;
    }

    function close() external {
        (,,,,, SplitLane.TabStatus status,,) = splitLane.getTab(TAB_ID);
        if (status != SplitLane.TabStatus.Open) return;

        vm.prank(recipient);
        splitLane.closeTab(TAB_ID);
    }

    function participants() external view returns (address[] memory) {
        return _participants;
    }
}

contract SplitLaneInvariantTest is StdInvariant, Test {
    uint256 private constant USDC = 1e6;

    MockUSDC private token;
    SplitLane private splitLane;
    SplitLaneHandler private handler;

    address private recipient = makeAddr("invariant-recipient");
    address[] private participants;

    function setUp() public {
        token = new MockUSDC();
        splitLane = new SplitLane(address(token));

        participants = new address[](3);
        participants[0] = makeAddr("invariant-alice");
        participants[1] = makeAddr("invariant-bob");
        participants[2] = makeAddr("invariant-carol");
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 6 * USDC;
        amounts[1] = 7 * USDC;
        amounts[2] = 8 * USDC;

        vm.prank(recipient);
        splitLane.createTab("Invariant tab", keccak256("invariant-metadata"), participants, amounts);

        for (uint256 i; i < participants.length; ++i) {
            token.mint(participants[i], amounts[i]);
            vm.prank(participants[i]);
            token.approve(address(splitLane), amounts[i]);
        }

        handler = new SplitLaneHandler(splitLane, recipient, participants);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = SplitLaneHandler.pay.selector;
        selectors[1] = SplitLaneHandler.close.selector;
        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariant_TotalAlwaysEqualsPaidPlusRemaining() public view {
        (,,,,,, uint256 totalAmount, uint256 remainingAmount) = splitLane.getTab(1);
        uint256 paidAmount;
        for (uint256 i; i < participants.length; ++i) {
            (uint256 amount, bool paid) = splitLane.getShare(1, participants[i]);
            if (paid) paidAmount += amount;
        }

        assertEq(totalAmount, paidAmount + remainingAmount);
        assertLe(remainingAmount, totalAmount);
        assertEq(paidAmount, handler.paidTotal());
    }

    function invariant_StatusMatchesRemainingAmount() public view {
        (,,,,, SplitLane.TabStatus status,, uint256 remainingAmount) = splitLane.getTab(1);
        if (status == SplitLane.TabStatus.Settled) {
            assertEq(remainingAmount, 0);
        } else {
            assertGt(remainingAmount, 0);
        }
    }

    function invariant_NoUSDCIsEverRetained() public view {
        assertEq(token.balanceOf(address(splitLane)), 0);
        assertEq(token.balanceOf(recipient), handler.paidTotal());
    }
}
