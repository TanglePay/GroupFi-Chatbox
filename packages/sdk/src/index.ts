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

export interface TargetContext {
  targetWindow: WindowProxy;
  targetOrigin: string;
}

let context: TargetContext | undefined = undefined;

function setContext(ctx: TargetContext) {
  context = ctx;
}

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
    if (context === undefined) {
      throw new Error('Contenxt is undefined.');
    }
    context.targetWindow.postMessage(req.params, context.targetOrigin);
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

const TrollboxSDK = {
  _events: new EventEmitter(),

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

  trollboxVersion: undefined,
};

const init = (context: TargetContext) => {
  setContext(context);
  _rpcEngine.request({
    params: {
      cmd: 'getTrollboxInfo',
    },
  });
};

const onload = genOnLoad(init);
window.addEventListener('load', onload);

window.addEventListener('message', function (event: MessageEvent) {
  if (context === undefined) {
    console.log('context is uninited');
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
  console.log('=====> I am dapp', cmd, data);
  switch (cmd) {
    case 'getTrollboxInfo': {
      TrollboxSDK.trollboxVersion = data.version;
      const eventData: TrollboxReadyEventData = {
        trollboxVersion: data.version,
      };
      window.dispatchEvent(
        new CustomEvent('trollbox-ready', { detail: eventData })
      );
      TrollboxSDK._events.emit('trollbox-ready', eventData);
      break;
    }
    case 'trollbox_request': {
      const callBack =
        trollboxRequests[`trollbox_request_${data.method}_${reqId ?? 0}`];
      if (callBack) {
        callBack(data.response, code);
      }
    }
  }
});

export default TrollboxSDK;
