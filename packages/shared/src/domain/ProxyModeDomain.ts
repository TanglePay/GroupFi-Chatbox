import { GroupFiService } from '../service/GroupFiService';
// import { CombinedStorageService } from '../service/CombinedStorageService';
import { LocalStorageRepository } from '../repository/LocalStorageRepository'
import {
  tpEncryptWithFlag,
  tpDecryptWithFlag,
  bytesToHex,
  hexToBytes,
} from 'groupfi-sdk-utils';
import { ICycle, IRunnable, ShimmerMode } from '../types';

const GROUPFIPAIRXFLAG = 'GROUPFIPAIRXV1'

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

interface EncryptedRegisteredInfoInStorage {
  pairX?: string;
  [ImpersonationMode]?: ModeDetail;
  [DelegationMode]?: ModeDetail;
}

@Singleton
export class ProxyModeDomain {
  @Inject
  private groupFiService: GroupFiService;

  @Inject
  private localStorageRepository: LocalStorageRepository;

  private _modeInfo: ModeInfo = {};

  get modeInfo() {
    return this._modeInfo;
  }
  
  pairXChanged() {
    this._lastFetchModeInfoFromServiceTime = 0;
  }

  
  async clearModeInfoFromStorage() {
    await this.localStorageRepository.remove(ProxyModeDomainStoreKey)
  }

  
  async getModeInfoFromStorage(): Promise<ModeInfo> {
    const valueStr = await this.localStorageRepository.get(ProxyModeDomainStoreKey)
    if (!valueStr) {
      return {}
    }
    console.log('valueStr111')

    const valueFromStorage = JSON.parse(valueStr) as EncryptedRegisteredInfoInStorage

    if (!valueFromStorage) {
      return {};
    }
    if (!valueFromStorage.pairX) {
      return {}
    }
    if (!valueFromStorage.pairX.endsWith(GROUPFIPAIRXFLAG)) {
      return {}
    }
    const registerInfo = this._valueFromStorageToRegisterInfo(valueFromStorage);
    console.log('===>up registerInfo in localstorage:', registerInfo)
    if (registerInfo.pairX) {
      console.log('===>up registerInfo in localstorage111, pairX publicKey:', bytesToHex(registerInfo.pairX.publicKey, true))
    }
    const modeInfo = this._registerInfoToModeInfo(registerInfo);
    console.log('valueStr111',valueStr)
    return modeInfo;
  }

  _valueFromStorageToRegisterInfo(
    value: EncryptedRegisteredInfoInStorage
  ): RegisteredInfo {
    const privateKey = hexToBytes(tpDecryptWithFlag(value.pairX as string, 'salt', GROUPFIPAIRXFLAG));
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
    const proxyMode = this.getProxyMode();
    return {
      pairX: info?.pairX,
      detail: proxyMode && info?.[proxyMode],
    };
  }

  private _lastFetchModeInfoFromServiceTime: number = 0;

  private _isRegisterInfoRequestCompleted: boolean = true;

  storeRegisterInfo(registerInfo: RegisteredInfo) {
    this.localStorageRepository.set(
      ProxyModeDomainStoreKey,
      JSON.stringify(this._registerInfoToStorageValue(registerInfo))
    );
  }

  _registerInfoToStorageValue(
    value: RegisteredInfo
  ): EncryptedRegisteredInfoInStorage {
    return {
      ...value,
      pairX: value.pairX
        ? tpEncryptWithFlag(bytesToHex(value.pairX.privateKey, false), 'salt', GROUPFIPAIRXFLAG)
        : undefined,
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
