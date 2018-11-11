var HDWalletProvider = require('truffle-hdwallet-provider');

var mnemonic = 'wet figure utility tiny process stem denial bleak tray woman medal trip';

module.exports = {
  networks: { 
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: "*"
    }, 
    rinkeby: {
      provider: function() { 
        return new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io/v3/ac8fdea9ba874d8a920b14e6c873386a') 
      },
      network_id: 4,
      gas: 4500000,
      gasPrice: 10000000000,
    }
  }
};
