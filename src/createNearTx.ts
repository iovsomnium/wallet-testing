import { providers, transactions, utils } from "near-api-js";
import BN from "bn.js";

const createNearTx = async (signerId: string, publicKey: string) => {
  const provider = new providers.JsonRpcProvider({
    url: "https://near-mainnet-rpc.allthatnode.com:3030",
  });
  console.log(1111, provider);
  // const { block_hash, block_height, nonce, permission } =
  //   await provider.query(`access_key/${signerId}/${publicKey}`, "");
  const accessKey = await provider.query(
    `access_key/${signerId}/${publicKey.toString()}`,
    ""
  );
  //@ts-ignore
  const nonce = accessKey.nonce;

  // const pubkey = utils.key_pair.PublicKey.fromString(publicKey);
  // const actions = [transactions.stake(new BN(10), pubkey)];
  const actions = transactions.functionCall(
    "deposite_and_stake",
    new Uint8Array(),
    new BN(131231),
    new BN(123123)
  );
  console.log(13213, actions);
  const recentBlockHash = utils.serialize.base_decode(accessKey.block_hash);
  console.log(1231, recentBlockHash);
  const transaction = transactions.createTransaction(
    signerId,
    utils.PublicKey.fromString(publicKey),
    "9bfd12934cd6fdd09199e2e267803c70bd7c6cb40832ac6f29811948dde2b723",
    nonce,
    [actions],
    recentBlockHash
  );
  console.log(12313, transaction);

  const bytes = Buffer.from(transaction.encode()).toString("base64");

  return bytes;
};

export default createNearTx;
