/**
 * Deploy contracts to SKALE Base Sepolia (BITE enabled)
 * Usage: npx tsx scripts/deploy.ts
 */

import { createWalletClient, createPublicClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { execSync } from 'child_process';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const skaleBaseSepolia = defineChain({
  id: 324705682,
  name: 'SKALE Base Sepolia',
  nativeCurrency: { name: 'CREDIT', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://base-sepolia-testnet-explorer.skalenodes.com' },
  },
  testnet: true,
});

function compile() {
  console.log('Compiling contracts...');
  if (!existsSync('artifacts')) mkdirSync('artifacts');

  // Use solcjs (installed as solc in devDeps)
  const solcPath = join('node_modules', '.bin', 'solcjs');
  execSync(
    `${solcPath} --abi --bin --optimize --base-path . --include-path node_modules -o artifacts contracts/ServiceRegistry.sol contracts/SealedBidAuction.sol`,
    { stdio: 'inherit' }
  );
  console.log('Compilation complete.');
}

function getCompiledContract(name: string) {
  // solcjs output naming: contracts_<Name>_sol_<Name>
  const prefix = `contracts_${name}_sol_${name}`;
  const abiRaw = readFileSync(join('artifacts', `${prefix}.abi`), 'utf-8');
  const bin = readFileSync(join('artifacts', `${prefix}.bin`), 'utf-8');
  return {
    abi: JSON.parse(abiRaw),
    bytecode: `0x${bin}` as `0x${string}`,
  };
}

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: Set DEPLOYER_PRIVATE_KEY in .env.local');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Deployer: ${account.address}`);

  const publicClient = createPublicClient({
    chain: skaleBaseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: skaleBaseSepolia,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${balance} wei`);

  compile();

  // Deploy ServiceRegistry
  console.log('\nDeploying ServiceRegistry...');
  const registry = getCompiledContract('ServiceRegistry');
  const registryHash = await walletClient.deployContract({
    abi: registry.abi,
    bytecode: registry.bytecode,
    gasPrice: 100000n,
  });
  console.log(`Tx: ${registryHash}`);
  const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
  console.log(`ServiceRegistry: ${registryReceipt.contractAddress}`);

  // Deploy SealedBidAuction
  console.log('\nDeploying SealedBidAuction...');
  const auction = getCompiledContract('SealedBidAuction');
  const auctionHash = await walletClient.deployContract({
    abi: auction.abi,
    bytecode: auction.bytecode,
    gasPrice: 100000n,
  });
  console.log(`Tx: ${auctionHash}`);
  const auctionReceipt = await publicClient.waitForTransactionReceipt({ hash: auctionHash });
  console.log(`SealedBidAuction: ${auctionReceipt.contractAddress}`);

  console.log('\n=== Deployment Complete ===');
  console.log(`Network: SKALE Base Sepolia (BITE enabled)`);
  console.log(`Chain ID: 324705682`);
  console.log(`ServiceRegistry: ${registryReceipt.contractAddress}`);
  console.log(`SealedBidAuction: ${auctionReceipt.contractAddress}`);
  console.log(`\nUpdate .env.local:`);
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registryReceipt.contractAddress}`);
  console.log(`NEXT_PUBLIC_AUCTION_ADDRESS=${auctionReceipt.contractAddress}`);
}

main().catch(console.error);
