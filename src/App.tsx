import { useEffect, useState } from "react";
import {
  PublicKey,
  Transaction,
  Connection,
  LAMPORTS_PER_SOL,
  StakeProgram,
  Authorized,
  Lockup,
} from "@solana/web3.js";

// import Web3  from "web3";
import { WelldoneWalletAdapter } from "./welldone";
import "./App.css";
import { providers, transactions, utils } from "near-api-js";
import { ConnectionInfo } from "near-api-js/lib/utils/web";
import BN from "bn.js";

// const web3 = new Web3("https://ethereum-rinkeby-rpc.allthatnode.com");

type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );

  // const [metamaskKey, setMetamaskKey] = useState<string>();
  const [welldoneKey, setWelldoneKey] = useState<string>();

  /**
   * @description gets Phantom provider, if it exists
   */
  const getProvider = (): PhantomProvider | undefined => {
    if ("solana" in window) {
      // @ts-ignore
      const provider = window.solana as any;
      if (provider.isPhantom) return provider as PhantomProvider;
    }
  };

  /*
   * @description prompts user to connect wallet if it exists
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (solana) {
      try {
        const response = await solana.connect();
        console.log("wallet account ", response.publicKey.toString());
        setWalletKey(response.publicKey.toString());
      } catch (err) {
        // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  /*
   * @description disconnect Phantom wallet
   */
  const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (walletKey && solana) {
      await (solana as PhantomProvider).disconnect();
      setWalletKey(undefined);
    }
  };

  // const connectMetamask = async () => {
  //   // @ts-ignore
  //   const { ethereum } = window;

  //   if (ethereum) {
  //     try {
  //       const response = await ethereum.request({
  //         method: "eth_requestAccounts",
  //       });
  //       console.log(response);
  //       setMetamaskKey(response);
  //     } catch (error) {}
  //   }
  // };

  // const disconnectMetamask = async () => {
  //   // @ts-ignore
  //   const { ethereum } = window;

  //   if (metamaskKey && ethereum) {
  //     await ethereum.request({
  //       method: "eth_requestAccounts",
  //       params: [{ eth_accounts: {} }],
  //     });
  //     setMetamaskKey(undefined);
  //   }
  // };

  const connectWelldone = async () => {
    // @ts-ignore
    const { dapp } = window;

    if (dapp) {
      try {
        const accounts = await dapp.request("near", {
          method: "dapp:accounts",
        });
        setWelldoneKey(accounts.near.address);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const disconnectWelldone = async () => {
    // @ts-ignore
    const { dapp } = window;

    if (welldoneKey && dapp) {
      await dapp.disable();
    }
  };

  async function getStakeAccount(
    stakeAccountSeed: string,
    fromPublicKey: PublicKey
  ) {
    const stakePubkey = await PublicKey.createWithSeed(
      fromPublicKey,
      stakeAccountSeed,
      StakeProgram.programId
    );
    // eslint-disable-next-line no-console
    console.log("stakePubkey - ", stakePubkey.toString());
    return stakePubkey;
  }

  const sendTx = async () => {
    // @ts-ignore
    const { solana } = window;

    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network);
    const RECENTBLOCKHASH = await connection.getLatestBlockhash();
    const ACCOUNTPUBKEY = new PublicKey(
      "8cXTm3AgfW6xVduFzC64FW1Pjx6aPPmtNwySqVLLJRq7"
    );
    const timeStamp = new Date().getTime();
    const STAKEACCOUNTSEED = timeStamp.toString();
    const stakePubkey = await getStakeAccount(STAKEACCOUNTSEED, ACCOUNTPUBKEY);
    const votePubkey = new PublicKey(
      "3NZ1Wa2spvK6dpbVBhgTh2qfjzNA6wxEAdXMsJJQCDQG"
    );
    const transaction = new Transaction({
      recentBlockhash: RECENTBLOCKHASH.blockhash,
      feePayer: ACCOUNTPUBKEY,
    });
    transaction.add(
      StakeProgram.createAccountWithSeed({
        fromPubkey: ACCOUNTPUBKEY,
        stakePubkey: stakePubkey,
        basePubkey: ACCOUNTPUBKEY,
        seed: STAKEACCOUNTSEED,
        authorized: new Authorized(ACCOUNTPUBKEY, ACCOUNTPUBKEY),
        lockup: new Lockup(0, 0, new PublicKey(0)),
        lamports: Number(0.1) * LAMPORTS_PER_SOL,
      }),
      // Delegate
      StakeProgram.delegate({
        stakePubkey: stakePubkey,
        authorizedPubkey: ACCOUNTPUBKEY,
        votePubkey: votePubkey,
      })
    );

    if (walletKey && solana) {
      const { signature } = await solana.signAndSendTransaction(transaction);
      await connection.confirmTransaction(signature);
      const wallet = new WelldoneWalletAdapter();
      // await wallet.connect();
      await wallet.signAndSendTransaction(transaction);
    }
  };

  const sendNearTx = async () => {
    // @ts-ignore

    const { dapp } = window;
    const accounts = await dapp.request("near", {
      method: "dapp:accounts",
    });
    const rpc: ConnectionInfo = "https://rpc.testnet.near.org";

    const provider = new providers.JsonRpcProvider(rpc);
    const accountLocal = accounts.address;
    const publicKey = accounts.pubKey;
    const signerId = accountLocal;
    const accessKey = await provider.query(
      `access_key/${signerId}/${publicKey}`,
      ""
    );
    const actions = [transactions.transfer(new BN(10))];
    const recentBlockHash = utils.serialize.base_decode(accessKey.block_hash);

    const transaction = transactions.createTransaction(
      accountLocal,
      utils.PublicKey.fromString(publicKey),
      "9bfd12934cd6fdd09199e2e267803c70bd7c6cb40832ac6f29811948dde2b723",
      accessKey.nonce + 1,
      actions,
      recentBlockHash
    );

    const bytes = Buffer.from(transaction.encode()).toString("base64");

    await dapp.request("near", {
      method: "dapp:sendTransaction",
      params: [`${bytes}`],
    });
  };

  // detect phantom provider exists
  useEffect(() => {
    const provider = getProvider();

    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h2>Connect to Wallet</h2>
        {provider && !walletKey && !welldoneKey && (
          <>
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWallet}
            >
              Connect to Phantom Wallet
            </button>
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWelldone}
            >
              Connect to Welldone
            </button>
          </>
        )}

        {provider && walletKey && !welldoneKey && (
          <div>
            <p>
              <>Connected account {walletKey}</>
            </p>

            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
                margin: "15px auto",
              }}
              onClick={disconnectWallet}
            >
              Disconnect
            </button>
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
                margin: "15px auto",
              }}
              onClick={sendTx}
            >
              SendTX
            </button>
          </div>
        )}

        {provider && !walletKey && welldoneKey && (
          <div>
            <p>
              <>Connected account {welldoneKey}</>
            </p>

            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
                margin: "15px auto",
              }}
              onClick={disconnectWelldone}
            >
              Disconnect
            </button>
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
                margin: "15px auto",
              }}
              onClick={sendNearTx}
            >
              send Transaction
            </button>
          </div>
        )}

        <p>
          Built by{" "}
          <a
            href="https://twitter.com/LeeUiHyeon"
            target="_blank"
            rel="noreferrer"
            className="twitter-link"
          >
            @LeeUiHyeon
          </a>
        </p>
      </header>
    </div>
  );
}

export default App;
