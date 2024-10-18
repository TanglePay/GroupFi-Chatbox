import React from 'react';
import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'
import { ethers } from 'ethers'
import store from '../../pc/src/redux/store'
import { setWalletInfo, setMetaMaskAccountFromDapp } from '../../pc/src/redux/appConfigSlice' // Update this import path
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

  if (address) {
    store.dispatch(setMetaMaskAccountFromDapp(address))
  }

  return (
    <div>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{ensName ? `${ensName} (${address})` : address}</div>}
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}