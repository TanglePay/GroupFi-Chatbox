import { GroupFiService } from '../service/GroupFiService';
import { CombinedStorageService } from '../service/CombinedStorageService';
import { tpEncrypt, tpDecrypt, bytesToHex, hexToBytes } from 'iotacat-sdk-utils'

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

interface RegisteredInfoInStorage {
  // 只存储 privateKey 即可，因为 publicKey 是 privateKey 的后32位
  pairX?: number[];
  [ImpersonationMode]?: ModeDetail;
  [DelegationMode]?: ModeDetail;
}

interface EncryptedRegisteredInfoInStorage {
  pairX?: string,
  [ImpersonationMode]?: ModeDetail;
  [DelegationMode]?: ModeDetail;
}

@Singleton
export class ProxyModeDomain {
  @Inject
  private groupFiService: GroupFiService;

  @Inject
  private combinedStorageService: CombinedStorageService;

  private _lruCache: LRUCache<any> = new LRUCache<any>(5);

  private _proxyMode?: ProxyMode = undefined;

  private _cryptionOpen: boolean = true

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
    const resFromStorage =
      await this.combinedStorageService.get<RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage>(
        ProxyModeDomainStoreKey,
        this._lruCache
      );

    if (!resFromStorage) {
      return undefined;
    }

    return this._storageToRegisterInfo(resFromStorage);
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
    console.log('==>storeModeInfo params', params)
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

    console.log('===> storeModeInfo newValue', newValue)

    await this.combinedStorageService.set<RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage>(
      ProxyModeDomainStoreKey,
      this._registeredInfoToStorage(newValue),
      this._lruCache
    );
  }

  _storageToRegisterInfo(value: RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage): RegisteredInfo {
    let privateKey: Uint8Array | undefined = undefined
    if (this._cryptionOpen) {
      privateKey = hexToBytes(tpDecrypt(value.pairX as string, 'salt'))
    }else {
      privateKey = value.pairX ? new Uint8Array(value.pairX as number[]) : undefined
    }
    return {
      ...value,
      pairX: privateKey
        ? {
            publicKey: privateKey.slice(32),
            privateKey,
          }
        : undefined,
    };
  }

  _registeredInfoToStorage(value: RegisteredInfo): RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage {
    if (this._cryptionOpen) {
      return {
        ...value,
        pairX: value.pairX ? tpEncrypt(bytesToHex(value.pairX.privateKey, false), 'salt') : undefined
      }
    }
    return {
      ...value,
      pairX: value.pairX
        ? Array.from(value.pairX.privateKey)
        : undefined,
    };
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
