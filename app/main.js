const Db = require('./levelservice.js');
const Blockchain = require('./chain.js');
const Block = require('./block.js');

let db = new Db('./mainchain');
let blockchain = new Blockchain(db);

let lastBlock = {};
for (var i = 0; i <= 10; i++) {
  lastBlock = blockchain.addBlock(new Block("test data "+i));
}
lastBlock.then(()=>{return blockchain.validate()})
	.then((result)=>{
		if (result){
			console.log('Blockchain is valid')
		}
});