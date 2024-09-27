import TrollboxSDK from './index'
import { hexStringToUint8Array, uint8ArrayToHexString } from './util'
import { ethers } from 'ethers'

const isEthereumProvider = (provider: any) => {
  return provider.chainId !== undefined
}

export const requestHandler = {
  async handle(method: string, params: any) {
    switch (method) {
      case 'eth_decrypt':
        return await this.ethDecrypt(params)
      case 'personal_sign':
        return await this.personalSign(params)
      case 'eth_getEncryptionPublicKey':
        return await this.ethGetEncryptionPublicKey(params)
    }
  },
  ethDecrypt: async (params: any): Promise<{ code: number; res?: any }> => {
    try {
      if (TrollboxSDK.walletProvider === undefined) {
        throw new Error('walletProvider is undefined')
      }
      // const res = await window.ethereum.request({
      //   method: 'eth_decrypt',
      //   params: params,
      // });
      const res = await TrollboxSDK.walletProvider.request({
        method: 'eth_decrypt',
        params: params
      })
      return { code: 200, res }
    } catch (error) {
      return { code: 9999 }
    }
  },
  personalSign: async (params: any) => {
    try {
      if (TrollboxSDK.walletProvider === undefined) {
        throw new Error('walletProvider is undefined')
      }
      // const res = await window.ethereum.request({
      //   method: 'personal_sign',
      //   params,
      // });
      let res: any
      const [signTextHex, address] = params
      if (isEthereumProvider(TrollboxSDK.walletProvider)) {
        console.log('==>personal_sign params:', signTextHex, address)
        res = await TrollboxSDK.walletProvider.request({
          method: 'personal_sign',
          params: [signTextHex, address]
        })
        console.log('===>up personal_sign res:', res)
        const messageHash = ethers.hashMessage(hexStringToUint8Array(signTextHex))
        const signerAddress = ethers.recoverAddress(messageHash, res);
        console.log('===>up personal_sign signerAddress', signerAddress)
      } else {
        const encodedMessage = hexStringToUint8Array(signTextHex)
        const signedMessage = await TrollboxSDK.walletProvider.signMessage(
          encodedMessage,
          'utf8'
        )
        res = uint8ArrayToHexString(signedMessage.signature)
      }
      return { code: 200, res }
    } catch (error) {
      return { code: 9999 }
    }
  },
  ethGetEncryptionPublicKey: async (params: any) => {
    try {
      if (TrollboxSDK.walletProvider === undefined) {
        throw new Error('walletProvider is undefined')
      }
      // const res = (await window.ethereum.request({
      //   method: 'eth_getEncryptionPublicKey',
      //   params,
      // })) as string;
      const res = (await TrollboxSDK.walletProvider.request({
        method: 'eth_getEncryptionPublicKey',
        params
      })) as string
      return { code: 200, res }
    } catch (error) {
      return { code: 9999 }
    }
  }
}
