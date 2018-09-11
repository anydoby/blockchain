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
		return this.store.get(key).then((result)=> {},
				(error)=> {
					if (error.notFound) {
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
		return this.store.get(Block.leftPad(height)).then(Block.of);
	}

	forEachBlock(blockCallback, doneCallback) {
		this.store.createValueStream()
			.on('data', (json)=>{blockCallback(Block.of(json))})
			.on('close', doneCallback);
	}

	getBlockHeight() {
		return new Promise((resolve, reject)=>{
			let height = 0;
			this.store.createKeyStream()
			.on('data', (key)=>{height++})
			.on('close', ()=> resolve(height-1));			
		});
	}

	close() {
		this.store.close();
	}

}