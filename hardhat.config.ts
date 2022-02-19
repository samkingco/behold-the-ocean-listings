import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_ID || ""}`,
      accounts:
        process.env.DEPLOY_PRIVATE_KEY_MAINNET !== undefined
          ? [`0x${process.env.DEPLOY_PRIVATE_KEY_MAINNET}`]
          : [],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_ID || ""}`,
      accounts:
        process.env.DEPLOY_PRIVATE_KEY_ROPSTEN !== undefined
          ? [`0x${process.env.DEPLOY_PRIVATE_KEY_ROPSTEN}`]
          : [],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID || ""}`,
      accounts:
        process.env.DEPLOY_PRIVATE_KEY_RINKEBY !== undefined
          ? [`0x${process.env.DEPLOY_PRIVATE_KEY_RINKEBY}`]
          : [],
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 100,
    coinmarketcap: process.env.CMC_API_KEY,
    excludeContracts: ["MockERC721.sol"],
    showTimeSpent: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
