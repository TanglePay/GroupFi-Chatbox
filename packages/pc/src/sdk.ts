import * as packageJson from '../package.json'

interface MessageData {
  cmd: string
  id: number
  origin: string
  data: any
}

class SDKHandler {
  getTrollboxInfo() {
    return {
      version: packageJson.version
    }
  }
}

const sdkHandler = new SDKHandler()

class SDKReceiver {
  _dappOrigin: string | undefined = undefined

  _dappWindow: WindowProxy | undefined = window.parent

  _handleMessage(messageData: MessageData) {
    try {
      let { cmd, id, data } = messageData
      cmd = (cmd || '').replace('contentToTrollbox##', '')
      switch (cmd) {
        case 'getTrollboxInfo': {
          const res = sdkHandler.getTrollboxInfo()
          this.sendMessage(cmd, res)
          break
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

  sendMessage(cmd: string, messageData: any) {
    this._checkTargetWindowAndOrigin()
    this._dappWindow!.postMessage({
      cmd: `contentToDapp##${cmd}`, 
      data: messageData
    }, this._dappOrigin!)
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

export default new SDKReceiver()
