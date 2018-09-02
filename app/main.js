const Db = require('./levelservice.js');
const Blockchain = require('./chain.js');
const Block = require('./block.js');
const WebAPI = require('./webapi.js');

let db = new Db('./mainchain');
let blockchain = new Blockchain(db);

blockchain.getSize().then((size)=> {
	if (size == 1) {
		console.log('Looks like we started from scratch, generating some dummy data');
		let lastBlock = {};
		for (var i = 0; i <= 10; i++) {
		  lastBlock = blockchain.addBlock(new Block("test data "+i));
		}
		return lastBlock;
	}
	return blockchain.genesis;
}).then(()=>{
		let api = new WebAPI(blockchain);
		api.start('localhost', 8000);
	});