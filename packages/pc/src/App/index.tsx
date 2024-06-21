import { useEffect } from 'react'
import { useAppSelector } from '../redux/hooks'
import { AppWithWalletType, AppLaunchBrowseMode } from './App'
import { MqttClient } from '@iota/mqtt.js'
import { LocalStorageAdaptor, checkIsTrollboxInIframe } from 'utils'
import { connect } from 'mqtt'
import { AppLoading } from 'components/Shared'

import './App.scss'

import {
  MetaMaskWallet,
  TanglePayWallet,
  useMessageDomain
} from 'groupfi_chatbox_shared'

import sdkInstance, { DappClient } from '../sdk'

export default function AppEntryPoint() {
  // Check if Trollbox is in an iframe
  console.log('if trollbox is in an iframe', checkIsTrollboxInIframe())
  const isTrollboxInIframe = checkIsTrollboxInIframe()

  const walletInfo = useAppSelector((state) => state.appConifg.walletInfo)
  const isBrowseMode = useAppSelector(state => state.appConifg.isBrowseMode)

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
    // Set Dapp client
    groupfiService.setDappClient(DappClient)
    sdkInstance.setMesssageDomain(messageDomain)
    const stopListenningDappMessage = sdkInstance.listenningMessage()

    return stopListenningDappMessage
  }, [])

  // if not in an iframe, connect TanglePay Wallet directly
  if (!isTrollboxInIframe) {
    return (
      <AppWithWalletType
        walletType={TanglePayWallet}
        metaMaskAccountFromDapp={undefined}
      />
    )
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
