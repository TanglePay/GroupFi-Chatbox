import { GroupFiService } from '../service/GroupFiService';
import { CombinedStorageService } from '../service/CombinedStorageService';

import { Inject, Singleton } from 'typescript-ioc';
import {
  RegisteredInfo,
  Mode,
  ModeInfo,
  ProxyMode,
  PairX,
  ImpersonationMode,
  DelegationMode,
  ModeDetail
} from '../types';

export const ProxyModeDomainStoreKey = 'ProxyModeDomain';

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

  async _getRegisteredInfoFromStorage(): Promise<RegisteredInfo | undefined> {
    return await this.combinedStorageService.get<RegisteredInfo>(
      ProxyModeDomainStoreKey,
      this._lruCache
    ) ?? undefined
  }

  _registeredToModeInfo(info?: RegisteredInfo): ModeInfo {
    return {
      pairX: info?.pairX,
      detail: this._proxyMode && info?.[this._proxyMode]
    }
  }

  async _storeRegisteredInfo(registeredInfo: RegisteredInfo) {
    await this.combinedStorageService.set<RegisteredInfo>(
      ProxyModeDomainStoreKey,
      registeredInfo,
      this._lruCache
    );
  }

  async storeModeInfo(params: {pairX: PairX, detail: ModeDetail} | undefined): Promise<void> {
    if (this._proxyMode === undefined) {
      return
    }
    if (params === undefined) {
      return
    }
    const registeredInfo = await this._getRegisteredInfoFromStorage()
    if (registeredInfo !== undefined && registeredInfo[this._proxyMode]) {
      return
    }
    let resToStore: RegisteredInfo | undefined = registeredInfo
    if (resToStore === undefined) {
      resToStore = {
        pairX: params.pairX,
        [this._proxyMode]: params.detail
      }
    }else {
      resToStore[this._proxyMode] = params.detail
    }
    await this.combinedStorageService.set<RegisteredInfo>(ProxyModeDomainStoreKey, resToStore!, this._lruCache)
  }

  async getModeInfo(): Promise<ModeInfo> {
    let registeredInfo: RegisteredInfo | null | undefined;
    let res;

    registeredInfo = await this._getRegisteredInfoFromStorage();
    res = this._registeredToModeInfo(registeredInfo);
    if (res) {
      return res;
    }

    registeredInfo = await this.groupFiService.fetchRegisteredInfo();
    res = this._registeredToModeInfo(registeredInfo);

    return res;
  }
}
