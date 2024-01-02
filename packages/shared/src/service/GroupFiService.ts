import { Singleton } from 'typescript-ioc';
import GroupFiSDKFacade, {
  SimpleDataExtended,
  TransactionRes,
} from 'groupfi-sdk-facade';
import { IMessage } from 'iotacat-sdk-core';
import { EventItemFromFacade } from 'iotacat-sdk-core';
import { EventItem } from 'iotacat-sdk-core';
import { MessageResponseItem } from 'iotacat-sdk-core';
// IMMessage <-> UInt8Array
// IRecipient <-> UInt8Array

@Singleton
export class GroupFiService {
  async bootstrap() {
    const res = await GroupFiSDKFacade.bootstrap();
    return res;
  }
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

  async loadGroupMemberAddresses2(groupId: string) {
    return await GroupFiSDKFacade.loadGroupMemberAddresses(groupId);
  }
  async loadGroupVotesCount(groupId: string) {
    return await GroupFiSDKFacade.loadGroupVotesCount(groupId);
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
  // call addHexPrefixIfAbsent
  addHexPrefixIfAbsent(hexStr:string):string {
    return GroupFiSDKFacade.addHexPrefixIfAbsent(hexStr);
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

  async waitOutput(outputId: string) {
    await GroupFiSDKFacade.waitOutput(outputId);
  }

  async setupIotaMqttConnection(mqttClient: any) {
    return await GroupFiSDKFacade.setupIotaMqttConnection(mqttClient);
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

  async tryPing() {
    return await GroupFiSDKFacade.tryPing();
  }
  groupIdToGroupName(groupId: string) {
    return GroupFiSDKFacade.groupIdToGroupName(groupId);
  }

  async enteringGroupByGroupId(groupId: string) {
    return await GroupFiSDKFacade.enteringGroupByGroupId(groupId);
  }
  async sendMessageToGroup(
    groupId: string,
    message: string
  ): Promise<{ messageSent: IMessage, blockId: string }> {
    return (await GroupFiSDKFacade.sendMessage(groupId, message)) as {
      messageSent: IMessage;
      blockId: string
    };
  }

  async getUserGroupReputation(groupId: string) {
    return await GroupFiSDKFacade.getUserGroupReputation(groupId);
  }

  async leaveGroup(groupId: string) {
    await GroupFiSDKFacade.leaveGroup(groupId);
  }

  async markGroup(groupId: string) {
    await GroupFiSDKFacade.markGroup(groupId)
  }

  async joinGroup({groupId,memberList,publicKey}:{groupId: string,publicKey:string, memberList:{addr:string,publicKey:string}[]}) {
    
    await GroupFiSDKFacade.joinGroup({groupId,memberList,publicKey});
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
  getUserAddress() {
    return GroupFiSDKFacade.getUserAddress();
  }

  async muteGroupMember(groupId: string, memberAddress: string) {
    await GroupFiSDKFacade.muteGroupMember(groupId, memberAddress);
  }

  async unMuteGroupMember(groupId: string, memberAddress: string) {
    await GroupFiSDKFacade.unMuteGroupMember(groupId, memberAddress);
  }

  async getGroupMuteMembers(groupId: string) {
    return await GroupFiSDKFacade.getGroupMuteMembersFromMuteMap(groupId);
  }

  async loadAddressMemberGroups(address?: string) {
    return await GroupFiSDKFacade.loadAddressMemberGroups(address);
  }

  listenningAccountChanged(callback: (address: string) => void) {
    return GroupFiSDKFacade.listenningAccountChanged(callback);
  }

  async getRecommendGroups({
    includes,
    excludes,
  }: {
    includes?: string[];
    excludes?: string[];
  }) {
    return await GroupFiSDKFacade.fetchAddressQualifiedGroupConfigs({
      includes,
      excludes,
    });
  }

  async getMyGroups() {
    return await GroupFiSDKFacade.getAllMarkedGroups();
  }
}
