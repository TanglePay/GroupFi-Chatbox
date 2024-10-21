import React from 'react';
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'
import { ethers } from 'ethers'
import store from '../../pc/src/redux/store'
import { setWalletInfo, setMetaMaskAccountFromDapp, setIsBrowseMode } from '../../pc/src/redux/appConfigSlice'
import { useMessageDomain } from 'groupfi-sdk-chat' // Add this import
import { WalletType, MetaMaskWallet} from 'groupfi-sdk-chat'

// import { type Config, getClient } from '@wagmi/core'
// import { FallbackProvider, JsonRpcProvider } from 'ethers'
// import type { Client, Chain, Transport } from 'viem'


function isEvmAddress(address: string): boolean {
  return ethers.isAddress(address);
}


export function Account() {
  const { address } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })
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

  const handleDisconnect = () => {
    disconnect();
    console.log('Connect result333:', address, Date.now());
    store.dispatch(setIsBrowseMode(true))
    messageDomain.isWalletConnected = () => false
  };

  return (
    <div>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{ensName ? `${ensName} (${address})` : address}</div>}
      <button onClick={handleDisconnect}>Disconnect</button>
    </div>
  )
}
