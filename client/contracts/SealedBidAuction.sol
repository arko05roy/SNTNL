// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SealedBidAuction
 * @notice Sealed-bid auction using BITE encryption for privacy
 * @dev Works with BITE SDK for encryption/decryption
 */
contract SealedBidAuction {
    struct Bid {
        address bidder;
        bytes encryptedBid; // BITE encrypted bid amount
        uint256 timestamp;
        bool revealed;
        uint256 revealedAmount;
    }

    struct Auction {
        uint256 auctionId;
        string serviceType; // GPU, Data, API, etc.
        address creator;
        uint256 deadline;
        uint256 minBid;
        uint256 maxBid; // Spend cap
        bool finalized;
        address winner;
        uint256 winningBid;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    uint256 public auctionCounter;

    event AuctionCreated(uint256 indexed auctionId, string serviceType, uint256 deadline);
    event BidSubmitted(uint256 indexed auctionId, address indexed bidder, bytes encryptedBid);
    event BidRevealed(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionFinalized(uint256 indexed auctionId, address winner, uint256 winningBid);

    /**
     * @notice Create new sealed-bid auction
     */
    function createAuction(
        string memory _serviceType,
        uint256 _duration,
        uint256 _minBid,
        uint256 _maxBid
    ) external returns (uint256) {
        uint256 auctionId = auctionCounter++;

        auctions[auctionId] = Auction({
            auctionId: auctionId,
            serviceType: _serviceType,
            creator: msg.sender,
            deadline: block.timestamp + _duration,
            minBid: _minBid,
            maxBid: _maxBid,
            finalized: false,
            winner: address(0),
            winningBid: 0
        });

        emit AuctionCreated(auctionId, _serviceType, block.timestamp + _duration);
        return auctionId;
    }

    /**
     * @notice Submit encrypted bid (BITE encrypted)
     * @dev Bid stays encrypted until deadline
     */
    function submitBid(uint256 _auctionId, bytes memory _encryptedBid) external {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp < auction.deadline, "Auction ended");
        require(!auction.finalized, "Auction finalized");

        auctionBids[_auctionId].push(Bid({
            bidder: msg.sender,
            encryptedBid: _encryptedBid,
            timestamp: block.timestamp,
            revealed: false,
            revealedAmount: 0
        }));

        emit BidSubmitted(_auctionId, msg.sender, _encryptedBid);
    }

    /**
     * @notice Reveal bid after deadline (called by BITE conditional transaction)
     * @dev In production, this would be triggered by BITE CATs
     */
    function revealBid(
        uint256 _auctionId,
        uint256 _bidIndex,
        uint256 _amount
    ) external {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.deadline, "Auction still active");

        Bid storage bid = auctionBids[_auctionId][_bidIndex];
        require(!bid.revealed, "Already revealed");

        // In production: verify BITE decryption proof
        bid.revealed = true;
        bid.revealedAmount = _amount;

        emit BidRevealed(_auctionId, bid.bidder, _amount);
    }

    /**
     * @notice Finalize auction and determine winner
     */
    function finalizeAuction(uint256 _auctionId) external returns (address, uint256) {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.deadline, "Auction still active");
        require(!auction.finalized, "Already finalized");

        // Find highest bid
        Bid[] storage bids = auctionBids[_auctionId];
        uint256 highestBid = 0;
        address highestBidder = address(0);

        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].revealed && bids[i].revealedAmount > highestBid) {
                highestBid = bids[i].revealedAmount;
                highestBidder = bids[i].bidder;
            }
        }

        auction.finalized = true;
        auction.winner = highestBidder;
        auction.winningBid = highestBid;

        emit AuctionFinalized(_auctionId, highestBidder, highestBid);
        return (highestBidder, highestBid);
    }

    /**
     * @notice Get auction details
     */
    function getAuction(uint256 _auctionId) external view returns (Auction memory) {
        return auctions[_auctionId];
    }

    /**
     * @notice Get number of bids for auction
     */
    function getBidCount(uint256 _auctionId) external view returns (uint256) {
        return auctionBids[_auctionId].length;
    }

    /**
     * @notice Get bid details
     */
    function getBid(uint256 _auctionId, uint256 _bidIndex) external view returns (Bid memory) {
        return auctionBids[_auctionId][_bidIndex];
    }
}
