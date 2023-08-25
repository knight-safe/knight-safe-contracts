require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@nomicfoundation/hardhat-ledger");

const {
  ARBITRUM_URL,
  ARBITRUM_DEPLOY_KEY,
  ARBITRUM_LEDGER_ACCOUNT,
  ARBISCAN_API_KEY,

  ETHEREUM_URL,
  ETHEREUM_DEPLOY_KEY,
  ETHEREUM_LEDGER_ACCOUNT,
} = require("./env.json");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
};

// NEVER record important private keys in your code - this is for demo purposes
// const GOERLI_TESTNET_PRIVATE_KEY = "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    arbitrumOne: {
      url: ARBITRUM_URL,
      // accounts: [ARBITRUM_DEPLOY_KEY],
      ledgerAccounts: [ARBITRUM_LEDGER_ACCOUNT],
    },
    ethereum: {
      url: ETHEREUM_URL,
      // accounts: [ETHEREUM_DEPLOY_KEY]
      ledgerAccounts: [ETHEREUM_LEDGER_ACCOUNT],
    },    
  },
  etherscan: {
    apiKey: {
      arbitrumOne: ARBISCAN_API_KEY
    }
  }
};

