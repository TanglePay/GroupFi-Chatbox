import * as React from 'react'
import { useAccount, Connector, useConnect } from 'wagmi'
import { ethers } from 'ethers'


// function isEvmAddress(address: string): boolean {
//   return ethers.isAddress(address);
// }

export function WalletOptions() {
  const { connectors, connect } = useConnect()

  const handleConnect = async (connector: Connector) => {
    console.log('connector is111:', connector, Date.now());
    if (connector) {
      try {
        connect({ connector })
        // console.log('Connect result222:', result, Date.now(), address);

      } catch (error) {
        console.error('Failed to connect wallet', error)
      }
    }
  }

  return connectors.map((connector) => (
    <button key={connector.uid} onClick={() => handleConnect(connector)}>
      -{connector.name}-
    </button>
  ))
}
