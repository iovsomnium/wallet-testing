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
import { WalletConnection, connect, keyStores, Near } from "near-api-js";

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

// const connectionConfig = {
//   networkId: "mainnet",
//   keyStore: new keyStores.BrowserLocalStorageKeyStore(),
//   nodeUrl: "https://rpc.mainnet.near.org",
//   walletUrl: "https://wallet.mainnet.near.org",
//   helperUrl: "https://helper.mainnet.near.org",
//   explorerUrl: "https://explorer.mainnet.near.org",
// };

const connectionConfig = {
  networkId: "mainnet",
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: "https://rpc.mainnet.near.org",
  walletUrl: "https://wallet.mainnet.near.org",
  helperUrl: "https://helper.mainnet.near.org",
  explorerUrl: "https://explorer.mainnet.near.org",
};

function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );

  // const [metamaskKey, setMetamaskKey] = useState<string>();
  const [nearKey, setNearKey] = useState<string>();

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

  const connectNear = async () => {
    // connect to NEAR
    const nearConnection = await connect(connectionConfig);

    // create wallet connection
    const walletConnection = new WalletConnection(nearConnection, "");
    if (!walletConnection.isSignedIn()) {
      walletConnection.requestSignIn({
        successUrl: "http://localhost:3000/",
        failureUrl: "https://localhost:3000/", // optional redirect URL on failure
      });
    } else if (walletConnection.isSignedIn()) {
      setNearKey(walletConnection.getAccountId());
      const account = await nearConnection.account(
        walletConnection.getAccountId()
      );
      console.log(account);
    }
  };

  const disconnectNear = async () => {
    // connect to NEAR
    const nearConnection = await connect(connectionConfig);

    // create wallet connection
    const walletConnection = new WalletConnection(nearConnection, "");
    walletConnection.signOut();
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

  const sendNearTx = async () => {};

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
        {provider && !walletKey && !nearKey && (
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
              onClick={connectNear}
            >
              Connect to Welldone
            </button>
          </>
        )}

        {provider && walletKey && !nearKey && (
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

        {provider && !walletKey && nearKey && (
          <div>
            <p>
              <>Connected account {nearKey}</>
            </p>

            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
                margin: "15px auto",
              }}
              onClick={disconnectNear}
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
