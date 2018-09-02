const Hapi = require('hapi');
const Block = require('./block.js');
module.exports = class WebAPI {

	constructor(chain) {
		this.chain = chain;
	}

	async start(host, port) {
		let chain = this.chain;
		// Create a server with a host and port
		this.server = Hapi.server({host, port});
		let server = this.server;
		const init = async ()=> {
			await server.start();
			// get block route
			server.route({
				method: 'GET',
				path: '/block/{id}',
				handler: async (request, h) => {
					return chain.getBlock(request.params.id)
						.then(block => {
							console.log(`returning block ${block.height}`)
							return h.response(block);
						})
						.catch(err=> {
							console.log(err);
							return h.response({}).code(404);
						});
				}
			});

			// post block route
			server.route({
				method: 'POST',
				path: '/block',
				handler: async (request, h) => {
					let data = request.payload.body;
					let block = new Block(data);
					return chain.addBlock(block)
						.then(block=> {
							return h.response(block);
						});
				}
			});

			console.log(`server started on ${host}:${port}`);
		};
		return init();
	}

	async close() {
		return this.server.stop({timeout:10000});
	}

}