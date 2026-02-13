import { ethers } from 'ethers';
import fs from 'fs';

// SKALE Base Sepolia Testnet Configuration (must match client RPC)
const SKALE_RPC_URL = "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha";
const DEPLOYER_PRIVATE_KEY = "9ef01f9bd02e2ee682be5c50c189720a37773ab58b5b031ebdb8489940cd01ad";

async function main() {
  console.log("🚀 Deploying SENTINEL contracts to SKALE Base Sepolia Testnet...\n");

  // Connect to SKALE
  const provider = new ethers.JsonRpcProvider(SKALE_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

  console.log("Deployer address:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("sFUEL balance:", ethers.formatEther(balance), "\n");

  // Read compiled contracts
  const sealedBidABI = JSON.parse(fs.readFileSync('./artifacts/contracts_SealedBidAuction_sol_SealedBidAuction.abi', 'utf8'));
  const sealedBidBytecode = fs.readFileSync('./artifacts/contracts_SealedBidAuction_sol_SealedBidAuction.bin', 'utf8');

  const registryABI = JSON.parse(fs.readFileSync('./artifacts/contracts_ServiceRegistry_sol_ServiceRegistry.abi', 'utf8'));
  const registryBytecode = fs.readFileSync('./artifacts/contracts_ServiceRegistry_sol_ServiceRegistry.bin', 'utf8');

  const agentRegistryABI = JSON.parse(fs.readFileSync('./artifacts/contracts_AgentRegistry_sol_AgentRegistry.abi', 'utf8'));
  const agentRegistryBytecode = fs.readFileSync('./artifacts/contracts_AgentRegistry_sol_AgentRegistry.bin', 'utf8');

  // Deploy ServiceRegistry
  console.log("📝 Deploying ServiceRegistry...");
  const RegistryFactory = new ethers.ContractFactory(registryABI, registryBytecode, wallet);
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ ServiceRegistry deployed to:", registryAddress);

  // Deploy SealedBidAuction
  console.log("\n📝 Deploying SealedBidAuction...");
  const AuctionFactory = new ethers.ContractFactory(sealedBidABI, sealedBidBytecode, wallet);
  const auction = await AuctionFactory.deploy();
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("✅ SealedBidAuction deployed to:", auctionAddress);

  // Deploy AgentRegistry
  console.log("\n📝 Deploying AgentRegistry...");
  const AgentRegistryFactory = new ethers.ContractFactory(agentRegistryABI, agentRegistryBytecode, wallet);
  const agentRegistry = await AgentRegistryFactory.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("✅ AgentRegistry deployed to:", agentRegistryAddress);

  // Save addresses
  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("Network: SKALE Base Sepolia Testnet");
  console.log("Chain ID: 324705682");
  console.log("ServiceRegistry:", registryAddress);
  console.log("SealedBidAuction:", auctionAddress);
  console.log("AgentRegistry:", agentRegistryAddress);
  console.log("\n📝 Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`NEXT_PUBLIC_AUCTION_ADDRESS=${auctionAddress}`);
  console.log(`NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${agentRegistryAddress}`);

  // Save to file
  const deploymentInfo = {
    network: "SKALE Base Sepolia Testnet",
    chainId: 324705682,
    rpcUrl: SKALE_RPC_URL,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ServiceRegistry: registryAddress,
      SealedBidAuction: auctionAddress,
      AgentRegistry: agentRegistryAddress
    }
  };

  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
