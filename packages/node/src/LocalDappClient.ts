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
  private _privateKey: string;
  private _wallet: HDNodeWallet;

  constructor(privateKeyHex: string) {
    this._privateKey = privateKeyHex;
    // Generate the wallet from the private key hex
    this._wallet = new ethers.Wallet(privateKeyHex);
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
    const lowercasedLocal = this._wallet.address.toLowerCase();
    const lowercased = address.toLowerCase();
    if (lowercasedLocal !== lowercased) {
      throw new Error('Address mismatch, incoming address: ' + lowercased + ', local address: ' + lowercasedLocal);
    }

    // According to MetaMask's implementation, sign the message with EIP-191.
    const messageBytes = ethers.getBytes(message);
    const signedMessage = await this._wallet.signMessage(messageBytes);

    return signedMessage;
  }

  // Additional utility to get the derived address from the private key
  getAddress(): string {
    return this._wallet.address;
  }
}
