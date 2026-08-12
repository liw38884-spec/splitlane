// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SplitLane
/// @notice Records immutable USDC group tabs and transfers each share directly to its recipient.
contract SplitLane is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_PARTICIPANTS = 20;
    uint256 public constant MAX_TITLE_BYTES = 80;

    IERC20 public immutable USDC;
    uint256 public nextTabId = 1;

    enum TabStatus {
        None,
        Open,
        Settled,
        Closed
    }

    struct Tab {
        address recipient;
        string title;
        bytes32 metadataHash;
        uint256 createdAt;
        uint256 closedAt;
        TabStatus status;
        uint256 totalAmount;
        uint256 remainingAmount;
    }

    struct Share {
        uint256 amount;
        bool paid;
    }

    mapping(uint256 tabId => Tab tab) private _tabs;
    mapping(uint256 tabId => address[] participants) private _participants;
    mapping(uint256 tabId => mapping(address participant => Share share)) private _shares;

    error InvalidUSDC(address token);
    error EmptyTitle();
    error TitleTooLong(uint256 suppliedBytes, uint256 maximumBytes);
    error InvalidParticipantCount(uint256 suppliedCount);
    error ArrayLengthMismatch(uint256 participantsLength, uint256 amountsLength);
    error InvalidParticipant(address participant);
    error RecipientCannotBeParticipant(address recipient);
    error DuplicateParticipant(address participant);
    error InvalidShare(address participant);
    error TabNotFound(uint256 tabId);
    error TabNotOpen(uint256 tabId, TabStatus status);
    error NotParticipant(uint256 tabId, address account);
    error ShareAlreadyPaid(uint256 tabId, address participant);
    error OnlyRecipient(uint256 tabId, address caller);

    event TabCreated(
        uint256 indexed tabId,
        address indexed recipient,
        string title,
        bytes32 metadataHash,
        uint256 totalAmount,
        uint256 createdAt,
        address[] participants,
        uint256[] amounts
    );
    event SharePaid(
        uint256 indexed tabId, address indexed participant, address indexed recipient, uint256 amount, uint256 paidAt
    );
    event TabClosed(uint256 indexed tabId, address indexed recipient, uint256 unpaidAmount, uint256 closedAt);

    constructor(address usdc) {
        if (usdc == address(0) || usdc.code.length == 0) revert InvalidUSDC(usdc);
        USDC = IERC20(usdc);
    }

    /// @notice Creates a tab whose caller is permanently recorded as its recipient.
    /// @dev Title length is measured in UTF-8 bytes. Participant uniqueness is checked in memory
    /// because the list is capped at twenty entries and participant storage is written only once.
    function createTab(
        string calldata title,
        bytes32 metadataHash,
        address[] calldata participants,
        uint256[] calldata amounts
    ) external nonReentrant returns (uint256 tabId) {
        uint256 titleLength = bytes(title).length;
        if (titleLength == 0) revert EmptyTitle();
        if (titleLength > MAX_TITLE_BYTES) revert TitleTooLong(titleLength, MAX_TITLE_BYTES);

        uint256 participantCount = participants.length;
        if (participantCount == 0 || participantCount > MAX_PARTICIPANTS) {
            revert InvalidParticipantCount(participantCount);
        }
        if (participantCount != amounts.length) {
            revert ArrayLengthMismatch(participantCount, amounts.length);
        }

        tabId = nextTabId++;
        uint256 totalAmount;

        for (uint256 i; i < participantCount; ++i) {
            address participant = participants[i];
            if (participant == address(0)) revert InvalidParticipant(participant);
            if (participant == msg.sender) revert RecipientCannotBeParticipant(participant);
            if (amounts[i] == 0) revert InvalidShare(participant);

            for (uint256 j; j < i; ++j) {
                if (participants[j] == participant) revert DuplicateParticipant(participant);
            }

            _participants[tabId].push(participant);
            _shares[tabId][participant] = Share({amount: amounts[i], paid: false});
            totalAmount += amounts[i];
        }

        _tabs[tabId] = Tab({
            recipient: msg.sender,
            title: title,
            metadataHash: metadataHash,
            createdAt: block.timestamp,
            closedAt: 0,
            status: TabStatus.Open,
            totalAmount: totalAmount,
            remainingAmount: totalAmount
        });

        emit TabCreated(tabId, msg.sender, title, metadataHash, totalAmount, block.timestamp, participants, amounts);
    }

    /// @notice Pays the caller's assigned share in full, directly to the tab recipient.
    function payShare(uint256 tabId) external nonReentrant {
        Tab storage tab = _requireTab(tabId);
        if (tab.status != TabStatus.Open) revert TabNotOpen(tabId, tab.status);

        Share storage share = _shares[tabId][msg.sender];
        uint256 amount = share.amount;
        if (amount == 0) revert NotParticipant(tabId, msg.sender);
        if (share.paid) revert ShareAlreadyPaid(tabId, msg.sender);

        share.paid = true;
        tab.remainingAmount -= amount;
        if (tab.remainingAmount == 0) {
            tab.status = TabStatus.Settled;
            tab.closedAt = block.timestamp;
        }

        USDC.safeTransferFrom(msg.sender, tab.recipient, amount);

        emit SharePaid(tabId, msg.sender, tab.recipient, amount, block.timestamp);
    }

    /// @notice Prevents any remaining unpaid shares from settling.
    /// @dev remainingAmount intentionally retains the unpaid total as an auditable close result.
    function closeTab(uint256 tabId) external nonReentrant {
        Tab storage tab = _requireTab(tabId);
        if (msg.sender != tab.recipient) revert OnlyRecipient(tabId, msg.sender);
        if (tab.status != TabStatus.Open) revert TabNotOpen(tabId, tab.status);

        tab.status = TabStatus.Closed;
        tab.closedAt = block.timestamp;

        emit TabClosed(tabId, msg.sender, tab.remainingAmount, block.timestamp);
    }

    function getTab(uint256 tabId)
        external
        view
        returns (
            address recipient,
            string memory title,
            bytes32 metadataHash,
            uint256 createdAt,
            uint256 closedAt,
            TabStatus status,
            uint256 totalAmount,
            uint256 remainingAmount
        )
    {
        Tab storage tab = _requireTab(tabId);
        return (
            tab.recipient,
            tab.title,
            tab.metadataHash,
            tab.createdAt,
            tab.closedAt,
            tab.status,
            tab.totalAmount,
            tab.remainingAmount
        );
    }

    function getParticipants(uint256 tabId) external view returns (address[] memory) {
        _requireTab(tabId);
        return _participants[tabId];
    }

    function getShare(uint256 tabId, address participant) external view returns (uint256 amount, bool paid) {
        _requireTab(tabId);
        Share storage share = _shares[tabId][participant];
        return (share.amount, share.paid);
    }

    function _requireTab(uint256 tabId) private view returns (Tab storage tab) {
        tab = _tabs[tabId];
        if (tab.status == TabStatus.None) revert TabNotFound(tabId);
    }
}
