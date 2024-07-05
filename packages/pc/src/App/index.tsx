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

export const tracerObj: {stepName: string, start: number}[] = []
const hash: {[key: string]: 0|1} = {}

export function addStep(stepName: string, ifCalculate?: boolean) {
  if (hash[stepName] === undefined) {
    tracerObj.push({
      stepName,
      start: Date.now()
    })
    hash[stepName] = 1
    console.log('tracerObj', tracerObj)
  }
  if (ifCalculate) {
    const res: {[key: string]: number} = {}
    for(let i = 1; i<tracerObj.length; i++) {
      const {stepName, start} = tracerObj[i]
      res[stepName] = start - tracerObj[i-1].start
    }
    console.log('tracerObj res', res)
  }
}

export default function AppEntryPoint() {
  // Check if Trollbox is in an iframe
  console.log('if trollbox is in an iframe', checkIsTrollboxInIframe())
  addStep('step1: iframe start load')
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
