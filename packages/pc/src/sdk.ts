import * as packageJson from '../package.json'

import { setIncludes } from 'redux/forMeGroupsSlice'
import { AppDispatch } from './redux/store'

interface MessageData {
  cmd: string
  id: number
  origin: string
  data: any
}

export class SDKHandler {
  appDispath

  constructor(appDispatch: AppDispatch) {
    this.appDispath = appDispatch
  }

  getTrollboxInfo() {
    return {
      version: packageJson.version
    }
  }

  setGroups(groupNames: string[] | undefined) {
    console.log('===>groupNames', groupNames)
    debugger
    if (groupNames === undefined) {
      this.appDispath(setIncludes(undefined))
    } else if (Array.isArray(groupNames)) {
      this.appDispath(setIncludes(groupNames))
    }
  }
}

export class SDKReceiver {
  _sdkHandler: SDKHandler

  constructor(sdkHandler: SDKHandler) {
    this._sdkHandler = sdkHandler
  }

  _dappOrigin: string | undefined = undefined

  _dappWindow: WindowProxy | undefined = window.parent

  _handleMessage(messageData: MessageData) {
    try {
      let { cmd, id, data } = messageData
      cmd = (cmd || '').replace('contentToTrollbox##', '')

      if (cmd === 'getTrollboxInfo') {
        const res = this._sdkHandler.getTrollboxInfo()
        this.sendMessage({ cmd, code: 200, reqId: id, messageData: res })
        return
      }
      if (cmd === 'trollbox_request') {
        const { method, params } = data
        switch (method) {
          case 'setGroups': {
            console.log('===>', method, params)
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

  _onMessage = (event: MessageEvent<MessageData>) => {
    // true when message comes from iframe parent
    if (event.source !== window.parent) {
      // console.log('===> event.source !== window.parent')
      return
    }

    if (this._dappOrigin === undefined) {
      this._dappOrigin = event.origin
    }

    this._handleMessage(event.data)
  }

  listenningMessage() {
    if (window.parent === window) {
      console.log('===>Trollbox is not in an iframe')
      return
    }
    console.log('====> start listenning message from dapp')

    window.addEventListener('message', this._onMessage)

    return () => window.removeEventListener('message', this._onMessage)
  }
}
