const sha256 = require('crypto-js/sha256');

module.exports = class Block {

	constructor(data, height){
        this.hash = "",
        this.height = height?height:0,
        this.body = data,
        this.time = 0,
        this.previousBlockHash = ""
    }

    static leftPad(height) {
        var zeros = Math.max(0, Number.MAX_SAFE_INTEGER.toString().length - height.toString().length );
        var zeroString = Math.pow(10,zeros).toString().substr(1);
        return zeroString+height;
    }

    static of(json) {
        return Object.assign(new Block(), JSON.parse(json));
    }

    now() {
        return parseInt(new Date().getTime().toString().slice(0,-3));
    }

    sha() {
    	let copy = Object.assign({}, this);
    	copy.hash = "";
    	return sha256(JSON.stringify(copy)).toString();
    }

    validate() {
        let digest = this.sha();
        if (this.hash === digest) {
            return true;
        } else {
            console.log("Stored hash " +this.hash +" does not match calculated hash "+digest);
            return false
        }
    }
}