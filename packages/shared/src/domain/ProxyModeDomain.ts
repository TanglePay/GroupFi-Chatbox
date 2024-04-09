import { GroupFiService } from '../service/GroupFiService';
import { CombinedStorageService } from '../service/CombinedStorageService';

import { Inject, Singleton } from 'typescript-ioc';
import {
  Mode,
  ModeInfo,
  ProxyMode,
  PairX,
  ImpersonationMode,
  DelegationMode,
  ModeDetail,
  RegisteredInfo,
} from '../types';

export const ProxyModeDomainStoreKey = 'ProxyModeDomain.pairX';

import { LRUCache } from '../util/lru';

@Singleton
export class ProxyModeDomain {
  @Inject
  private groupFiService: GroupFiService;

  @Inject
  private combinedStorageService: CombinedStorageService;

  private _lruCache: LRUCache<any> = new LRUCache<any>(5);

  private _proxyMode?: ProxyMode = undefined;

  setMode(mode: Mode) {
    if (mode === ImpersonationMode || mode === DelegationMode) {
      this._proxyMode = mode;
    }
  }

  cacheClear() {
    if (this._lruCache) {
      this._lruCache.clear();
    }
  }

  async _getRegisteredInfoFromStorage(): Promise<RegisteredInfo | undefined> {
    const resFromStorage = await this.combinedStorageService.get<{
      pairX?: {
        publicKey: number[];
        privateKey: number[];
      };
      [ImpersonationMode]?: ModeDetail;
      [DelegationMode]?: ModeDetail;
    }>(ProxyModeDomainStoreKey, this._lruCache);

    if (!resFromStorage) {
      return undefined;
    }

    return {
      ...resFromStorage,
      pairX: resFromStorage.pairX
        ? {
            publicKey: new Uint8Array(resFromStorage.pairX.publicKey),
            privateKey: new Uint8Array(resFromStorage.pairX.privateKey),
          }
        : undefined,
    };
  }

  _registeredToModeInfo(info?: RegisteredInfo): ModeInfo {
    return {
      pairX: info?.pairX,
      detail: this._proxyMode && info?.[this._proxyMode],
    };
  }

  async getProxyAddress(): Promise<string | undefined> {
    if (this._proxyMode === undefined) {
      return undefined;
    }
    const modeInfo = await this.getModeInfo();
    return modeInfo.detail?.account;
  }

  async storeModeInfo(
    params: { pairX: PairX; detail: ModeDetail } | undefined
  ): Promise<void> {
    if (this._proxyMode === undefined || params === undefined) {
      return;
    }
    const registeredInfoFromStorage =
      await this._getRegisteredInfoFromStorage();
    if (
      registeredInfoFromStorage !== undefined &&
      registeredInfoFromStorage[this._proxyMode]
    ) {
      return;
    }
    let newValue: RegisteredInfo | undefined = registeredInfoFromStorage;
    if (newValue === undefined) {
      newValue = {
        pairX: params.pairX,
        [this._proxyMode]: params.detail,
      };
    } else {
      newValue[this._proxyMode] = params.detail;
    }

    const valueToStore = {
      ...newValue,
      pairX: {
        publicKey: Array.from(newValue.pairX!.publicKey),
        privateKey: Array.from(newValue.pairX!.privateKey),
      },
    };

    console.log('===>valueToStore', valueToStore)

    await this.combinedStorageService.set<{
      pairX?: {
        publicKey: number[];
        privateKey: number[];
      };
      [DelegationMode]?: ModeDetail;
      [ImpersonationMode]?: ModeDetail;
    }>(ProxyModeDomainStoreKey, valueToStore, this._lruCache);
  }

  async getModeInfo(): Promise<ModeInfo> {
    let registeredInfo: RegisteredInfo | null | undefined;
    let res: ModeInfo | undefined = undefined;

    registeredInfo = await this._getRegisteredInfoFromStorage();
    console.log('===> registeredInfo in storage', registeredInfo);
    res = this._registeredToModeInfo(registeredInfo);
    if (res.detail) {
      return res;
    }

    const isPairXPresent = !!res.pairX;
    registeredInfo = await this.groupFiService.fetchRegisteredInfo(
      isPairXPresent
    );
    res = this._registeredToModeInfo({ pairX: res.pairX, ...registeredInfo });
    return res;
  }
}
