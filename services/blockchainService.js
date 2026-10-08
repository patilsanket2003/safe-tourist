const { ethers } =require("ethers");
const {POLYGON_RPC,PRIVATE_KEY,SMART_CONTRACT_ADDRESS_reg } = require('../config/config')

const RPC_URL = POLYGON_RPC;
const CONTRACT_ADDRESS = SMART_CONTRACT_ADDRESS_reg;
const ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "eventId",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "payloadHash",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "issuer",
				"type": "address"
			}
		],
		"name": "RecordStored",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "eventId",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "payloadHash",
				"type": "bytes32"
			}
		],
		"name": "storeEvent",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "eventId",
				"type": "bytes32"
			}
		],
		"name": "getEvent",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "eventId",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "payloadHash",
				"type": "bytes32"
			}
		],
		"name": "verify",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
]

let provider = null;
let wallet = null;
let contract = null;

try {
  if (RPC_URL) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    if (PRIVATE_KEY && PRIVATE_KEY.length >= 64) {
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
      }
    }
  }
} catch (err) {
  console.warn("⚠️ Blockchain initialization warning (audit trail will run in simulated mode):", err.message);
}

exports.getConfiguredContractAddress = () => CONTRACT_ADDRESS;

/**
 * Store an audit record on blockchain
 * @param {string} eventIdBytes32 - 0x-prefixed 32-byte hex
 * @param {string} payloadHashBytes32 - 0x-prefixed 32-byte hex
 * @returns {string} txHash
 */
exports.storeEvent = async (eventIdBytes32, payloadHashBytes32) => {
  try {
    console.log("📌 Blockchain storeEvent input:", { eventIdBytes32, payloadHashBytes32 });

    if (!contract) {
      console.log("ℹ️ Blockchain contract not configured; generating simulated audit tx hash.");
      const crypto = require("crypto");
      return "0x" + crypto.randomBytes(32).toString("hex");
    }

    const tx = await contract.storeEvent(eventIdBytes32, payloadHashBytes32);
    const receipt = await tx.wait();

	if(receipt && receipt.hash){
		console.log("✅ Tx mined:", receipt.hash);
        return receipt.hash;
	}
    
    return tx.hash || ("0x" + require("crypto").randomBytes(32).toString("hex"));
  } catch (err) {
    console.warn("⚠️ Blockchain tx failed (falling back to simulated hash):", err.message);
    const crypto = require("crypto");
    return "0x" + crypto.randomBytes(32).toString("hex");
  }
};


/**
 * Verify a record on blockchain
 * @param {string} eventIdBytes32 - 0x-prefixed 32-byte hex
 * @param {string} payloadHashBytes32 - 0x-prefixed 32-byte hex
 * @returns {boolean}
 */
exports.verifyAuditRecord = async (eventIdBytes32, payloadHashBytes32) => {
  try {
    console.log("📌 Blockchain verify input:", { eventIdBytes32, payloadHashBytes32 });

    const ok = await contract.verify(eventIdBytes32, payloadHashBytes32);
    console.log("✅ Verify result:", ok);
    return ok;
  } catch (err) {
    console.error("❌ Blockchain verify failed:", err);
    throw err;
  }
};

/**
 * Verify a record on a specific contract address
 * @param {string} contractAddress - deployed contract address
 * @param {string|Uint8Array} eventIdBytes32 - bytes32 event id
 * @param {string|Uint8Array} payloadHashBytes32 - bytes32 payload hash
 * @returns {boolean}
 */
exports.verifyAuditRecordAt = async (contractAddress, eventIdBytes32, payloadHashBytes32) => {
	try {
		const readContract = new ethers.Contract(contractAddress, ABI, provider);
		const ok = await readContract.verify(eventIdBytes32, payloadHashBytes32);
		console.log("✅ Verify result on specific contract:", { contractAddress, ok });
		return ok;
	} catch (err) {
		console.error("❌ Blockchain verify failed on specific contract:", err);
		throw err;
	}
};

/**
 * Resolve target contract address from a tx hash
 * @param {string} txHash
 * @returns {string|null}
 */
exports.resolveContractAddressFromTx = async (txHash) => {
	try {
		if (!txHash || typeof txHash !== "string") return null;

		const receipt = await provider.getTransactionReceipt(txHash);
		if (receipt && receipt.to) return receipt.to;

		const tx = await provider.getTransaction(txHash);
		return tx && tx.to ? tx.to : null;
	} catch (err) {
		console.error("❌ Failed to resolve contract address from tx hash:", err);
		return null;
	}
};

/**
 * Fetch stored record from blockchain
 * @param {string} eventIdBytes32 - 0x-prefixed 32-byte hex
 * @returns {object} { payloadHash, timestamp, issuer }
 */
exports.getEvent = async (eventIdBytes32) => {
  try {
    const record = await contract.getEvent(eventIdBytes32);
    return {
      payloadHash: record[0],
      timestamp: Number(record[1]),
      issuer: record[2]
    };
  } catch (err) {
    console.error("❌ Blockchain getEvent failed:", err);
    throw err;
  }
};	

