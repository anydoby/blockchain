/*
* this service allows writing-reading to/from leveldb asynchronously
*/
const level = require('level');
const Block = require('./block.js');
module.exports = class Db {

	constructor(dbFile) {
		this.store = level(dbFile);
	}

	addBlock(block) {
		let store = this.store;
		let key = Block.leftPad(block.height);
		console.log('adding block ' + JSON.stringify(block) + ' with key ' + key);
		return this.store.get(key).then((result)=> {
					console.log('Found a record with the same height of ' + block.height);
				},
				(error)=> {
					if (error.notFound) {
					console.log('No block with height ' + block.height + ". Adding it to the chain.");
						return store.put(key, JSON.stringify(block))
							.then(()=>{return block})
							.catch((error)=> {
								console.log('Error inserting block: ' + error);
							}
						);			
					}
				});
	}

	getBlock(height) {
		return this.store.get(Block.leftPad(height)).then(JSON.parse);
	}

	forEachBlock(blockCallback, doneCallback) {
		this.store.createValueStream()
			.on('data', (json)=>{blockCallback(JSON.parse(json))})
			.on('close', doneCallback);
	}

	getBlockHeight() {
		return new Promise((resolve, reject)=>{
			let height = 0;
			this.store.createKeyStream()
			.on('data', (key)=>{height = Math.max(height, key);})
			.on('close', ()=> resolve(height));			
		});
	}

	close() {
		this.store.close();
	}

}