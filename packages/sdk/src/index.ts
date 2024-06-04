import { EventEmitter } from 'events';
import {
  EventCallback,
  JsonRpcEngine,
  JsonRpcResponse,
} from 'tanglepaysdk-common';
import {
  SendToTrollboxParam,
  TrollboxResponse,
  TrollboxReadyEventData,
  LoadTrollboxParams,
} from './types';
import { genOnLoad } from './page';
import './page.css';
import { requestHandler } from './handleRequest';

export interface TargetContext {
  targetWindow: WindowProxy;
  targetOrigin: string;
}

let context: TargetContext | undefined = undefined;

const init = (context: TargetContext) => {
  console.log('set context start', context);
  setContext(context);
  console.log('set context end', context);
  console.log('get trollbox info start');

  _rpcEngine.request({
    params: {
      cmd: 'get_trollbox_info',
    },
  });
};

function ensureContext() {
  if (context === undefined) {
    throw new Error('Contenxt is undefined.');
  }
}

function setContext(ctx: TargetContext) {
  context = ctx;
}

function isTouchEnabled() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const isMobile = isTouchEnabled();

const trollboxRequests: Record<string, EventCallback> = {};
let _seq = 1;
const _rpcVersion = 101;

const _rpcEngine = JsonRpcEngine.builder<SendToTrollboxParam, unknown>()
  .add(async (req, next) => {
    req.id = _seq++;
    req.version = _rpcVersion;
    req.params!.cmd = `contentToTrollbox##${req.params!.cmd}`;
    req.params!.origin = window.location.origin;
    req.params!.id = req.id;
    return next!(req);
  })
  .add(async (req) => {
    const { id, data, cmd } = req.params!;
    ensureContext();
    context!.targetWindow.postMessage(req.params, context!.targetOrigin);
    const { method } = data;
    if (cmd === 'contentToTrollbox##trollbox_request') {
      return new Promise<JsonRpcResponse<unknown>>((resolve, reject) => {
        trollboxRequests[`trollbox_request_${method}_${req.id ?? 0}`] = (
          res: TrollboxResponse<any>,
          code: number
        ) => {
          if (code === 200) {
            resolve({ id: id!, version: 100, data: res });
          } else {
            reject(res);
          }
        };
      });
    } else {
      return { id: req.id!, version: 100, data: undefined };
    }
  })
  .build();

const TrollboxSDK: {
  walletProvider: any | undefined
  walletType: string | undefined;
  events: EventEmitter;
  isIframeLoaded: boolean;
  trollboxVersion: string | undefined;
  request: ({
    method,
    params,
  }: {
    method: string;
    params: any;
  }) => Promise<Partial<unknown> | undefined>;
  emit: (key: string, data: any) => void;
  dispatchWalletUpdate: (data: { walletType: string }) => void;
  dispatchMetaMaskAccountChanged: (data: {account: string}) => void;
  on: (eventName: string, callBack: (...args: any[]) => void) => () => void;
  removeTrollbox: () => void;
  send: (data: any) => void;
  loadTrollbox: (params?: LoadTrollboxParams) => void;
  setWalletProvider: (provider: any) => void
} = {
  walletProvider: undefined,

  events: new EventEmitter(),

  walletType: undefined,

  isIframeLoaded: false,

  trollboxVersion: undefined,

  setWalletProvider(provider: any) {
    this.walletProvider = provider
  },

  request: async ({ method, params }: { method: string; params: any }) => {
    if (TrollboxSDK.trollboxVersion === undefined) {
      console.log('Trollbox is not ready');
      return;
    }
    const res = await _rpcEngine.request({
      params: {
        cmd: 'trollbox_request',
        data: { method, params },
      },
    });
    if (res.error) {
      return res.error;
    }
    return res.data;
  },

  emit(key: string, data: any) {
    if (!TrollboxSDK.isIframeLoaded) {
      return;
    }
    this.send({
      cmd: 'dapp_event',
      data: { key, data },
    });
  },

  send(data: any) {
    ensureContext();
    context!.targetWindow.postMessage(data, context!.targetOrigin);
  },

  loadTrollbox(params?: LoadTrollboxParams) {
    if (!this.isIframeLoaded) {
      genOnLoad(init, params)();
    }
  },

  removeTrollbox() {
    try {
      const btnDom = document.getElementById('groupfi_btn');
      const iframeContainerDom = document.getElementById('groupfi_box');

      const iframe = document.getElementById(
        'trollbox'
      ) as HTMLIFrameElement | null;

      if (iframe !== null) {
        iframe.onload = null;
        iframe.src = 'about:blank';
      }

      if (btnDom !== null) {
        btnDom.style.display = 'none';
      }

      if (iframeContainerDom !== null) {
        iframeContainerDom.style.display = 'none';
      }

      TrollboxSDK.isIframeLoaded = false;
      TrollboxSDK.walletType = undefined;
      TrollboxSDK.trollboxVersion = undefined;
    } catch (error) {
      console.error('Error removing iframe:', error);
    }
  },

  dispatchWalletUpdate(data: { walletType: string }) {
    const walletType = data.walletType;
    TrollboxSDK.walletType = walletType;

    TrollboxSDK.emit('wallet-type-update', {
      walletType,
    });
  },

  dispatchMetaMaskAccountChanged(data: {account: string}) {
    TrollboxSDK.emit('metamask-account-changed', data)
  },

  on(eventName: string, callBack: (...args: any[]) => void): () => void {
    const eventKey = `trollbox-event-${eventName}`;
    this.events.on(eventKey, callBack);
    return () => this.events.off(eventKey, callBack);
  },
};

if (!isMobile) {
  window.addEventListener('message', function (event: MessageEvent) {
    if (context === undefined) {
      return;
    }
    if (
      event.source !== context.targetWindow ||
      event.origin !== context.targetOrigin
    ) {
      return;
    }
    let { cmd, data, reqId, code } = event.data;
    cmd = (cmd ?? '').replace('contentToDapp##', '');
    console.log('Dapp get a message from trollbox', cmd, data, event.data);
    switch (cmd) {
      case 'get_trollbox_info': {
        TrollboxSDK.trollboxVersion = data.version;
        TrollboxSDK.isIframeLoaded = true;

        const eventData: TrollboxReadyEventData = {
          trollboxVersion: data.version,
        };

        // Set default groups
        // TrollboxSDK.request({
        //   method: 'setForMeGroups',
        //   params: {
        //     includes: [{groupName: 'smr-whale'}],
        //   },
        // })
        //   .then((res) => {})
        //   .catch((error) => {
        //     console.log('Set default customization groups error', error);
        //   })
        //   .finally(() => {
        //     window.dispatchEvent(
        //       new CustomEvent('trollbox-ready', { detail: eventData })
        //     );
        //     TrollboxSDK.events.emit('trollbox-ready', eventData);
        //   });
        window.dispatchEvent(
          new CustomEvent('trollbox-ready', { detail: eventData })
        );
        TrollboxSDK.events.emit('trollbox-ready', eventData);
        break;
      }
      case 'trollbox_request': {
        const callBack =
          trollboxRequests[`trollbox_request_${data.method}_${reqId ?? 0}`];
        if (callBack) {
          callBack(data.response, code);
        }
        break;
      }
      case 'sdk_request': {
        requestHandler.handle(data.method, data.params).then((res) => {
          TrollboxSDK.send({
            cmd: `contentToTrollbox##sdk_request`,
            id: reqId,
            data:{
              method: data.method,
              data: res,
            }
          });
        });
      }
    }
  });
}

export default TrollboxSDK;