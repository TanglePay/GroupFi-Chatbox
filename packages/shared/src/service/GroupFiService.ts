import { Singleton } from 'typescript-ioc';
import { IBasicOutput } from '@iota/iota.js';
import GroupFiSDKFacade, {
  ModeDetail,
  SimpleDataExtended,
  TransactionRes,
} from 'groupfi-sdk-facade';
import { IMessage, EventItemFromFacade, EventItem, MessageResponseItem,PublicItemsResponse, IIncludesAndExcludes } from 'iotacat-sdk-core';
// IMMessage <-> UInt8Array
// IRecipient <-> UInt8Array
import { Mode, WalletType, ModeInfo, PairX, IEncryptedPairX} from '../types'

@Singleton
export class GroupFiService {
  async bootstrap(walletType: WalletType, metaMaskAccountFromDapp: string | undefined) {
    const res = await GroupFiSDKFacade.bootstrap(walletType, metaMaskAccountFromDapp);
    return res;
  }
  async browseModeSetupClient() {
    await GroupFiSDKFacade.browseModeSetupClient()
  }
  // async initialAddress() {
  //   await GroupFiSDKFacade.initialAddress()
  // }
  async setupGroupFiMqttConnection(connect: any) {
    await GroupFiSDKFacade.setupMqttConnection(connect);
  }
  getObjectId(obj: Record<string, SimpleDataExtended>) {
    return GroupFiSDKFacade.getObjectId(obj);
  }
  async getInboxItems(continuationToken?: string): Promise<{
    itemList: EventItemFromFacade[];
    nextToken?: string | undefined;
  }> {

    const res = await GroupFiSDKFacade.getInboxItems(continuationToken, 10);

    // log
    console.log('getInboxMessages', res);
    return res;
  }
  async fetchInboxItemsLite(continuationToken?: string, limit = 1000):Promise<{
    itemList: EventItem[];
    nextToken?: string | undefined;
  }> {
    const res = await GroupFiSDKFacade.fetchMessageOutputList(
      continuationToken,
      limit
    );
    const { items, token } = res;
    return {
      itemList: items,
      nextToken: token,
    };
  }
  // async fullfillMessageLiteList(list:MessageResponseItem[]):Promise<IMessage[]> {
  // proxy call to GroupFiSDKFacade fullfillMessageLiteList
  async fullfillMessageLiteList(list: MessageResponseItem[]): Promise<IMessage[]> {
    return await GroupFiSDKFacade.fullfillMessageLiteList(list);
  }
  // proxy call to GroupFiSDKFacade fullfillOneMessageLite
  async fullfillOneMessageLite(message: MessageResponseItem): Promise<IMessage> {
    return await GroupFiSDKFacade.fullfillOneMessageLite(message);
  }
  // call enablePreparedRemainderHint
  enablePreparedRemainderHint() {
    return GroupFiSDKFacade.enablePreparedRemainderHint();
  }
  // call disablePreparedRemainderHint
  disablePreparedRemainderHint() {
    return GroupFiSDKFacade.disablePreparedRemainderHint();
  }
  // processOneMessage
  processOneMessage(message: MessageResponseItem) {
    return GroupFiSDKFacade.processOneMessage(message);
  }
  // registerMessageCallback
  registerMessageCallback(callback: (args:{message?: IMessage,outputId:string,status:number}) => void) {
    // @ts-ignore
    return GroupFiSDKFacade.registerMessageCallback(callback);
  }
  _offListenningNewEventItem: (() => void) | undefined;
  onNewEventItem(callback: (message: EventItemFromFacade) => void) {
    this._offListenningNewEventItem =
      GroupFiSDKFacade.listenningNewEventItem(callback);
  }
  offNewEventItem() {
    this._offListenningNewEventItem?.();
  }
  sha256Hash(str: string) {
    return GroupFiSDKFacade.sha256Hash(str);
  }
  groupNameToGroupId(groupName: string) {
    return GroupFiSDKFacade.groupNameToGroupId(groupName);
  }

  async loadGroupMemberAddresses(groupId: string) {
    const res = await this.loadGroupMemberAddresses2(groupId);
    const addresses = res.sort((member1, member2) => member1.timestamp - member2.timestamp).map((o:{ownerAddress:string})=>o.ownerAddress)
    return addresses;
  }

  async fetchRegisteredInfo(isPairXPresent: boolean) {
    return await GroupFiSDKFacade.fetchRegisteredInfo(isPairXPresent)
  }

  async fetchRegisteredInfoV2() {
    return await GroupFiSDKFacade.fetchRegisterInfoV2()
  }

  async loadGroupMemberAddresses2(groupId: string) {
    return await GroupFiSDKFacade.loadGroupMemberAddresses(groupId);
  }
  async getEvmQualify(groupId:string,addressList:string[],signature:string): Promise<IBasicOutput> {
    return await GroupFiSDKFacade.getEvmQualify(groupId,addressList,signature);
  }
  // getPluginGroupEvmQualifiedList
  async getPluginGroupEvmQualifiedList(groupId: string) {
    return await GroupFiSDKFacade.getPluginGroupEvmQualifiedList(groupId);
  }
  // sendAdHocOutput
  async sendAdHocOutput(output: IBasicOutput) {
    return await GroupFiSDKFacade.sendAdHocOutput(output);
  }
  // getGroupEvmQualifiedList
  async getGroupEvmQualifiedList(groupId: string) {
    return await GroupFiSDKFacade.getGroupEvmQualifiedList(groupId);
  }
  async loadGroupVotesCount(groupId: string) {
    return await GroupFiSDKFacade.loadGroupVotesCount(groupId);
  }
  async preloadGroupSaltCache(groupId: string, memberList?: { addr: string; publicKey: string }[]) {
    return await GroupFiSDKFacade.preloadGroupSaltCache({groupId, memberList});
  }
  // call prepareRemainderHint
  async prepareRemainderHint() {
    return await GroupFiSDKFacade.prepareRemainderHint();
  }
  async loadAddressPublicKey() {
    return await GroupFiSDKFacade.loadAddressPublicKey();
  }
  async isGroupPublic(groupId: string) {
    return await GroupFiSDKFacade.isGroupPublic(groupId);
  }

  async getGroupVoteRes(groupId: string) {
    return await GroupFiSDKFacade.getGroupVoteRes(groupId);
  }
  // call getCurrentAddress
  getCurrentAddress():string {
    return GroupFiSDKFacade.getCurrentAddress();
  }

  getCurrentNodeId(): number | undefined {
    return GroupFiSDKFacade.getCurrentNodeId()
  }

  getCurrentMode(): Mode | undefined {
    return GroupFiSDKFacade.getCurrentMode()
  }

  async getEncryptionPublicKey() {
    return await GroupFiSDKFacade.getEncryptionPublicKey()
  }

  async signaturePairX(encryptionPublicKey: string,pairX: PairX | undefined | null) {
    return await GroupFiSDKFacade.signaturePairX(encryptionPublicKey, pairX)
  }

  async registerPairX(params: {metadataObjWithSignature: Object, pairX: PairX}) {
    return GroupFiSDKFacade.registerPairX(params)
  }

  async login(encryptedPairX: IEncryptedPairX): Promise<PairX> {
    return await GroupFiSDKFacade.login(encryptedPairX)
  }

  // call addHexPrefixIfAbsent
  addHexPrefixIfAbsent(hexStr:string):string {
    return GroupFiSDKFacade.addHexPrefixIfAbsent(hexStr)!;
  }
  async voteOrUnVoteGroup(
    groupId: string,
    vote: number | undefined
  ): Promise<TransactionRes> {
    if (vote === undefined) {
      return await GroupFiSDKFacade.unvoteGroup(groupId);
    } else {
      return await GroupFiSDKFacade.voteGroup(groupId, vote);
    }
  }

  checkIsChainSupported(nodeId: number) {
    return GroupFiSDKFacade.checkIsChainSupported(nodeId)
  }

  async waitOutput(outputId: string) {
    await GroupFiSDKFacade.waitOutput(outputId);
  }

  async setupIotaMqttConnection(mqttClient: any) {
    return await GroupFiSDKFacade.setupIotaMqttConnection(mqttClient);
  }

  subscribeToAllTopics() {
    GroupFiSDKFacade.subscribeToAllTopics()
  }

  unsubscribeToAllTopics() {
    GroupFiSDKFacade.unsubscribeToAllTopics()
  }
  
  async filterMutedMessage(groupId: string, sender: string) {
    return await GroupFiSDKFacade.filterMutedMessage(groupId, sender)
  }

  async getAddressStatusInGroup(groupId: string): Promise<{
    isGroupPublic: boolean;
    muted: boolean;
    isQualified: boolean;
    marked: boolean;
  }> {
    return await GroupFiSDKFacade.getAddressStatusInGroup(groupId);
  }

  async getGroupMarked(groupId: string) {
    return await GroupFiSDKFacade.marked(groupId);
  }
  // fetchAddressMarkedGroups
  async fetchAddressMarkedGroups() {
    return await GroupFiSDKFacade.fetchAddressMarkedGroups();
  }
  groupIdToGroupName(groupId: string) {
    return GroupFiSDKFacade.groupIdToGroupName(groupId);
  }

  async enteringGroupByGroupId(groupId: string) {
    return await GroupFiSDKFacade.enteringGroupByGroupId(groupId);
  }
  async sendMessageToGroup(
    groupId: string,
    message: string,
    memberList:{addr:string,publicKey:string}[]
  ): Promise<{ messageSent: IMessage, blockId: string }> {
    return (await GroupFiSDKFacade.sendMessage(groupId, message, memberList)) as {
      messageSent: IMessage;
      blockId: string
    };
  }

  async getUserGroupReputation(groupId: string) {
    return await GroupFiSDKFacade.getUserGroupReputation(groupId);
  }

  async leaveOrUnMarkGroup(groupId: string) {
    await GroupFiSDKFacade.leaveOrUnMarkGroup(groupId);
  }

  async markGroup(groupId: string) {
    await GroupFiSDKFacade.markGroup(groupId)
  }

  async joinGroup({groupId,memberList,publicKey,qualifyList}:{groupId: string,publicKey:string, memberList:{addr:string,publicKey:string}[],qualifyList?:{addr:string,publicKey:string}[]}) {
    
    await GroupFiSDKFacade.joinGroup({groupId,memberList,publicKey,qualifyList})
  }

  // sendAnyOneToSelf
  async sendAnyOneToSelf() {
    await GroupFiSDKFacade.sendAnyOneToSelf();
  }
  async getSMRBalance(): Promise<{amount:number}> {
    return await GroupFiSDKFacade.getSMRBalance();
  }
  // fetchAddressBalance
  async fetchAddressBalance(): Promise<number> {
    return await GroupFiSDKFacade.fetchAddressBalance();
  }

  async fetchTokenTotalBalance(token: string, chainId: number): Promise<{TotalSupply:string, Decimals: number}> {
    return await GroupFiSDKFacade.fetchTokenTotalBalance(token, chainId)
  }

  async muteGroupMember(groupId: string, memberAddress: string) {
    await GroupFiSDKFacade.muteGroupMember(groupId, memberAddress);
  }

  async unMuteGroupMember(groupId: string, memberAddress: string) {
    await GroupFiSDKFacade.unMuteGroupMember(groupId, memberAddress);
  }

  async getIsMutedFromMuteMap(groupId: string, address:string) {
    return await GroupFiSDKFacade.getIsMutedFromMuteMap(groupId, address)
  }

  async loadAddressMemberGroups(address?: string) {
    return await GroupFiSDKFacade.loadAddressMemberGroups(address);
  }

  listenningTPAccountChanged(callback: (params: {address: string, nodeId: number, mode: Mode, isAddressChanged: boolean}) => void) {
    return GroupFiSDKFacade.listenningTPAccountChanged(callback);
  }
  // listenningMetaMaskAccountsChanged(callback: (params: {address: string, mode: Mode, isAddressChanged: boolean}) => void) {
  //   return GroupFiSDKFacade.listenningMetaMaskAccountsChanged(callback)
  // }
  async onMetaMaskAccountChange(account: string) {
    await GroupFiSDKFacade.onMetaMaskAccountChanged(account)
  }

  async getRecommendGroups({
    includes,
    excludes,
  }: {
    includes?: IIncludesAndExcludes[];
    excludes?: IIncludesAndExcludes[];
  }) {
    return await GroupFiSDKFacade.getRecommendGroups({
      includes,
      excludes,
    });
  }

  async initialAddressQualifiedGroupConfigs() {
    await GroupFiSDKFacade.initialAddressQualifiedGroupConfigs({})
  }

  async getMyGroups() {
    return await GroupFiSDKFacade.getAddressMarkedGroupsWithGroupName();
  }
  //async fetchPublicMessageOutputList(groupId:string, startToken?:string, endToken?:string, size:number=10) {
  async fetchPublicMessageOutputList({
    groupId,
    direction,
    startToken,
    endToken,
    size,
  }: {
    groupId: string;
    direction: 'head' | 'tail';
    startToken?: string;
    endToken?: string;
    size: number;
  }) : Promise<PublicItemsResponse|undefined> {
    return await GroupFiSDKFacade.fetchPublicMessageOutputList(
      groupId,
      direction,
      startToken,
      endToken,
      size,
    );
  }
  getGroupMetaByGroupId(groupId: string) {
    return GroupFiSDKFacade.getGroupMetaByGroupId(groupId)
  }

  getTpNodeInfo(tpNodeId: number) {
    return GroupFiSDKFacade.getTpNodeInfo(tpNodeId)
  }

  async fetchSMRPrice(tpNodeId: number) {
    return await GroupFiSDKFacade.fetchSMRPrice(tpNodeId)
  }

  async buySMR(params: {contract: string, targetAmount: string, principalAmount: string, nodeId: number, web3: any}) {
    return await GroupFiSDKFacade.buySMR(params)
  }

  async mintNicknameNFT(name: string) {
    return GroupFiSDKFacade.mintNicknameNFT(name)
  }

  async mintProxyNicknameNft(name: string) {
    return GroupFiSDKFacade.mintProxyNicknameNft(name)
  }

  async fetchAddressNames(addressList: string[]) {
    return await GroupFiSDKFacade.fetchAddressNames(addressList)
  }

  async hasUnclaimedNameNFT() {
    return await GroupFiSDKFacade.hasUnclaimedNameNFT()
  }

  async importSMRProxyAccount() {
    return await GroupFiSDKFacade.importSMRProxyAccount()
  }

  setProxyModeInfo(modeInfo: ModeInfo) {
    GroupFiSDKFacade.setProxyModeInfo(modeInfo)
  }

  setDappClient(dappClient: any) {
    GroupFiSDKFacade.setDappClient(dappClient)
  }

  // fetchPublicGroupConfigs
  async fetchPublicGroupConfigs({includes, excludes}: {includes?: IIncludesAndExcludes[], excludes?: IIncludesAndExcludes[]}) {
    return await GroupFiSDKFacade.fetchPublicGroupConfigs({includes, excludes})
  }

  // fetchForMeGroupConfigs
  async fetchForMeGroupConfigs({includes, excludes}: {includes?: IIncludesAndExcludes[], excludes?: IIncludesAndExcludes[]}) {
    return await GroupFiSDKFacade.fetchForMeGroupConfigs({includes, excludes})
  }
  // fetchAddressMarkedGroupConfigs
  async fetchAddressMarkedGroupConfigs() {
    return await GroupFiSDKFacade.fetchAddressMarkedGroupConfigs()
  }

  // syncAllTopics
  syncAllTopics(newAllTopics: string[]) {
    GroupFiSDKFacade.syncAllTopics(newAllTopics)
  }


}
