import { useEffect, useRef, useLayoutEffect } from 'react'
import { useAppSelector } from '../redux/hooks'
import { AppWithWalletType, AppLaunchBrowseMode } from './App'
import { MqttClient } from '@iota/mqtt.js'
import { LocalStorageAdaptor, checkIsTrollboxInIframe } from 'utils'
import { connect } from 'mqtt'
import { AppLoading } from 'components/Shared'
import { WalletInfo } from '../redux/types'

import './App.scss'

import {
  MetaMaskWallet,
  TanglePayWallet,
  useMessageDomain
} from 'groupfi-sdk-chat'

import sdkInstance from '../sdk'
import { walletClient } from '../../../wallet/src/walletClient'
import { DAPP_INCLUDES } from '../groupconfig';

export default function AppEntryPoint() {
  // Check if Trollbox is in an iframe
  console.log('if chatbox is in an iframe', checkIsTrollboxInIframe())
  const isTrollboxInIframe = checkIsTrollboxInIframe()

  const walletInfo = useAppSelector((state) => state.appConifg.walletInfo)
  const isBrowseMode = useAppSelector((state) => state.appConifg.isBrowseMode)
  

  const metaMaskAccountFromDapp = useAppSelector(
    (state) => state.appConifg.metaMaskAccountFromDapp
  )

  const { messageDomain } = useMessageDomain()

  const groupfiService = messageDomain.getGroupFiService()

  const setLocalStorageAndMqtt = async () => {
    // 1. set localstorae adapter
    const adapter = new LocalStorageAdaptor()
    messageDomain.setStorageAdaptor(adapter)

    // 2. Mqtt connect, connect to groupfi service
    await messageDomain.setupGroupFiMqttConnection(connect)

    // 3. 3MqttClient, connect to hornet node
    await groupfiService.setupIotaMqttConnection(MqttClient)
  }

  useEffect(() => {
    setLocalStorageAndMqtt()
    // Set Wallet client
    groupfiService.setWalletClient(walletClient)
    sdkInstance.setMesssageDomain(messageDomain)
    const stopListenningDappMessage = sdkInstance.listenningMessage()
    return stopListenningDappMessage
  }, [])

  useEffect(() => {
    messageDomain?.setDappIncluding({ includes: DAPP_INCLUDES })
  })

  // if not in an iframe, connect TanglePay Wallet directly
  // if (!isTrollboxInIframe) {
  //   return (
  //     <AppWithWalletType
  //       walletType={TanglePayWallet}
  //       metaMaskAccountFromDapp={undefined}
  //     />
  //   )
  // }

  return (
    <AppLaunch
      isBrowseMode={isBrowseMode}
      walletInfo={walletInfo}
      metaMaskAccountFromDapp={metaMaskAccountFromDapp}
    />
  )

  // if (isBrowseMode) {
  //   return <AppLaunchBrowseMode />
  // }

  // if (!walletInfo) {
  //   return <AppLaunchBrowseMode />
  // }

  // if (walletInfo.walletType === MetaMaskWallet && !metaMaskAccountFromDapp) {
  //   return <AppLoading />
  // }

  // return (
  //   <AppWithWalletType
  //     walletType={walletInfo.walletType}
  //     metaMaskAccountFromDapp={metaMaskAccountFromDapp}
  //   />
  // )
}

interface AppLaunchProps {
  isBrowseMode: boolean
  walletInfo?: WalletInfo
  metaMaskAccountFromDapp?: string
}

function AppLaunch(props: AppLaunchProps) {
  const { isBrowseMode, walletInfo, metaMaskAccountFromDapp } = props

  const prevProps = useRef<AppLaunchProps | null>(null)

  const isMessageDomainIniting = useAppSelector(
    (state) => state.appConifg.isMessageDomainIniting
  )

  useLayoutEffect(() => {
    prevProps.current = props
  })

  if (isMessageDomainIniting && props !== prevProps.current) {
    return <AppLoading />
  }

  if (isBrowseMode) {
    return <AppLaunchBrowseMode />
  }

  if (!walletInfo) {
    return <AppLaunchBrowseMode />
  }

  if (walletInfo.walletType === MetaMaskWallet && !metaMaskAccountFromDapp) {
    return <AppLoading />
  }

  return (
    <AppWithWalletType
      walletType={walletInfo.walletType}
      metaMaskAccountFromDapp={metaMaskAccountFromDapp}
    />
  )
}
