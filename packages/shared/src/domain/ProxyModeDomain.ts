import { GroupFiService } from '../service/GroupFiService';
import { CombinedStorageService } from '../service/CombinedStorageService';
import {
  tpEncrypt,
  tpDecrypt,
  bytesToHex,
  hexToBytes,
} from 'iotacat-sdk-utils';
import { ICycle, IRunnable, ShimmerMode } from '../types';

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
import { ThreadHandler } from '../util/thread';

interface RegisteredInfoInStorage {
  // 只存储 privateKey 即可，因为 publicKey 是 privateKey 的后32位
  pairX?: number[];
  [ImpersonationMode]?: ModeDetail;
  [DelegationMode]?: ModeDetail;
}

interface EncryptedRegisteredInfoInStorage {
  pairX?: string;
  [ImpersonationMode]?: ModeDetail;
  [DelegationMode]?: ModeDetail;
}

@Singleton
export class ProxyModeDomain implements ICycle, IRunnable {
  @Inject
  private groupFiService: GroupFiService;

  @Inject
  private combinedStorageService: CombinedStorageService;

  private _lruCache: LRUCache<any>

  private _cryptionOpen: boolean = true;

  private threadHandler: ThreadHandler;

  private _modeInfo: ModeInfo = {}

  get modeInfo() {
    return this._modeInfo;
  }

  async bootstrap(): Promise<void> {
    this._lruCache = new LRUCache<any>(1);
    this.threadHandler = new ThreadHandler(
      this.poll.bind(this),
      'proxymodedomain',
      1000
    );
    console.log('ProxyModeDomain bootstraped');
  }

  async poll(): Promise<boolean> {
    if (!this._modeInfo || !this._modeInfo.detail) {
      await this._fetchModeInfoFromService();
    }
    return true;
  }

  async start() {
    this._modeInfo = await this._getModeInfoFromStorage();
    if (!this._modeInfo.detail) {
      await this._fetchModeInfoFromService()
    }
    this.threadHandler.start();
  }

  async resume() {
    this.threadHandler.resume();
  }

  async pause() {
    this.threadHandler.pause();
  }

  async stop() {
    this._lastFetchModeInfoFromServiceTime = 0
    this._isRegisterInfoRequestCompleted = true
    this._lruCache.clear()
    this.threadHandler.stop();
  }

  async destroy() {
    this.threadHandler.destroy();
  }

  async _getModeInfoFromStorage(): Promise<ModeInfo> {
    const valueFromStorage = await this.combinedStorageService.get<
      RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage
    >(ProxyModeDomainStoreKey, this._lruCache);

    if (!valueFromStorage) {
      return {};
    }
    const registerInfo = this._valueFromStorageToRegisterInfo(valueFromStorage);
    const modeInfo = this._registerInfoToModeInfo(registerInfo);
    return modeInfo;
  }

  _valueFromStorageToRegisterInfo(
    value: RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage
  ): RegisteredInfo {
    let privateKey: Uint8Array | undefined = undefined;
    if (this._cryptionOpen) {
      privateKey = hexToBytes(tpDecrypt(value.pairX as string, 'salt'));
    } else {
      privateKey = value.pairX
        ? new Uint8Array(value.pairX as number[])
        : undefined;
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

  _registerInfoToModeInfo(info?: RegisteredInfo): ModeInfo {
    const proxyMode = this.getProxyMode()
    return {
      pairX: info?.pairX,
      detail: proxyMode && info?.[proxyMode],
    };
  }

  private _lastFetchModeInfoFromServiceTime: number = 0

  private _isRegisterInfoRequestCompleted: boolean = true

  async _fetchModeInfoFromService(): Promise<boolean> {
    try {
      if (!this._isRegisterInfoRequestCompleted) {
        return true
      }
      if (Date.now() - this._lastFetchModeInfoFromServiceTime < 2000) {
        return true
      }
      this._isRegisterInfoRequestCompleted = false
      const isPairXPresent = !!this._modeInfo?.pairX;
      let registerInfo = await this.groupFiService.fetchRegisteredInfo(
        isPairXPresent
      );
      this._lastFetchModeInfoFromServiceTime = Date.now()
      if (!registerInfo) {
        this._isRegisterInfoRequestCompleted = true
        return true
      }
      console.log('register info fetched', Date.now(), registerInfo)
      registerInfo = { pairX: this._modeInfo?.pairX, ...registerInfo };
      if (registerInfo) {
        this._storeRegisterInfo(registerInfo);
      }
      const modeInfo = this._registerInfoToModeInfo(registerInfo);
      this._modeInfo = modeInfo

      this._isRegisterInfoRequestCompleted = true

      return true
    } catch (error) {
      console.log('fetch mode info from service error:', error);
      return true
    }
  }

  _storeRegisterInfo(registerInfo: RegisteredInfo) {
    this.combinedStorageService.setSingleThreaded<
      RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage
    >(
      ProxyModeDomainStoreKey,
      this._registerInfoToStorageValue(registerInfo),
      this._lruCache
    );
  }

  _registerInfoToStorageValue(
    value: RegisteredInfo
  ): RegisteredInfoInStorage | EncryptedRegisteredInfoInStorage {
    if (this._cryptionOpen) {
      return {
        ...value,
        pairX: value.pairX
          ? tpEncrypt(bytesToHex(value.pairX.privateKey, false), 'salt')
          : undefined,
      };
    }
    return {
      ...value,
      pairX: value.pairX ? Array.from(value.pairX.privateKey) : undefined,
    };
  }
  
  getMode() {
    return this.groupFiService.getCurrentMode();
  }

  getProxyMode(): ProxyMode | undefined {
    const mode = this.getMode();
    if (mode === ShimmerMode) return undefined;
    return mode;
  }

  isProxyMode() {
    return this.getProxyMode() !== undefined;
  }
}
