import {JsonRpcId} from "tanglepaysdk-common";

export interface SendToTrollboxParam {
  cmd: string;
  origin?: string;
  data?: any;
  id?: JsonRpcId;
}

export interface TrollboxReadyEventData {
  trollboxVersion: string
}

export type TrollboxResponse<T> = T

export interface LoadTrollboxParams {
  walletType: string
}