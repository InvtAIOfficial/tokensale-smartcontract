import { ethers } from "hardhat";

async function deployContract(name, args, label?, options?) {
  let info = name
  if (label) { info = name + ":" + label }
  const contractFactory = await ethers.getContractFactory(name)
  let contract
  if (options) {
    contract = await contractFactory.deploy(...args, options)
  } else {
    contract = await contractFactory.deploy(...args)
  }
  const argStr = args.map((i) => `"${i}"`).join(" ")
  console.info(`Deploying ${info} ${contract.address} ${argStr}`)
  await contract.deployTransaction.wait()
  console.info("... Completed!")
  return contract
}

async function contractAt(name, address, provider) {
  let contractFactory = await ethers.getContractFactory(name)
  if (provider) {
    contractFactory = contractFactory.connect(provider)
  }
  return await contractFactory.attach(address)
}

async function sendTxn(txnPromise, label) {
  const txn = await txnPromise
  console.info(`Sending ${label}...`)
  await txn.wait()
  console.info(`... Sent! ${txn.hash}`)
  return txn
}

async function deployerInfo() {
  // Getting the first signer as the deployer
  const [deployer] = await ethers.getSigners();
  // Saving the info to be logged in the table (deployer address)
  const deployerLog = { Label: "Deploying Address", Info: deployer.address };
  // Saving the info to be logged in the table (deployer address)
  const deployerBalanceLog = { 
      Label: "Deployer ETH Balance", 
      Info: (await deployer.getBalance()).toString() 
  };

  console.table([
    deployerLog, 
    deployerBalanceLog
  ]);

  return deployer.address;
}

function bigNumberify(n) {
  return ethers.BigNumber.from(n)
}

function expandDecimals(n, decimals = 18) {
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals))
}

export default {
  deployContract,
  contractAt,
  sendTxn,
  deployerInfo,
  bigNumberify,
  expandDecimals,
}
