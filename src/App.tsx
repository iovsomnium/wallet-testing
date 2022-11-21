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

import "./App.css";

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

  /**
   * @description gets Phantom provider, if it exists
   */
  const getProvider = () => {
    if ("phantom" in window) {
      // @ts-ignore
      const provider = window.phantom?.solana;

      if (provider?.isPhantom) {
        return provider;
      }
    }

    window.open("https://phantom.app/", "_blank");
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
    const provider = getProvider();

    const network = "https://api.devnet.solana.com";
    const connection = new Connection(network);
    const RECENTBLOCKHASH = await connection.getLatestBlockhash();
    const ACCOUNTPUBKEY = provider.publicKey.toString();
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

    if (walletKey && provider) {
      const { signature } = await provider.signAndSendTransaction(transaction);
      console.log(signature);
      await connection.confirmTransaction(signature);
    }
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
        <h2>Tutorial: Connect to Phantom Wallet</h2>
        {provider && !walletKey && (
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
        )}

        {provider && walletKey && (
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

        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}

        <p>
          Built by{" "}
          <a
            href="https://twitter.com/arealesramirez"
            target="_blank"
            rel="noreferrer"
            className="twitter-link"
          >
            @arealesramirez
          </a>
        </p>
      </header>
    </div>
  );
}

export default App;
