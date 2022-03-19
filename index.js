class Passport {
	#data;
	
	/**
	 * Creates a new instance of Passport and loads the user ID.
	 */
	constructor() {
		this.uid = sessionStorage.getItem("passport-uid");
		this.#data = {};
	}

	/**
	 * Adds a value to the signed in account.
	 * @param {string} name The name of the value to add.
	 * @param {any} value The value to add. Can be any JSON serializable object.
	 * @returns The newly added value
	 */
	add(name, value) {
		if(this.#data[name] != undefined) throw new PassportError("ERR_ADD", "Key already exists");

		this.#data[name] = value;
		const v = JSON.stringify(value);
		const raw = Passport.toHex(v);
		return this.addRaw(name, raw);
	}

	/**
	 * Adds a raw value to the signed in account.
	 * @param {string} name The name of the value to add.
	 * @param {string} raw The value to add. Must be a hexadecimal string preceded by \x (backslash X).
	 * @returns The newly added value.
	 */
	async addRaw(name, raw) {
		const key = this.#getKey();
		const res = await Passport.#doRequest("account/data", {
			method: "POST",
			body: {
				key,
				name,
				value: raw
			}
		});

		if(res.error) throw new PassportError("ERR_REQUEST", res.error);
		return res;
	}

	/**
	 * Gets the value specified by name.
	 * @param {string} name The name of the value to get.
	 * @returns The value.
	 */
	async get(name) {
		const cached = this.#data[name];
		if(cached != undefined) return cached;

		const raw = await this.getRaw(name);
		const value = Passport.fromHex(raw);
		this.#data[name] = value;
		return JSON.parse(value);
	}

	/**
	 * Gets the specified value as a hexadecimal string.
	 * @param {string} name The name of the value to get.
	 * @returns The raw value.
	 */
	async getRaw(name) {
		const key = this.#getKey();
		const res = await Passport.#doRequest("account/data", {
			method: "GET",
			query: { key, name }
		});

		if(res.error) throw new PassportError(res.error);
		return res.value;
	}

	/**
	 * Sets the value specified by name.
	 * @param {string} name The name of the value to set.
	 * @param {any} value The value. Can be any JSON-serializable object.
	 * @returns The new value.
	 */
	set(name, value) {
		this.#data[name] = value;

		const v = JSON.stringify(value);
		const raw = Passport.toHex(v);
		return this.setRaw(name, raw);
	}
	
	/**
	 * Sets the value specified by name.
	 * @param {string} name The name of the value to set.
	 * @param {string} value The raw value to set it to. Must be a hexadecimal string preceded by \x.
	 * @returns The new value.
	 */
	async setRaw(name, raw) {
		const key = this.#getKey();
		const res = await Passport.#doRequest("account/data", {
			method: "PUT",
			body: {
				key,
				name,
				value: raw,
			}
		});

		if(res.error) throw new PassportError("ERR_REQUEST", res.error);
		return res;
	}

	/**
	 * Removes the value specified by name.
	 * @param {string} name The value to remove.
	 * @returns Whether or not the operation succeeded.
	 */
	async remove(name) {
		this.#data[name] = undefined;
		const key = this.#getKey();
		const res = await Passport.#doRequest("account/data", {
			method: "DELETE",
			query: {
				key,
				name
			}
		});

		if(res.error) throw new PassportError("ERR_REQUEST", res.error);
		return res.success;
	}

	/**
	 * Loads Passport
	 */
	async load() {
		if(this.uid == null) await this.#loadUid();
	}

	/**
	 * Logs out the current account.
	 */
	async logout() {
		const key = this.#getKey();
		const res = await Passport.#doRequest("authentication", {
			method: "DELETE",
			query: { key }
		});

		localStorage.removeItem("passport-key");
		sessionStorage.removeItem("passport-uid");
		if(res.error) throw new PassportError("ERR_REQUEST", res.error);
	}

	async #loadUid() {
		const key = localStorage.getItem("passport-key");
		if(key == null) return;

		const res = await Passport.#doRequest("account/uid", {
			method: "GET",
			query: { key }
		});

		if(res.error) throw new PassportError("ERR_REQUEST", res.error);
		
		this.uid = res.uid;
		sessionStorage.setItem("passport-uid", this.uid);
	}

	#getKey() {
		const key = localStorage.getItem("passport-key");
		if(key == null) throw new PassportError("ERR_LOGIN", "Not logged in");
		return key;
	}

	/**
	 * Gets the account's session key and saves it. Should be called once on the landing page when logging in.
	 * @param {string|null} destination The destination to redirect to.
	 */
	static doLanding(destination = null) {
		const { key } = Passport.#getQuery();
		if(!key) throw new PassportError("ERR_LANDING_NO_KEY", "Missing key");

		localStorage.setItem("passport-key", key);
		if(destination) window.location.replace(destination);
	}

	/**
	 * Decodes a hexadecimal string.
	 * @param {string} hex A hex string, preceded by \x.
	 * @returns The decoded string.
	 */
	static fromHex(hex) {
		let value = "";
		for(let i = 2; i < hex.length; i += 2) {
			const h = hex.substring(i, i + 2);
			value += String.fromCharCode(parseInt(h, 16));
		}

		return value;
	}

	/**
	 * Converts the given string to its hexadecimal equivalent.
	 * @param {string} value The string to convert.
	 * @returns The value as a hexadecimal string.
	 */
	static toHex(value) {
		let hex = "\\x";
		for(let i = 0; i < value.length; i++) {
			const c = value.charCodeAt(i);
			hex += c.toString(16);
		}

		return hex;
	}

	static #getQuery() {
		const q = window.location.search;
		if(!q.startsWith("?")) return {};

		const res = {};
		const fields = q.substring(1).split("&");
		for(const field of fields) {
			const [key, value] = field.split("=");
			res[decodeURIComponent(key)] = decodeURIComponent(value);
		}

		return res;
	}

	static async #doRequest(endpoint, options) {
		const { body, query, method } = options;

		const q = [];
		for(const key in query) {
			const k = encodeURIComponent(key);
			const v = encodeURIComponent(query[key]);
			q.push(`${k}=${v}`);
		}

		let url = `https://passport.kurtisknodel.com/api/${endpoint}`;
		if(q.length > 0) url += "?" + q.join("&");

		const res = await fetch(url, {
			body: JSON.stringify(body),
			method,
			mode: "cors",
			cache: "no-cache",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if(res.status == 200) return await res.json();
		else throw new PassportError("ERR_RESPONSE", `Server responded with ${res.status}: ${res.statusText}`);
	}
}

class PassportError extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
	}
}