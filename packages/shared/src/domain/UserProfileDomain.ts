import { LRUCache } from "../util/lru";
import { ICycle, IRunnable } from "../types";
import { GroupFiService } from "../service/GroupFiService";
import { CombinedStorageService } from "../service/CombinedStorageService";

import { UserProfileInfo } from '../types'

import { Inject, Singleton } from "typescript-ioc";

export const UserProfileStorePrefix = 'UserProfileDomain.userProfile.';

@Singleton
export class UserProfileDomain implements ICycle, IRunnable {
  @Inject
  private groupFiService: GroupFiService;

  @Inject
  private combinedStorageService: CombinedStorageService;


  private _lruCache: LRUCache<UserProfileInfo> = new LRUCache<UserProfileInfo>(100)
  

  async bootstrap(): Promise<void> {

  }

  async poll(): Promise<boolean> {
    return true
  }

  getUserProfileStoreKey(address: string) {
    return `${UserProfileStorePrefix}${address}`
  }

  storeUserProfile(address: string, value: UserProfileInfo) {
    const key = this.getUserProfileStoreKey(address)
    this.combinedStorageService.setSingleThreaded<UserProfileInfo>(key, value, this._lruCache)  
  }

  async getUserProfileFromStorage(address: string) {
    const key = this.getUserProfileStoreKey(address)
    return await this.combinedStorageService.get(key, this._lruCache)
  }

  async fetchOneBatchUserProfile(addressList: string[]) {
    const res = await this.groupFiService.fetchAddressNames(addressList)
    for(let address in res) {
      this.storeUserProfile(address, res[address])
    }
    return res
  }

  async getOneBatchUserProfile(addressList: string[]) {
    const unretrievedAddressList = []

    const res: {[key: string]: UserProfileInfo} = {}

    for(const address of addressList) {
      const info = await this.getUserProfileFromStorage(address)
      if (info !== null) {
        res[address] = info
      }else {
        unretrievedAddressList.push(address)
      }
    }

    const unretrievedAddressListRes = await this.fetchOneBatchUserProfile(unretrievedAddressList)

    return Object.assign(res, unretrievedAddressListRes)
  }

  async start() {

  }

  async resume() {

  }

  async pause() {

  }

  async stop() {

  }

  async destroy() {

  }
}