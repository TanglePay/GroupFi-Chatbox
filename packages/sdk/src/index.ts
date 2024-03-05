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
} from './types';
import { genOnLoad } from './page';
import './page.css';

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

const iframeOnLoad = genOnLoad(init);

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
  on: (eventName: string, callBack: (...args: any[]) => void) => () => void;
  removeTrollbox: () => void;
  loadTrollbox: () => void;
} = {
  events: new EventEmitter(),

  walletType: undefined,

  isIframeLoaded: false,

  trollboxVersion: undefined,

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
    ensureContext();
    context!.targetWindow.postMessage(
      {
        cmd: 'dapp_event',
        data: {
          key,
          data,
        },
      },
      context!.targetOrigin
    );
  },

  loadTrollbox() {
    if (!this.isIframeLoaded) {
      iframeOnLoad();
    }
  },

  removeTrollbox() {
    try {
      const btnDom = document.getElementById('groupfi_btn');
      const iframeContainerDom = document.getElementById('groupfi_box');

      const iframe = document.getElementById('trollbox') as HTMLIFrameElement | null

      if (iframe !== null) {
        iframe.src = 'about:blank'
      }
  
      if (btnDom !== null) {
        document.body.removeChild(btnDom);
      }
      if (iframeContainerDom !== null) {
        document.body.removeChild(iframeContainerDom);
      }
  
      TrollboxSDK.isIframeLoaded = false;
      TrollboxSDK.walletType = undefined;
      TrollboxSDK.trollboxVersion = undefined;

    }catch(error) {
      console.error("Error removing iframe:", error);
    }
  },

  dispatchWalletUpdate(data: { walletType: string }) {
    const walletType = data.walletType;
    TrollboxSDK.walletType = walletType;

    TrollboxSDK.emit('wallet-type-update', {
      walletType,
    });
  },

  on(eventName: string, callBack: (...args: any[]) => void): () => void {
    const eventKey = `trollbox-event-${eventName}`;
    this.events.on(eventKey, callBack);
    return () => this.events.off(eventKey, callBack);
  },
};

// async function renderIframeWithData(data: { walletType: string | undefined }) {
//   if (!TrollboxSDK.isIframeLoaded) {
//     TrollboxSDK.events.on('trollbox-ready', () => {
//       console.log('===> trollbox-ready');
//       TrollboxSDK.emit('wallet-change', data);
//     });

//     iframeOnLoad();
//   }
// }

if (!isMobile) {
  // if (document.readyState === 'complete') {
  //   renderIframe();
  // } else {
  //   window.addEventListener('load', renderIframe);
  // }

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
    console.log('Dapp get a message from trollbox', cmd, data);
    switch (cmd) {
      case 'get_trollbox_info': {
        TrollboxSDK.trollboxVersion = data.version;
        TrollboxSDK.isIframeLoaded = true;

        const eventData: TrollboxReadyEventData = {
          trollboxVersion: data.version,
        };

        // Set default groups
        TrollboxSDK.request({
          method: 'setForMeGroups',
          params: {
            includes: ['smr-whale'],
          },
        })
          .then((res) => {})
          .catch((error) => {
            console.log('Set default customization groups error', error);
          })
          .finally(() => {
            window.dispatchEvent(
              new CustomEvent('trollbox-ready', { detail: eventData })
            );
            TrollboxSDK.events.emit('trollbox-ready', eventData);
          });
        break;
      }
      case 'trollbox_request': {
        console.log('====>Dapp get trollbox_request', data, reqId);
        const callBack =
          trollboxRequests[`trollbox_request_${data.method}_${reqId ?? 0}`];
        if (callBack) {
          callBack(data.response, code);
        }
      }
      // case 'trollbox_emit_event': {
      //   const { method, messageData } = data;
      //   if (method === 'wallet-connected-changed') {
      //     console.log('====>messageData', messageData);
      //     TrollboxSDK.isWalletConnected = messageData.data !== undefined;
      //     TrollboxSDK.walletType = messageData.data?.walletType;
      //     TrollboxSDK.address = messageData.data?.address;
      //   }
      //   console.log('Dapp get an event from trollbox', data);
      //   const eventKey = `trollbox-event-${method}`;
      //   TrollboxSDK.events.emit(eventKey, messageData);
      // }
    }
  });
}

export default TrollboxSDK;
