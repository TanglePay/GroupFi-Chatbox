import * as packageJson from '../package.json'

import { setExcludes, setIncludes } from 'redux/forMeGroupsSlice'
import store from './redux/store'

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

  setForMeGroups({
    includes,
    excludes
  }: {
    includes?: string[]
    excludes?: string[]
  }) {
    store.dispatch(setIncludes(includes))
    store.dispatch(setExcludes(excludes))
  }
}

export class TrollboxEventEmitter {
  oneMessageSent(messageData: {
    blockId: string
    message: string
    groupId: string
  }) {
    const methodName = 'one-message-sent'
    communicator.emitEvent({ method: methodName, messageData })
  }

  walletConnectedChanged(messageData: {
    walletConnectData?: {
      walletType: string
      address: string
      nodeId: number
    }
    disconnectReason?: string
  }) {
    const methodName = 'wallet-connected-changed'
    communicator.emitEvent({ method: methodName, messageData })
  }
}

export class Communicator {
  _sdkHandler: MessageHandler

  constructor(sdkHandler: MessageHandler) {
    this._sdkHandler = sdkHandler
  }

  _dappOrigin: string | undefined = undefined

  _dappWindow: WindowProxy | undefined = window.parent

  _handleMessage(messageData: MessageData) {
    let { cmd, id, data } = messageData
    cmd = (cmd || '').replace('contentToTrollbox##', '')
    try {
      if (cmd === 'get_trollbox_info') {
        const res = this._sdkHandler.getTrollboxInfo()
        this.sendMessage({ cmd, code: 200, reqId: id, messageData: res })
      } else if (cmd === 'trollbox_request') {
        const { method, params } = data
        switch (method) {
          case 'setForMeGroups': {
            this._sdkHandler.setForMeGroups(params)
            this.sendMessage({
              cmd,
              code: 200,
              reqId: id,
              messageData: { method: method, response: {} }
            })
          }
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
      return
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
    console.log('Trollbox send a message to Dapp:', cmd, messageData)
    this._dappWindow!.postMessage(
      {
        cmd: `contentToDapp##${cmd}`,
        reqId,
        code,
        data: messageData
      },
      this._dappOrigin!
    )
  }

  emitEvent({ method, messageData }: { method: string; messageData: any }) {
    console.log('Trollbox emits an event:', method, messageData)
    this._checkTargetWindowAndOrigin()
    this._dappWindow!.postMessage(
      {
        cmd: `contentToDapp##trollbox_emit_event`,
        data: {
          method,
          messageData
        }
      },
      this._dappOrigin!
    )
  }

  _onMessage = (event: MessageEvent<MessageData>) => {
    // true when message comes from iframe parent
    if (event.source !== window.parent) {
      return
    }

    console.log('Trollbox get a message from dapp:', event.data)

    if (this._dappOrigin === undefined) {
      this._dappOrigin = event.origin
    }

    this._handleMessage(event.data)
  }

  listenningMessage() {
    if (window.parent === window) {
      return
    }
    console.log('====>iframe start listenning message from dapp:')

    window.addEventListener('message', this._onMessage)

    return () => window.removeEventListener('message', this._onMessage)
  }
}

export const messageHandler = new MessageHandler()
export const trollboxEventEmitter = new TrollboxEventEmitter()
const communicator = new Communicator(messageHandler)
export default communicator
