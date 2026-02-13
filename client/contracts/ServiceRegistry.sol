// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ServiceRegistry
 * @notice Registry of service providers (GPU, Data, API providers)
 */
contract ServiceRegistry {
    struct Provider {
        address providerAddress;
        string name;
        string serviceType; // GPU, Data, API
        uint256 basePrice;
        bool active;
    }

    mapping(address => Provider) public providers;
    address[] public providerList;

    event ProviderRegistered(address indexed provider, string name, string serviceType);
    event ProviderUpdated(address indexed provider, uint256 newPrice);
    event ProviderDeactivated(address indexed provider);

    function registerProvider(
        string memory _name,
        string memory _serviceType,
        uint256 _basePrice
    ) external {
        require(providers[msg.sender].providerAddress == address(0), "Already registered");

        providers[msg.sender] = Provider({
            providerAddress: msg.sender,
            name: _name,
            serviceType: _serviceType,
            basePrice: _basePrice,
            active: true
        });

        providerList.push(msg.sender);
        emit ProviderRegistered(msg.sender, _name, _serviceType);
    }

    function updatePrice(uint256 _newPrice) external {
        require(providers[msg.sender].active, "Not registered");
        providers[msg.sender].basePrice = _newPrice;
        emit ProviderUpdated(msg.sender, _newPrice);
    }

    function deactivateProvider() external {
        require(providers[msg.sender].active, "Not registered");
        providers[msg.sender].active = false;
        emit ProviderDeactivated(msg.sender);
    }

    function getProviderCount() external view returns (uint256) {
        return providerList.length;
    }

    function getProvider(address _provider) external view returns (Provider memory) {
        return providers[_provider];
    }

    function getAllProviders() external view returns (address[] memory) {
        return providerList;
    }
}
