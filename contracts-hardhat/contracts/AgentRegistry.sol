// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry
 * @notice ERC-8004-aligned Identity Registry for autonomous agents.
 *         Each agent is an ERC-721 token whose tokenURI resolves to a
 *         registration JSON file (name, description, services, skills, etc.).
 *         Supports verified agent-wallet binding and arbitrary on-chain metadata.
 */

// Minimal ERC-721 implementation (no OpenZeppelin dependency for SKALE deploy)
contract AgentRegistry {

    // ──────────────────── ERC-721 Core ────────────────────

    string public constant name     = "SENTINEL Agent";
    string public constant symbol   = "SAGENT";

    uint256 private _nextTokenId;   // auto-increment agent IDs

    mapping(uint256 => address) private _owners;        // tokenId → owner
    mapping(address => uint256) private _balances;       // owner  → count
    mapping(uint256 => address) private _tokenApprovals; // tokenId → approved

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    // ──────────────────── Agent Identity (ERC-8004) ────────────────────

    /// @notice Off-chain registration JSON (IPFS / HTTPS).
    ///         Schema: { type, name, description, image, services[], x402Support, active, … }
    mapping(uint256 => string)  private _agentURIs;

    /// @notice Verified wallet that acts on behalf of this agent.
    mapping(uint256 => address) private _agentWallets;

    /// @notice Arbitrary on-chain metadata  (agentId → key → value).
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    // Reverse lookups
    mapping(address => uint256[]) private _ownerAgents;  // owner   → agentIds
    mapping(address => uint256)   public  walletToAgent;  // wallet  → agentId (0 = none)

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event AgentWalletSet(uint256 indexed agentId, address indexed wallet);
    event AgentWalletUnset(uint256 indexed agentId);
    event MetadataSet(uint256 indexed agentId, string metadataKey, bytes metadataValue);

    // ──────────────────── Structs ────────────────────

    struct MetadataEntry {
        string key;
        bytes  value;
    }

    // ──────────────────── Registration ────────────────────

    /// @notice Register a new agent with URI and optional metadata.
    ///         Mirrors ERC-8004 `register(string agentURI, MetadataEntry[])`.
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _mint(msg.sender);
        _agentURIs[agentId] = agentURI;

        for (uint256 i = 0; i < metadata.length; i++) {
            _metadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key, metadata[i].value);
        }

        emit Registered(agentId, agentURI, msg.sender);
    }

    /// @notice Minimal registration (URI only, no metadata).
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _mint(msg.sender);
        _agentURIs[agentId] = agentURI;
        emit Registered(agentId, agentURI, msg.sender);
    }

    // ──────────────────── URI Management ────────────────────

    function agentURI(uint256 agentId) external view returns (string memory) {
        require(_owners[agentId] != address(0), "Agent does not exist");
        return _agentURIs[agentId];
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(_owners[agentId] == msg.sender, "Not agent owner");
        _agentURIs[agentId] = newURI;
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // ──────────────────── Agent Wallet ────────────────────

    /// @notice Bind a server-generated wallet to this agent.
    ///         Simplified from ERC-8004 (no EIP-712 sig — deployer is trusted on SKALE).
    function setAgentWallet(uint256 agentId, address wallet) external {
        require(_owners[agentId] == msg.sender, "Not agent owner");
        require(wallet != address(0), "Zero address");
        require(walletToAgent[wallet] == 0 || walletToAgent[wallet] == agentId, "Wallet already bound");

        // Unset previous wallet if any
        address prev = _agentWallets[agentId];
        if (prev != address(0)) {
            walletToAgent[prev] = 0;
        }

        _agentWallets[agentId] = wallet;
        walletToAgent[wallet]  = agentId;
        emit AgentWalletSet(agentId, wallet);
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallets[agentId];
    }

    function unsetAgentWallet(uint256 agentId) external {
        require(_owners[agentId] == msg.sender, "Not agent owner");
        address prev = _agentWallets[agentId];
        if (prev != address(0)) {
            walletToAgent[prev] = 0;
        }
        _agentWallets[agentId] = address(0);
        emit AgentWalletUnset(agentId);
    }

    // ──────────────────── Metadata ────────────────────

    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory) {
        return _metadata[agentId][key];
    }

    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
        require(_owners[agentId] == msg.sender, "Not agent owner");
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, value);
    }

    // ──────────────────── View Helpers ────────────────────

    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerAgents[owner];
    }

    function totalAgents() external view returns (uint256) {
        return _nextTokenId;
    }

    // ──────────────────── ERC-721 Basics ────────────────────

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Token does not exist");
        return o;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _agentURIs[tokenId];
    }

    function approve(address to, uint256 tokenId) external {
        require(_owners[tokenId] == msg.sender, "Not owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(msg.sender, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        return _tokenApprovals[tokenId];
    }

    // ──────────────────── Internal ────────────────────

    function _mint(address to) internal returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _owners[tokenId]  = to;
        _balances[to]    += 1;
        _ownerAgents[to].push(tokenId);
        emit Transfer(address(0), to, tokenId);
    }
}
