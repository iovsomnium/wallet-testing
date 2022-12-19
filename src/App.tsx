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

import { WelldoneWalletAdapter } from "./welldone";
import "./App.css";
import Web3 from "web3";

const abi = require("./abi.json");
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

  const [metamaskKey, setMetamaskKey] = useState<string>();
  // const [welldoneKey, setWelldoneKey] = useState<string>();

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

  const connectMetamask = async () => {
    // @ts-ignore
    const { ethereum } = window;

    if (ethereum) {
      try {
        const response = await ethereum.request({
          method: "eth_requestAccounts",
        });
        console.log(response);
        setMetamaskKey(response);
      } catch (error) {}
    }
  };

  const disconnectMetamask = async () => {
    // @ts-ignore
    const { ethereum } = window;

    if (metamaskKey && ethereum) {
      await ethereum.request({
        method: "eth_requestAccounts",
        params: [{ eth_accounts: {} }],
      });
      setMetamaskKey(undefined);
    }
  };

  // const connectWelldone = async () => {
  //   // @ts-ignore
  //   const { dapp } = window;

  //   if (dapp) {
  //     try {
  //       const accounts = await dapp.request("cosmos", {
  //         method: "dapp:accounts",
  //       });
  //       setWelldoneKey(accounts.cosmos.address);
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }
  // };

  // const disconnectKeplr = async () => {
  //   // @ts-ignore
  //   const { keplr } = window;

  //   if (welldoneKey && keplr) {
  //     await keplr.disable();
  //   }
  // };

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

  const sendMetamaskTx = async () => {
    // @ts-ignore
    const { ethereum } = window;

    try {
      const web3 = new Web3(ethereum);
      const PolygonContract = new web3.eth.Contract(
        abi,
        "0x5DDBeE6aD14852d5F78b6eeb6b040391821ff45C"
      );
      console.log(111, PolygonContract);
      const result = await PolygonContract.methods
        .unbonds_new("0xF1238CE800C5596DC7F7F2451c901E0fFABb0A53", 2)
        .call();
      console.log("result: ", result);

      // const rawParam = await fetch(
      //   "https://builder.staking.dsrv.com/polygon/migration/tx",
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       msg_sender: String(metamaskKey),
      //       from_validator_id: "64",
      //       to_validator_id: "10",
      //       amount: "100000000000000000",
      //     }),
      //   }
      // ).then((response) => {
      //   return response.json();
      // });
      // const transactionParameters = rawParam.params[0];
      // const txHash = await ethereum.request({
      //   method: "eth_sendTransaction",
      //   params: [transactionParameters],
      // });
      // console.log(119, txHash);
    } catch (error) {
      console.log(`error: ${error}`);
    }
  };

  // const addChain = async () => {
  //   const chainData = {
  //     chainId: "osmo-test-4",
  //     chainName: "Osmosis Testnet",
  //     rpc: "https://osmosis-testnet-rpc.allthatnode.com:26657/",
  //     rest: "https://osmosis-testnet-rpc.allthatnode.com:1317/",
  //     bip44: {
  //       coinType: 118,
  //     },
  //     bech32Config: {
  //       bech32PrefixAccAddr: "osmo",
  //       bech32PrefixAccPub: "osmopub",
  //       bech32PrefixValAddr: "osmovaloper",
  //       bech32PrefixValPub: "osmovaloperpub",
  //       bech32PrefixConsAddr: "osmovalcons",
  //       bech32PrefixConsPub: "osmovalconspub",
  //     },
  //     stakeCurrency: {
  //       coinDenom: "OSMO",
  //       coinMinimalDenom: "uosmo",
  //       coinDecimals: 6,
  //     },
  //     currencies: [
  //       {
  //         coinDenom: "OSMO",
  //         coinMinimalDenom: "uosmo",
  //         coinDecimals: 6,
  //       },
  //     ],
  //     feeCurrencies: [
  //       {
  //         coinDenom: "OSMO",
  //         coinMinimalDenom: "uosmo",
  //         coinDecimals: 6,
  //       },
  //     ],
  //     explorer: "https://testnet.mintscan.io/osmosis-testnet",
  //     coinType: 118,
  //     // gasPriceStep: {
  //     //   low: 0.01,
  //     //   average: 0.025,
  //     //   high: 0.05
  //     // }
  //   };

  //   // @ts-ignore
  //   const { dapp } = window;
  //   await dapp.request("cosmos", {
  //     method: "dapp:addChain",
  //     params: [chainData],
  //   });
  // };

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
        {provider && !walletKey && !metamaskKey && (
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
              onClick={connectMetamask}
            >
              Connect to Meta mask
            </button>
            {/* <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWelldone}
            >
              Connect to Welldone
            </button> */}
          </>
        )}

        {provider && walletKey && !metamaskKey && (
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
        {provider && !walletKey && metamaskKey && (
          <div>
            <p>
              <>Connected account {metamaskKey}</>
            </p>

            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
                margin: "15px auto",
              }}
              onClick={disconnectMetamask}
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
              onClick={sendMetamaskTx}
            >
              SendTX
            </button>
          </div>
        )}

        {/* {provider && !walletKey && welldoneKey && (
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
              onClick={disconnectKeplr}
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
              onClick={addChain}
            >
              add Test Chain
            </button>
          </div>
        )} */}

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
