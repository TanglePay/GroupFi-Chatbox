# GroupFi Trollbox SDK
GroupFi Trollbox SDK 用于帮助 Dapp 来接入 GroupFi Trollbox Application。其主要工作是帮助Dapp 嵌入trollbox 聊天应用。

## Installation
To incorporate the `groupfi_trollbox_sdk` into your project, execute one of the following commands in your project's root directory:


```sh
pnpm add groupfi_trollbox_sdk

# Or, if you're using NPM:
npm install groupfi_trollbox_sdk
```

## Usage
1. 在使用 GroupFi Trollbox SDK 之前，请确保 Trollbox Ready 

```typescript
# 使用 window.addEventListener
window.addEventListener('trollbox-ready', (data: {detail: {
  trollboxVersion: string
}}) => {})

# 
import TrollboxSDK from 'groupfi_trollbox_sdk'

TrollboxSDK._events.on('trollbox-ready', (data: {trollboxVersion: string}) => {})
```

2. 如果要监听 GroupFi Trollbox 与钱包的连接状态

```typescript
import TrollboxSDK from 'groupfi_trollbox_sdk'

TrollboxSDK.on('wallet-connected-changed', (data: {
  data?: {
    walletType: string,
    nodeId: number,
    address: string
  },
  reason?: string
}))

钱包连接成功，会返回 data
钱包连接失败，会返回 reason
```

3. GroupFi Trollbox 对每个用户会展示默认的推荐群组，如果想自定义推荐群组
```typescript
import TrollboxSDK from 'groupfi_trollbox_sdk'

async setForMeGroups() {
  try{
    cosnt res = await TrollboxSDK.request({
      method: 'setForMeGroups',
      params: {
        includes?: string[],
        excludes?: string[]
      }
    })
  }catch(error) {
    
  }
}
```

