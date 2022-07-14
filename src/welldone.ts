import {
    // BaseMessageSignerWalletAdapter,
    SendTransactionOptions,
    WalletError,
    // WalletName,
    WalletReadyState,
} from '@solana/wallet-adapter-base';
import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';

// export const WelldoneWalletName = 'Welldone' as WalletName<'Welldone'>;

export class WelldoneWalletAdapter  {
    // name = WelldoneWalletName;
    url = 'https://welldonestudio.io';
    icon = '';

    private _dapp: any = null;
    private _network = '';

    private _connecting: boolean;
    private _publicKey: PublicKey | null;
    private _readyState: WalletReadyState =
        typeof window === 'undefined' || typeof document === 'undefined'
            ? WalletReadyState.Unsupported
            : WalletReadyState.NotDetected;

    constructor() {
        // super();
        this._connecting = false;
        this._dapp = null;
        this._publicKey = null;
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return !!this._dapp;
    }

    get readyState(): WalletReadyState {
        return this._readyState;
    }

    async connect(): Promise<void> {
        try {
            if (window && (window as any).dapp) {
                this._dapp = (window as any).dapp;
                this._dapp.on('chainChanged', this.updateNetwork.bind(this));
                this._dapp.on('accountsChanged', this.updateAccount.bind(this));
                await this.init();
            } else {
                this._dapp = {
                    request: () => {
                        return {
                            error: {
                                data: {
                                    error_message: 'provider is not activated',
                                    error_type: 'unknown',
                                }
                            },
                        };
                    }
                };
            }
        } catch (error: any) {
            // this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    /**
     * init sdk
     */
     private async init() {
         if (this._dapp._networks && this._dapp._networks.solana) {
            this._network = this._dapp._networks.solana.net.split(':')[1];
            if (this._dapp._networks.solana.address) {
                this._publicKey = new PublicKey(this._dapp._networks.solana.pubKey);
                // this.emit('connect', this._publicKey);
            }    
         }        
    }

    /**
     * update selected chain id
     */
        private updateNetwork(chainId: string) {
        const parsed = chainId.split(':');
        if (parsed[0] === 'near') {
            this._network = parsed[1];
            // this.emit('chainChanged', this._network);
        }
    }

    /**
     * update selected account
     */
    private updateAccount(accounts: {[key: string]: { address: string; pubKey: string}}) {
        if (accounts.solana && accounts.solana.address) {
            this._publicKey = new PublicKey(accounts.solana.pubKey);
            // this.emit('connect', this._publicKey);
        }
    }

    async disconnect(): Promise<void> {
        this._dapp = null;
        // this.emit('disconnect');
    }

    async sendTransaction(
        transaction: Transaction,
        connection: Connection,
        options?: SendTransactionOptions
    ): Promise<TransactionSignature> {
        // this.emit('error', new WalletError('sendTransaction is not support'));
        throw new Error('sendTransaction is not support');
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        // this.emit('error', new WalletError('signTransaction is not support'));
        throw new Error('signTransaction is not support');
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        // this.emit('error', new WalletError('signAllTransactions is not support'));
        throw new Error('signAllTransactions is not support');
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        // this.emit('error', new WalletError('signMessage is not support'));
        throw new Error('signMessage is not support');
    }

    async signAndSendTransaction(transaction: Transaction) {
        try {
            console.log(JSON.stringify({
                net: `solana:devnet`,
                method: 'dapp:sendTransaction',
                params: [`0x${transaction.serialize({verifySignatures: false}).toString('hex')}`]
            }))
            const response = await (window as any).dapp.request({
                net: `solana:devnet`,
                method: 'dapp:sendTransaction',
                params: [`0x${transaction.serialize({verifySignatures: false}).toString('hex')}`]
            });
            if (response.error) {
                // this.emit('error', new WalletError(response.error));
                throw new Error(response.error);    
            }
            return response;    
        } catch (error: any) {
            console.log(error)
            // this.emit('error', error);
            throw error;
        }
    }
}
