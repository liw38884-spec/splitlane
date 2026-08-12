// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20ReturnFalseMock} from "@openzeppelin/contracts/mocks/token/ERC20ReturnFalseMock.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SplitLane} from "../src/SplitLane.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {ReentrantUSDC} from "./mocks/ReentrantUSDC.sol";

contract FalseUSDC is ERC20ReturnFalseMock {
    constructor() ERC20("False USD Coin", "fUSDC") {}
}

contract SplitLaneTest is Test {
    uint256 private constant USDC = 1e6;

    MockUSDC private token;
    SplitLane private splitLane;

    address private recipient = makeAddr("recipient");
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");
    bytes32 private metadataHash = keccak256("ipfs://splitlane/tab-1");

    function setUp() public {
        vm.warp(1_800_000_000);
        token = new MockUSDC();
        splitLane = new SplitLane(address(token));
    }

    function test_ConstructorSetsImmutableUSDC() public view {
        assertEq(address(splitLane.USDC()), address(token));
        assertEq(splitLane.nextTabId(), 1);
    }

    function test_ConstructorRejectsZeroAddressAndEOA() public {
        vm.expectRevert(abi.encodeWithSelector(SplitLane.InvalidUSDC.selector, address(0)));
        new SplitLane(address(0));

        vm.expectRevert(abi.encodeWithSelector(SplitLane.InvalidUSDC.selector, alice));
        new SplitLane(alice);
    }

    function test_CreateTabStoresImmutableDetailsAndEmitsReconstructableEvent() public {
        (address[] memory participants, uint256[] memory amounts) = _twoShares();

        vm.expectEmit(true, true, false, true, address(splitLane));
        emit SplitLane.TabCreated(
            1, recipient, "Dinner", metadataHash, 25 * USDC, block.timestamp, participants, amounts
        );
        vm.prank(recipient);
        uint256 tabId = splitLane.createTab("Dinner", metadataHash, participants, amounts);

        assertEq(tabId, 1);
        assertEq(splitLane.nextTabId(), 2);

        (
            address storedRecipient,
            string memory title,
            bytes32 storedMetadataHash,
            uint256 createdAt,
            uint256 closedAt,
            SplitLane.TabStatus status,
            uint256 totalAmount,
            uint256 remainingAmount
        ) = splitLane.getTab(tabId);

        assertEq(storedRecipient, recipient);
        assertEq(title, "Dinner");
        assertEq(storedMetadataHash, metadataHash);
        assertEq(createdAt, block.timestamp);
        assertEq(closedAt, 0);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Open));
        assertEq(totalAmount, 25 * USDC);
        assertEq(remainingAmount, totalAmount);
        assertEq(splitLane.getParticipants(tabId), participants);

        (uint256 aliceAmount, bool alicePaid) = splitLane.getShare(tabId, alice);
        (uint256 bobAmount, bool bobPaid) = splitLane.getShare(tabId, bob);
        assertEq(aliceAmount, 10 * USDC);
        assertEq(bobAmount, 15 * USDC);
        assertFalse(alicePaid);
        assertFalse(bobPaid);
    }

    function test_CreateTabAcceptsMaximumParticipantCount() public {
        address[] memory participants = new address[](20);
        uint256[] memory amounts = new uint256[](20);
        for (uint256 i; i < 20; ++i) {
            participants[i] = vm.addr(100 + i);
            amounts[i] = i + 1;
        }

        vm.prank(recipient);
        uint256 tabId = splitLane.createTab("Maximum group", bytes32(0), participants, amounts);

        (,,,,,, uint256 totalAmount, uint256 remainingAmount) = splitLane.getTab(tabId);
        assertEq(totalAmount, 210);
        assertEq(remainingAmount, totalAmount);
        assertEq(splitLane.getParticipants(tabId).length, 20);
    }

    function test_CreateTabRejectsEmptyAndOversizedTitles() public {
        (address[] memory participants, uint256[] memory amounts) = _singleShare(alice, USDC);

        vm.expectRevert(SplitLane.EmptyTitle.selector);
        vm.prank(recipient);
        splitLane.createTab("", metadataHash, participants, amounts);

        string memory oversizedTitle = string(new bytes(splitLane.MAX_TITLE_BYTES() + 1));
        vm.expectRevert(
            abi.encodeWithSelector(
                SplitLane.TitleTooLong.selector, splitLane.MAX_TITLE_BYTES() + 1, splitLane.MAX_TITLE_BYTES()
            )
        );
        vm.prank(recipient);
        splitLane.createTab(oversizedTitle, metadataHash, participants, amounts);
    }

    function test_CreateTabRejectsInvalidParticipantCounts() public {
        address[] memory noParticipants = new address[](0);
        uint256[] memory noAmounts = new uint256[](0);
        vm.expectRevert(abi.encodeWithSelector(SplitLane.InvalidParticipantCount.selector, 0));
        vm.prank(recipient);
        splitLane.createTab("Empty group", metadataHash, noParticipants, noAmounts);

        address[] memory tooManyParticipants = new address[](21);
        uint256[] memory tooManyAmounts = new uint256[](21);
        for (uint256 i; i < 21; ++i) {
            tooManyParticipants[i] = vm.addr(i + 1);
            tooManyAmounts[i] = USDC;
        }
        vm.expectRevert(abi.encodeWithSelector(SplitLane.InvalidParticipantCount.selector, 21));
        vm.prank(recipient);
        splitLane.createTab("Too many", metadataHash, tooManyParticipants, tooManyAmounts);
    }

    function test_CreateTabRejectsMismatchedArrays() public {
        address[] memory participants = new address[](1);
        participants[0] = alice;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = USDC;
        amounts[1] = USDC;

        vm.expectRevert(abi.encodeWithSelector(SplitLane.ArrayLengthMismatch.selector, 1, 2));
        vm.prank(recipient);
        splitLane.createTab("Mismatch", metadataHash, participants, amounts);
    }

    function test_CreateTabRejectsZeroAddressZeroShareAndDuplicateParticipant() public {
        (address[] memory participants, uint256[] memory amounts) = _singleShare(address(0), USDC);
        vm.expectRevert(abi.encodeWithSelector(SplitLane.InvalidParticipant.selector, address(0)));
        vm.prank(recipient);
        splitLane.createTab("Zero address", metadataHash, participants, amounts);

        participants[0] = alice;
        amounts[0] = 0;
        vm.expectRevert(abi.encodeWithSelector(SplitLane.InvalidShare.selector, alice));
        vm.prank(recipient);
        splitLane.createTab("Zero share", metadataHash, participants, amounts);

        participants = new address[](2);
        participants[0] = alice;
        participants[1] = alice;
        amounts = new uint256[](2);
        amounts[0] = USDC;
        amounts[1] = 2 * USDC;
        vm.expectRevert(abi.encodeWithSelector(SplitLane.DuplicateParticipant.selector, alice));
        vm.prank(recipient);
        splitLane.createTab("Duplicate", metadataHash, participants, amounts);
    }

    function test_CreateTabRejectsRecipientAsParticipant() public {
        (address[] memory participants, uint256[] memory amounts) = _singleShare(recipient, USDC);

        vm.expectRevert(abi.encodeWithSelector(SplitLane.RecipientCannotBeParticipant.selector, recipient));
        vm.prank(recipient);
        splitLane.createTab("Self payment", metadataHash, participants, amounts);
    }

    function test_PayShareTransfersExactlyToRecipientAndRetainsNothing() public {
        uint256 amount = 7_250_000;
        uint256 tabId = _createSingleShare(alice, amount);
        token.mint(alice, amount);

        vm.prank(alice);
        token.approve(address(splitLane), amount);

        vm.expectEmit(true, true, true, true, address(splitLane));
        emit SplitLane.SharePaid(tabId, alice, recipient, amount, block.timestamp);
        vm.prank(alice);
        splitLane.payShare(tabId);

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(recipient), amount);
        assertEq(token.balanceOf(address(splitLane)), 0);
        assertEq(token.allowance(alice, address(splitLane)), 0);

        (uint256 storedAmount, bool paid) = splitLane.getShare(tabId, alice);
        (,,,, uint256 closedAt, SplitLane.TabStatus status,, uint256 remainingAmount) = splitLane.getTab(tabId);
        assertEq(storedAmount, amount);
        assertTrue(paid);
        assertEq(closedAt, block.timestamp);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Settled));
        assertEq(remainingAmount, 0);
    }

    function test_PayShareRejectsUnassignedCallerAndRepeatPayment() public {
        uint256 tabId = _createSingleShare(alice, USDC);

        vm.expectRevert(abi.encodeWithSelector(SplitLane.NotParticipant.selector, tabId, bob));
        vm.prank(bob);
        splitLane.payShare(tabId);

        token.mint(alice, USDC);
        vm.prank(alice);
        token.approve(address(splitLane), USDC);
        vm.prank(alice);
        splitLane.payShare(tabId);

        vm.expectRevert(abi.encodeWithSelector(SplitLane.TabNotOpen.selector, tabId, SplitLane.TabStatus.Settled));
        vm.prank(alice);
        splitLane.payShare(tabId);
    }

    function test_PayShareRejectsPaidParticipantWhileOtherSharesRemainOpen() public {
        (address[] memory participants, uint256[] memory amounts) = _twoShares();
        vm.prank(recipient);
        uint256 tabId = splitLane.createTab("Repeat payment", metadataHash, participants, amounts);

        token.mint(alice, 2 * amounts[0]);
        vm.prank(alice);
        token.approve(address(splitLane), 2 * amounts[0]);
        vm.prank(alice);
        splitLane.payShare(tabId);

        vm.expectRevert(abi.encodeWithSelector(SplitLane.ShareAlreadyPaid.selector, tabId, alice));
        vm.prank(alice);
        splitLane.payShare(tabId);

        assertEq(token.balanceOf(recipient), amounts[0]);
        assertEq(token.balanceOf(address(splitLane)), 0);
        (,,,,, SplitLane.TabStatus status,, uint256 remainingAmount) = splitLane.getTab(tabId);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Open));
        assertEq(remainingAmount, amounts[1]);
    }

    function test_PayShareFailedTransferRollsBackAccounting() public {
        uint256 tabId = _createSingleShare(alice, 3 * USDC);
        token.mint(alice, 3 * USDC);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(splitLane), 0, 3 * USDC)
        );
        vm.prank(alice);
        splitLane.payShare(tabId);

        (, bool paid) = splitLane.getShare(tabId, alice);
        (,,,,, SplitLane.TabStatus status,, uint256 remainingAmount) = splitLane.getTab(tabId);
        assertFalse(paid);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Open));
        assertEq(remainingAmount, 3 * USDC);
        assertEq(token.balanceOf(address(splitLane)), 0);
    }

    function test_PayShareRejectsTokenReturningFalseAndRollsBackAccounting() public {
        FalseUSDC falseToken = new FalseUSDC();
        SplitLane falseLane = new SplitLane(address(falseToken));
        (address[] memory participants, uint256[] memory amounts) = _singleShare(alice, USDC);

        vm.prank(recipient);
        uint256 tabId = falseLane.createTab("False return", metadataHash, participants, amounts);

        vm.expectRevert(abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, address(falseToken)));
        vm.prank(alice);
        falseLane.payShare(tabId);

        (, bool paid) = falseLane.getShare(tabId, alice);
        (,,,,, SplitLane.TabStatus status,, uint256 remainingAmount) = falseLane.getTab(tabId);
        assertFalse(paid);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Open));
        assertEq(remainingAmount, USDC);
    }

    function test_CloseTabPreservesPaidTransferAndRecordsUnpaidAmount() public {
        (address[] memory participants, uint256[] memory amounts) = _twoShares();
        vm.prank(recipient);
        uint256 tabId = splitLane.createTab("Close flow", metadataHash, participants, amounts);

        token.mint(alice, amounts[0]);
        vm.prank(alice);
        token.approve(address(splitLane), amounts[0]);
        vm.prank(alice);
        splitLane.payShare(tabId);

        vm.warp(block.timestamp + 1 days);
        vm.expectEmit(true, true, false, true, address(splitLane));
        emit SplitLane.TabClosed(tabId, recipient, amounts[1], block.timestamp);
        vm.prank(recipient);
        splitLane.closeTab(tabId);

        (,,,, uint256 closedAt, SplitLane.TabStatus status, uint256 totalAmount, uint256 remainingAmount) =
            splitLane.getTab(tabId);
        assertEq(closedAt, block.timestamp);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Closed));
        assertEq(totalAmount, amounts[0] + amounts[1]);
        assertEq(remainingAmount, amounts[1]);
        assertEq(token.balanceOf(recipient), amounts[0]);
        assertEq(token.balanceOf(address(splitLane)), 0);

        token.mint(bob, amounts[1]);
        vm.prank(bob);
        token.approve(address(splitLane), amounts[1]);
        vm.expectRevert(abi.encodeWithSelector(SplitLane.TabNotOpen.selector, tabId, SplitLane.TabStatus.Closed));
        vm.prank(bob);
        splitLane.payShare(tabId);
        assertEq(token.balanceOf(recipient), amounts[0]);
    }

    function test_CloseTabRejectsNonRecipientAndSettledTab() public {
        uint256 tabId = _createSingleShare(alice, USDC);

        vm.expectRevert(abi.encodeWithSelector(SplitLane.OnlyRecipient.selector, tabId, alice));
        vm.prank(alice);
        splitLane.closeTab(tabId);

        token.mint(alice, USDC);
        vm.prank(alice);
        token.approve(address(splitLane), USDC);
        vm.prank(alice);
        splitLane.payShare(tabId);

        vm.expectRevert(abi.encodeWithSelector(SplitLane.TabNotOpen.selector, tabId, SplitLane.TabStatus.Settled));
        vm.prank(recipient);
        splitLane.closeTab(tabId);
    }

    function test_ReentrancyAttemptIsBlockedWithoutDoubleSettlement() public {
        ReentrantUSDC reentrantToken = new ReentrantUSDC();
        SplitLane guardedLane = new SplitLane(address(reentrantToken));
        uint256 amount = 9 * USDC;
        (address[] memory participants, uint256[] memory amounts) = _singleShare(alice, amount);
        vm.prank(recipient);
        uint256 tabId = guardedLane.createTab("Reentry", metadataHash, participants, amounts);

        reentrantToken.mint(alice, amount);
        vm.prank(alice);
        reentrantToken.approve(address(guardedLane), amount);
        reentrantToken.configureReentry(address(guardedLane), abi.encodeCall(SplitLane.payShare, (tabId)));

        vm.prank(alice);
        guardedLane.payShare(tabId);

        assertFalse(reentrantToken.lastReentrySucceeded());
        assertEq(reentrantToken.lastReentrySelector(), ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        assertEq(reentrantToken.balanceOf(recipient), amount);
        assertEq(reentrantToken.balanceOf(address(guardedLane)), 0);
        (, bool paid) = guardedLane.getShare(tabId, alice);
        (,,,,, SplitLane.TabStatus status,, uint256 remainingAmount) = guardedLane.getTab(tabId);
        assertTrue(paid);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Settled));
        assertEq(remainingAmount, 0);
    }

    function test_RejectsNativeCurrencyAndExposesNoPayablePath() public {
        vm.deal(address(this), 1 ether);
        (bool succeeded,) = address(splitLane).call{value: 1 ether}("");
        assertFalse(succeeded);
        assertEq(address(splitLane).balance, 0);
    }

    function test_GettersRejectUnknownTab() public {
        vm.expectRevert(abi.encodeWithSelector(SplitLane.TabNotFound.selector, 999));
        splitLane.getTab(999);
        vm.expectRevert(abi.encodeWithSelector(SplitLane.TabNotFound.selector, 999));
        splitLane.getParticipants(999);
        vm.expectRevert(abi.encodeWithSelector(SplitLane.TabNotFound.selector, 999));
        splitLane.getShare(999, alice);
    }

    function testFuzz_ExactShareSettlement(address participant, uint128 rawAmount) public {
        vm.assume(participant != address(0));
        vm.assume(participant != recipient);
        vm.assume(participant != address(token));
        vm.assume(participant != address(splitLane));
        uint256 amount = bound(uint256(rawAmount), 1, type(uint96).max);
        uint256 tabId = _createSingleShare(participant, amount);

        token.mint(participant, amount);
        vm.prank(participant);
        token.approve(address(splitLane), amount);
        vm.prank(participant);
        splitLane.payShare(tabId);

        assertEq(token.balanceOf(recipient), amount);
        assertEq(token.balanceOf(address(splitLane)), 0);
        (,,,,, SplitLane.TabStatus status, uint256 totalAmount, uint256 remainingAmount) = splitLane.getTab(tabId);
        assertEq(uint256(status), uint256(SplitLane.TabStatus.Settled));
        assertEq(totalAmount, amount);
        assertEq(remainingAmount, 0);
    }

    function testFuzz_RemainingAmountTracksAnyPaymentOrder(
        uint96 rawAliceAmount,
        uint96 rawBobAmount,
        uint8 paymentMask
    ) public {
        uint256 aliceAmount = bound(uint256(rawAliceAmount), 1, 1_000_000_000 * USDC);
        uint256 bobAmount = bound(uint256(rawBobAmount), 1, 1_000_000_000 * USDC);
        address[] memory participants = new address[](2);
        participants[0] = alice;
        participants[1] = bob;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = aliceAmount;
        amounts[1] = bobAmount;
        vm.prank(recipient);
        uint256 tabId = splitLane.createTab("Fuzz accounting", metadataHash, participants, amounts);

        uint256 paidAmount;
        if (paymentMask & 1 != 0) {
            _fundApproveAndPay(alice, tabId, aliceAmount);
            paidAmount += aliceAmount;
        }
        if (paymentMask & 2 != 0) {
            _fundApproveAndPay(bob, tabId, bobAmount);
            paidAmount += bobAmount;
        }

        (,,,,, SplitLane.TabStatus status, uint256 totalAmount, uint256 remainingAmount) = splitLane.getTab(tabId);
        assertEq(totalAmount, aliceAmount + bobAmount);
        assertEq(remainingAmount, totalAmount - paidAmount);
        assertEq(token.balanceOf(recipient), paidAmount);
        assertEq(token.balanceOf(address(splitLane)), 0);
        if (remainingAmount == 0) {
            assertEq(uint256(status), uint256(SplitLane.TabStatus.Settled));
        } else {
            assertEq(uint256(status), uint256(SplitLane.TabStatus.Open));
        }
    }

    function _createSingleShare(address participant, uint256 amount) private returns (uint256 tabId) {
        (address[] memory participants, uint256[] memory amounts) = _singleShare(participant, amount);
        vm.prank(recipient);
        tabId = splitLane.createTab("Single share", metadataHash, participants, amounts);
    }

    function _fundApproveAndPay(address participant, uint256 tabId, uint256 amount) private {
        token.mint(participant, amount);
        vm.prank(participant);
        token.approve(address(splitLane), amount);
        vm.prank(participant);
        splitLane.payShare(tabId);
    }

    function _singleShare(address participant, uint256 amount)
        private
        pure
        returns (address[] memory participants, uint256[] memory amounts)
    {
        participants = new address[](1);
        participants[0] = participant;
        amounts = new uint256[](1);
        amounts[0] = amount;
    }

    function _twoShares() private view returns (address[] memory participants, uint256[] memory amounts) {
        participants = new address[](2);
        participants[0] = alice;
        participants[1] = bob;
        amounts = new uint256[](2);
        amounts[0] = 10 * USDC;
        amounts[1] = 15 * USDC;
    }
}
