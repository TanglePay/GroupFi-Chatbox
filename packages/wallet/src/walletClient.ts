import {ethers} from 'ethers'
import { signMessage } from '@wagmi/core'
import { config } from './config'

export const walletClient = {
  
  async request({ method, params }: { method: string; params: any[] }): Promise<any> {
    // log className, method, params
    console.log('className:', this.constructor.name, 'method:', method, 'params:', params);

    switch (method) {
      case 'personal_sign':
        return this.personalSign(params[0], params[1]);
      default:
        throw new Error(`Method ${method} not supported`);
    }
  },

  async personalSign(message: string, address: string): Promise<string> {

    const messageBytes = ethers.getBytes(message);
    const decoder = new TextDecoder('utf-8');
    const signedMessage = await signMessage(config, {
      message: decoder.decode(messageBytes)
    })
    return signedMessage ?? ''
  }
}
