/*
	Copyright (c) 2022 duggavo

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

const request = require("request-promise");
const http = require("http");

class Wallet  {
	constructor(hostname = "127.0.0.1", port = 34570, user = "", pass = "") {
		this.hostname = hostname;
		this.port = port;
		this.user = user;
		this.pass = pass;

		this._rpcReq("get_address");
	}
}

Wallet.prototype._rpcReq = function (method, params = '') {
	var options = {
		forever: true,
		json: {"jsonrpc": "2.0", "id": "0", "method": method},
		agent: new http.Agent({
			keepAlive: true,
			maxSockets: 1
		})
	};

	if (params) {
		options["json"]["params"] = params;
	}
	if (this.user) {
		options["auth"] = {
			"user": this.user,
			"pass": this.pass,
			"sendImmediately": false
		}
	}
	return request.post(`http://${this.hostname}:${this.port}/json_rpc`, options)
		.then((result) => {
			if (result.hasOwnProperty("result")) {
				return result.result;
			} else {
				return result;
			}
		});
};

/**
 * Creates a new wallet
 * 
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#create_wallet
 * 
 * @param {String} filename   
 * @param {String} password
 * @param {String} language
*/
Wallet.prototype.create_wallet  = function(filename = "new_wallet", password = "", language = "English") {
	return this._rpcReq("create_wallet", {
		filename: filename,
		password: password,
		language: language
	});
};

/**
 * Opens a wallet file
 * 
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#open_wallet
 * 
 * @param {String} filename 
 * @param {String} password 
 */
Wallet.prototype.open_wallet  = function(filename = "walletrpc_wallet", password = "") {
	return this._rpcReq("open_wallet", {
		filename: filename,
		password: password
	});
};

/**
 * Stops the wallet
 * 
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#stop_wallet 
 */
Wallet.prototype.stop_wallet  = function() {
	return this._rpcReq("stop_wallet");
};

/**
 * Saves the wallet
 *  
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#store
 */
 Wallet.prototype.store  = function() {
	return this._rpcReq("store");
};

/**
 * Returns the wallet balance
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#get_balance
 * 
 * @param {Number} account_id The account ID
 */
Wallet.prototype.get_balance = function(account_id = 0) {
	return this._rpcReq("get_balance", {
		account_index: account_id
	});
};

/**
 * Sweeps all the money
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#sweep_all
 * 
 * @param {Number} account_id The account ID
 * @param {String} address Where to send the money
 */
 Wallet.prototype.sweep_all = function(account_id = 0, address) {
	return this._rpcReq("sweep_all", {
		account_index: account_id,
		address: address
	});
};

/**
 * Returns the wallet address
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#get_address
 * 
 * @param {Number} account_id The account ID
 */
 Wallet.prototype.get_address = function(account_id = 0) {
	return this._rpcReq("get_address", {
		account_index: account_id
	});
};
/**
 * Returns a list of incoming transactions
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#get_transfers
 * 
 * @param {Boolean} txin Include incoming transfers
 * @param {Boolean} txout Include outgoing transfers
 * @param {Boolean} pending Include pending transactions
 * @param {Boolean} failed Include failed transactions
 * @param {Boolean} pool Include transactions in mempool
 */
 Wallet.prototype.get_transfers = function(account_index, txin, txout, pending = false, failed = false, pool = false) {
	return this._rpcReq("get_transfers", {
		account_index: account_index,
		in: txin,
		out: txout,
		pending: pending,
		failed: failed,
		pool: pool
	});
};


/**
 * Creates an account.
 * https://www.getmonero.org/resources/developer-guides/wallet-rpc.html#create_account
 * 
 * @param {String} label The label of the account
 */
Wallet.prototype.create_account = function(label = undefined) {
	return this._rpcReq("create_account", {
		label: label
	});
};

module.exports = Wallet;