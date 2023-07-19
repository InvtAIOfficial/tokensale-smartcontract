import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import "dotenv/config";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

const GOERLI_URL = process.env.GOERLI_URL;
const MAINNET_URL = process.env.MAINNET_URL;
const ETHER_SCAN_APIKEY = process.env.ETHER_SCAN_APIKEY;


const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    goerli: {
      url: GOERLI_URL,
      accounts: [PRIVATE_KEY]
    },
    main: {
      url: MAINNET_URL,
      accounts: [PRIVATE_KEY]
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    
    apiKey: ETHER_SCAN_APIKEY
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  abiExporter: {
    path: "./data/abi",
    clear: true,
    flat: false,
  }
};

export default config;
