import { ethers } from 'ethers';
import fs from 'fs';

const SKALE_RPC_URL = "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha";
const DEPLOYER_PRIVATE_KEY = "9ef01f9bd02e2ee682be5c50c189720a37773ab58b5b031ebdb8489940cd01ad";

async function main() {
  console.log("Deploying SentinelUSDC to SKALE...\n");

  const provider = new ethers.JsonRpcProvider(SKALE_RPC_URL);
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  console.log("Deployer:", wallet.address);

  const abi = JSON.parse(fs.readFileSync('./artifacts/contracts_SentinelUSDC_sol_SentinelUSDC.abi', 'utf8'));
  const bytecode = fs.readFileSync('./artifacts/contracts_SentinelUSDC_sol_SentinelUSDC.bin', 'utf8');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const token = await factory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("SentinelUSDC deployed to:", tokenAddress);

  // Mint 1B tokens to deployer (1_000_000_000 * 10^6)
  const mintAmount = ethers.parseUnits("1000000000", 6);
  const mintTx = await token.mint(wallet.address, mintAmount);
  await mintTx.wait();
  console.log("Minted 1B sUSDC to deployer");

  const balance = await token.balanceOf(wallet.address);
  console.log("Deployer balance:", ethers.formatUnits(balance, 6), "sUSDC");

  // Update deployment.json
  const deployment = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  deployment.contracts.SentinelUSDC = tokenAddress;
  fs.writeFileSync('./deployment.json', JSON.stringify(deployment, null, 2));

  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
