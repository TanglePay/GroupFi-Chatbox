import * as packageJson from '../package.json'

import { setIncludes } from 'redux/forMeGroupsSlice'
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

  setGroups(groupNames: string[] | undefined) {
    store.dispatch(setIncludes(groupNames))
  }
}

export class TrollboxEventEmitter {
  sendOneMessage(messageData: {
    blockId: string
    message: string
    groupId: string
  }) {
    const methodName = 'one-message'
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
    try {
      let { cmd, id, data } = messageData
      cmd = (cmd || '').replace('contentToTrollbox##', '')

      if (cmd === 'get_trollbox_info') {
        const res = this._sdkHandler.getTrollboxInfo()
        this.sendMessage({ cmd, code: 200, reqId: id, messageData: res })
      } else if (cmd === 'trollbox_request') {
        const { method, params } = data
        switch (method) {
          case 'setGroups': {
            this._sdkHandler.setGroups(params)
          }
        }
      }
    } catch (error) {
      console.log('Handle message error', error)
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
