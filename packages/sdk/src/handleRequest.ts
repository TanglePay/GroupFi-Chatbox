declare global {
  interface Window {
    ethereum: any;
  }
}

export const requestHandler = {
  async handle(method: string, params: any) {
    switch(method) {
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
      const res = await window.ethereum.request({
        method: 'eth_decrypt',
        params: params,
      });
      return { code: 200, res };
    } catch (error) {
      return { code: 9999 };
    }
  },
  personalSign: async (params: any) => {
    try {
      const res = await window.ethereum.request({
        method: 'personal_sign',
        params,
      });
      return { code: 200, res };
    } catch (error) {
      return { code: 9999 };
    }
  },
  ethGetEncryptionPublicKey: async (params: any) => {
    try {
      const res = (await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params,
      })) as string;
      return { code: 200, res };
    } catch (error) {
      return { code: 9999 };
    }
  },
};
