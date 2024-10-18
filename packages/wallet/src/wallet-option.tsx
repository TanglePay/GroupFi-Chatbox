import * as React from 'react'
import { useAccount, Connector, useConnect } from 'wagmi'
import { useDispatch } from 'react-redux'
import { setWalletInfo,setMetaMaskAccountFromDapp } from '../../pc/src/redux/appConfigSlice' // Update this import path
// import {
//   setWalletInfo,
//   setMetaMaskAccountFromDapp,
//   setIsBrowseMode
// } from 'redux/appConfigSlice'
import store from '../../pc/src/redux/store'
import { WalletType, MetaMaskWallet} from 'groupfi-sdk-chat'
import { useMessageDomain } from 'groupfi-sdk-chat'
import { ethers } from 'ethers'
// import {
//   isEvmAddress,
//   AddressTypeEvm,
//   AddressTypeSolana
// } from 'groupfi-sdk-core'

function isEvmAddress(address: string): boolean {
  return ethers.isAddress(address);
}
export function WalletOptions() {
  const { connectors, connect } = useConnect()
  const { messageDomain } = useMessageDomain() // Add this line
  const { address } = useAccount()

  // const dispatch = useDispatch()

  const handleConnect = async (connector: Connector) => {
    if (connector)
    try {
      await connect({ connector })
      store.dispatch(setWalletInfo({
        walletType: MetaMaskWallet
      })
    )
    messageDomain.isWalletConnected = () => true // Add this line
    console.log("walletInfo", store.getState().appConifg.walletInfo)

    // let account = connector.account
    // make evm account lower case
    if (address) {
      console.log('address12312', address)
      const lowerCaseAddress = isEvmAddress(address) ? address.toLowerCase() : address
      store.dispatch(setMetaMaskAccountFromDapp(lowerCaseAddress))
    }
    // if (isEvmAddress(account)) {
    //   account = account.toLowerCase()
    // }
    // store.dispatch(setMetaMaskAccountFromDapp(account))

    } catch (error) {
      console.error('Failed to connect wallet', error)
    }
    // console.log(walletType)
  }

  return connectors.map((connector) => (
    // 写样式
    <button key={connector.uid} onClick={() => handleConnect(connector)}>
      {connector.name}
    </button>
  ))
}