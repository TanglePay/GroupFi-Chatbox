// Keep the type import as it is
import { HDNodeWallet } from 'ethers';

// Convert runtime module imports to CommonJS style
const ethers = require('ethers');


// Define an interface for dappClient
export interface IDappClient {
  request({ method, params }: { method: string; params: any[] }): Promise<any>;
}

// Define request params for personal_sign
export interface IPersonalSignParams {
  message: string;
  address: string;
}

export class LocalDappClient implements IDappClient {
  private _mnemonic: string;
  private _wallet: HDNodeWallet;

  constructor(mnemonic: string) {
    this._mnemonic = mnemonic;
    const mnemonicObj = ethers.Mnemonic.fromPhrase(this._mnemonic);
    // Use the Mnemonic object to derive the wallet
    this._wallet = ethers.HDNodeWallet.fromMnemonic(mnemonicObj);
  }

  // Implementing the request method
  async request({ method, params }: { method: string; params: any[] }): Promise<any> {
    // log className, method, params
    console.log('className:', this.constructor.name, 'method:', method, 'params:', params);

    switch (method) {
      case 'personal_sign':
        return this.personalSign(params[0], params[1]);
      default:
        throw new Error(`Method ${method} not supported`);
    }
  }

  // Personal sign method that aligns with MetaMask's request format
  async personalSign(message: string, address: string): Promise<string> {
    if (address !== this._wallet.address) {
      throw new Error('Address mismatch');
    }

    // According to MetaMask's implementation, sign the message with EIP-191.
    const messageBytes = ethers.toUtf8Bytes(message);
    const signedMessage = await this._wallet.signMessage(messageBytes);

    return signedMessage;
  }

  // Additional utility to get the derived address from the mnemonic
  getAddress(): string {
    return this._wallet.address;
  }
}
