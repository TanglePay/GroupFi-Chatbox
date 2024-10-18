import { useAccount } from 'wagmi'
import { Account } from './account'
import { WalletOptions } from './wallet-option'
import React from 'react';

export function ConnectWallet() {

  const { isConnected } = useAccount()
  
  if (isConnected) return <Account />
  return <WalletOptions />
}
