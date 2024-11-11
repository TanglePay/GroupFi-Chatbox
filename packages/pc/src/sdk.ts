import * as packageJson from '../package.json'
import {
  isEvmAddress,
} from 'groupfi-sdk-core'

import store from './redux/store'
import {
  setWalletInfo,
  setMetaMaskAccountFromDapp,
  setIsBrowseMode
} from 'redux/appConfigSlice'
import {
  WalletType,
  MessageAggregateRootDomain,
  TanglePayWallet,
  MetaMaskWallet
} from 'groupfi-sdk-chat'

import {
  JsonRpcEngine,
  JsonRpcResponse,
  EventCallback
} from 'tanglepaysdk-common'
import { setDappDoamin } from 'utils/storage'
import { WalletInfo } from 'redux/types'

interface SendToDappParam {
  cmd: string
  origin?: string
  data?: any
  id?: number
}

const sdkRequests: Record<string, EventCallback> = {}
let _seq = 1
const _rpcVersion = 101
const _rpcEngine = JsonRpcEngine.builder<SendToDappParam, unknown>()
  .add(async (req, next) => {
    req.id = _seq++
    req.version = _rpcVersion
    req.params!.cmd = `${req.params!.cmd}`
    req.params!.origin = window.location.origin
    req.params!.id = req.id
    return next!(req)
  })
  .add(async (req) => {
    const { id, data, cmd } = req.params!
    communicator.sendMessage({ cmd, code: 100, reqId: id!, messageData: data })
    // context!.targetWindow.postMessage(req.params, context!.targetOrigin);
    const { method } = data
    if (cmd === 'sdk_request') {
      return new Promise<JsonRpcResponse<unknown>>((resolve, reject) => {
        sdkRequests[`sdk_request_${method}_${req.id ?? 0}`] = (
          res: any,
          code: number
        ) => {
          if (code === 200) {
            resolve({ id: id!, version: 100, data: res })
          } else {
            reject(res)
          }
        }
      })
    } else {
      return { id: req.id!, version: 100, data: undefined }
    }
  })
  .build()

interface MessageData {
  cmd: string
  id: number
  origin: string
  data: any
}

export class MessageHandler {
  getTrollboxInfo() {
    return {
      version: packageJson.version
    }
  }

  onWalletTypeUpdate(params: { walletType: string | undefined }) {
    const { walletType } = params

    store.dispatch(
      setWalletInfo(
        walletType !== undefined
          ? {
              walletType: walletType as unknown as WalletType
            }
          : undefined
      )
    )
  }

  onWalletTypeChanged(params: {
    isWalletConnected: boolean
    isGroupfiNativeMode: boolean
  }) {
    const isBrowseMode = !params.isWalletConnected
    store.dispatch(setIsBrowseMode(isBrowseMode))

    if (!isBrowseMode) {
      const walletInfo: WalletInfo = params.isGroupfiNativeMode
        ? { walletType: TanglePayWallet }
        : { walletType: MetaMaskWallet }
      store.dispatch(setWalletInfo(walletInfo))
      store.dispatch(setMetaMaskAccountFromDapp(undefined))
    }
  }

  onMetaMaskAccountChange(data: { account: string }) {
    let account = data.account
    // make evm account lower case
    if (isEvmAddress(account)) {
      account = account.toLowerCase()
    }
    store.dispatch(setMetaMaskAccountFromDapp(account))
  }
}

export const WalletClient = {
  async request({ method, params }: { method: string; params: any }) {
    const res = await _rpcEngine.request({
      params: {
        cmd: 'sdk_request',
        data: { method, params }
      }
    })
    if (res.error) {
      return res.error
    }
    return res.data
  }
}

export class Communicator {
  _sdkHandler: MessageHandler

  constructor(sdkHandler: MessageHandler) {
    this._sdkHandler = sdkHandler
  }

  _initStorage() {
    console.log('🚀 ~ Communicator ~ _initStorage ~ _initStorage:')
    setDappDoamin(this.getDappDomain())
    console.log(
      '🚀 ~ Communicator ~ _initStorage ~ this.getDappDomain():',
      this.getDappDomain()
    )
  }

  _messageDomain?: MessageAggregateRootDomain
  setMesssageDomain(messageDomain: MessageAggregateRootDomain) {
    this._messageDomain = messageDomain
  }
  getDappDomain(): string | undefined {
    if (this._dappOrigin === undefined) {
      return undefined
    }
    const url = new URL(this._dappOrigin)
    return url.hostname
  }

  _dappOrigin: string | undefined = undefined

  _dappWindow: WindowProxy | undefined = window.parent

  _handleMessage(messageData: MessageData) {
    let { cmd, id, data } = messageData
    console.info(
      '🚀 ~ Communicator ~ _handleMessage ~ messageData:',
      messageData
    )
    cmd = (cmd || '').replace('contentToChatbox##', '')
    try {
      switch (cmd) {
        case 'get_chatbox_info': {
          const res = this._sdkHandler.getTrollboxInfo()
          this.sendMessage({ cmd, code: 200, reqId: id, messageData: res })
          break
        }
        case 'chatbox_request': {
          const { method, params } = data
          switch (method) {
            case 'setGroups':
              {
                this._messageDomain?.setDappIncluding(params)
                this.sendMessage({
                  cmd,
                  code: 200,
                  reqId: id,
                  messageData: { method: method, response: {} }
                })
              }
              break
            case 'addAccountToGroupByGroupId': {
              const { groupId } = params
              const groupFiService = this._messageDomain?.getGroupFiService()
              // const groupId = groupFiService?.groupNameToGroupId(groupName)
              if (groupId) {
                groupFiService?.getGroupMarked(groupId).then((groupMarked) => {
                  if (groupMarked) {
                    this._messageDomain?.joinGroup(groupId)
                  }
                })
              }
              break
            }
          }
          break
        }
        case 'dapp_event': {
          const { key, data: eventData } = data
          if (key === 'wallet-type-changed') {
            this._sdkHandler.onWalletTypeChanged(eventData)
          } else if (key === 'wallet-type-update') {
            this._sdkHandler.onWalletTypeUpdate(eventData)
          } else if (key === 'metamask-account-changed') {
            this._sdkHandler.onMetaMaskAccountChange(eventData)
          }
          break
        }
        case 'sdk_request': {
          const callBack = sdkRequests[`sdk_request_${data.method}_${id ?? 0}`]
          if (callBack) {
            const { res, code } = data.data
            callBack(res, code)
          }
          break
        }
      }
    } catch (error) {
      console.log('Handle message error', error)
      this.sendMessage({
        cmd,
        code: 99999,
        reqId: id,
        messageData: {
          response: error
        }
      })
    }
  }

  _checkTargetWindowAndOrigin() {
    if (this._dappWindow === undefined || this._dappOrigin === undefined) {
      console.error('DappWindow or DappOrigin is undefined.')
    }
  }

  sendMessage({
    cmd,
    code,
    reqId,
    messageData
  }: {
    cmd: string
    reqId: number
    code: number
    messageData: any
  }) {
    this._checkTargetWindowAndOrigin()
    console.log(
      'Trollbox send a message to Dapp:',
      cmd,
      messageData,
      this._dappWindow
    )
    this._dappWindow!.postMessage(
      {
        cmd: `contentToDapp##${cmd}`,
        reqId,
        code,
        data: messageData
      },
      // this._dappOrigin!
      "*"
    )
  }

  _onMessage = (event: MessageEvent<MessageData>) => {
    // true when message comes from iframe parent
    if (event.source !== window.parent) {
      return
    }

    if (this._dappOrigin === undefined) {
      this._dappOrigin = event.origin
      this._initStorage()
    }

    this._handleMessage(event.data)
  }

  listenningMessage() {
    console.info(
      '🚀 ~ Communicator ~ listenningMessage ~ window.parent:',
      window.parent
    )
    if (window.parent === window) {
      return
    }

    window.addEventListener('message', this._onMessage)

    return () => window.removeEventListener('message', this._onMessage)
  }
}

export const messageHandler = new MessageHandler()
const communicator = new Communicator(messageHandler)
export default communicator
