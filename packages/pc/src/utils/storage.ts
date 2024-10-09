import { NodeInfo } from 'redux/types'

export const ACTIVE_TAB_KEY = 'chatBoxLocalActiveTab'
export const GROUP_INFO_KEY = 'chatBoxLocalGroupInfo'

let _dappDomain: string = ''
export function setDappDoamin(domain: string | undefined) {
  _dappDomain = domain || ''
}
const _getStorageKey = (key: string, nodeInfo: NodeInfo | undefined) => {
  const parentKey = `${_dappDomain}.${nodeInfo?.address || ''}.${
    nodeInfo?.mode || ''
  }.${nodeInfo?.nodeId || ''}.${key}`
  return parentKey
}

export function setLocalParentStorage(
  key: string,
  value: any,
  nodeInfo: NodeInfo | undefined
) {
  window.localStorage.setItem(
    _getStorageKey(key, nodeInfo),
    JSON.stringify(value)
  )
}
export function getLocalParentStorage(
  key: string,
  nodeInfo: NodeInfo | undefined
) {
  let value = window.localStorage.getItem(_getStorageKey(key, nodeInfo)) || ''
  let obj = null
  if (value) {
    try {
      obj = JSON.parse(value)
    } catch (error) {}
  }
  return obj
}
export function removeLocalParentStorage(
  key: string,
  nodeInfo: NodeInfo | undefined
) {
  window.localStorage.removeItem(_getStorageKey(key, nodeInfo))
}
