import React from 'react';
import { useAccount } from 'wagmi'
import { ethers } from 'ethers'
import store from '../../pc/src/redux/store'
import { setWalletInfo, setMetaMaskAccountFromDapp, setIsBrowseMode } from '../../pc/src/redux/appConfigSlice'
import { useMessageDomain } from 'groupfi-sdk-chat' 
import { MetaMaskWallet } from 'groupfi-sdk-chat'
import { ConnectButton } from '@rainbow-me/rainbowkit';

function isEvmAddress(address: string): boolean {
  return ethers.isAddress(address);
}


export function Account() {
  const { address, isDisconnected } = useAccount()
  const { messageDomain } = useMessageDomain() 

  
  React.useEffect(() => {
    console.log('account changed', address, Date.now());

    if (address) {
      store.dispatch(setWalletInfo({walletType: MetaMaskWallet}))
      const lowerCaseAddress = isEvmAddress(address) ? address.toLowerCase() : address
      store.dispatch(setMetaMaskAccountFromDapp(lowerCaseAddress))
      messageDomain.isWalletConnected = () => true
      store.dispatch(setIsBrowseMode(false))
    }

    if (!address) {
      store.dispatch(setIsBrowseMode(isDisconnected))

    }
  }, [address]);

  return (
    <ConnectButton />
  )
}
