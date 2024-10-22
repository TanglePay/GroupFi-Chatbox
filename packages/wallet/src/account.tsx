import React from 'react';
import { useAccount,useEnsName } from 'wagmi'
import { ethers } from 'ethers'
import store from '../../pc/src/redux/store'
import { setWalletInfo, setMetaMaskAccountFromDapp, setIsBrowseMode } from '../../pc/src/redux/appConfigSlice'
import { useMessageDomain } from 'groupfi-sdk-chat' // Add this import
import { MetaMaskWallet } from 'groupfi-sdk-chat'
import { ConnectButton } from '@rainbow-me/rainbowkit';

function isEvmAddress(address: string): boolean {
  return ethers.isAddress(address);
}


export function Account() {
  const { address, status, isDisconnected } = useAccount()
  const { messageDomain } = useMessageDomain() // Add this line


  React.useEffect(() => {
    console.log('account changed', address, Date.now());

    if (address) {
      store.dispatch(setWalletInfo({walletType: MetaMaskWallet}))
      const lowerCaseAddress = isEvmAddress(address) ? address.toLowerCase() : address
      store.dispatch(setMetaMaskAccountFromDapp(lowerCaseAddress))
      messageDomain.isWalletConnected = () => true
      store.dispatch(setIsBrowseMode(false))
    }
  }, [address]);

  React.useEffect(() => {  
    console.log('account changed222', isDisconnected)
    store.dispatch(setIsBrowseMode(isDisconnected))
  },[isDisconnected]);

  return (
    <ConnectButton />
  )
}
