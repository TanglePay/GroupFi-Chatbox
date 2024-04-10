import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useLayoutEffect
} from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../redux/hooks'
import { GroupInfo } from 'redux/types'
import { setForMeGroups } from '../redux/forMeGroupsSlice'
import { setMyGroups } from '../redux/myGroupsSlice'
import {
  TanglePayWallet,
  MetaMaskWallet,
  useMessageDomain,
  Mode,
  ShimmerMode,
  ImpersonationMode,
  DelegationMode,
  ModeInfo
} from 'groupfi_trollbox_shared'
import { classNames } from 'utils'
import { Spinner } from 'components/Shared'
import SMRPurchase from '../components/SMRPurchase'

import { AppNameAndCashAndPublicKeyCheck, AppWalletCheck } from './AppCheck'
import { useCheckNicknameNftAndCashTokenAndPublicKey } from './hooks'
import AppGuest from './AppGuest'

const router = createBrowserRouter([
  {
    path: '/',
    async lazy() {
      const Component = (await import('../components/GroupList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id',
    async lazy() {
      const Component = (await import('../components/ChatRoom')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('../components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/info',
    async lazy() {
      const Component = (await import('../components/GroupInfo')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('../components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'user/:id',
    async lazy() {
      const Component = (await import('../components/UserInfo')).default
      return { Component }
    }
  }
])

function AppRouter(props: { address: string }) {
  const { address } = props
  useLoadForMeGroupsAndMyGroups(address)

  return (
    <RouterProvider
      router={router}
      fallbackElement={<p>Loading...</p>}
    ></RouterProvider>
  )
}

export function AppWithWalletType(props: {
  walletType: typeof TanglePayWallet | typeof MetaMaskWallet
}) {
  const { walletType } = props

  const { messageDomain } = useMessageDomain()

  const groupfiService = messageDomain.getGroupFiService()

  console.log('===>groupfiService', groupfiService)

  const [walletInstalled, setWalletInstalled] = useState<boolean | undefined>(
    undefined
  )

  const [walletConnected, setWalletConnected] = useState<boolean | undefined>(
    undefined
  )

  const [nodeId, setNodeId] = useState<number | undefined>(undefined)

  const [modeInfo, setModeInfo] = useState<ModeInfo | undefined>(undefined)

  const [modeAndAddress, setModeAndAddress] = useState<
    { mode: Mode; address: string; modeInfoFetched: boolean } | undefined
  >(undefined)

  const fetchModeInfo = async () => {
    const modeInfo = await messageDomain.getModeInfo()
    console.log('===> modeInfo', modeInfo)
    if (modeInfo) {
      setModeInfo(modeInfo)
      setModeAndAddress({ ...modeAndAddress!, modeInfoFetched: true })
    }
  }

  useEffect(() => {
    if (modeAndAddress && !modeAndAddress.modeInfoFetched) {
      fetchModeInfo()
    }
  }, [modeAndAddress])

  const connectWallet = async () => {
    try {
      const res = await messageDomain.connectWallet(walletType)
      console.log('===> connectWallet, res', res)
      setWalletInstalled(true)
      setWalletConnected(true)
      setModeAndAddress({
        mode: res.mode,
        address: res.address,
        modeInfoFetched: false
      })
      setNodeId(res.nodeId)
    } catch (error: any) {
      if (error.name === 'TanglePayUnintalled') {
        setWalletInstalled(false)
      }
      if (error.name === 'MetaMaskUnintalled') {
        setWalletInstalled(false)
      }
      if (error.name === 'TanglePayConnectFailed') {
        setWalletConnected(false)
      }
      if (error.name === 'MetaMaskConnectFailed') {
        setWalletConnected(false)
      }
    }
  }

  const listener = ({
    address,
    mode,
    nodeId
  }: {
    address: string
    mode: Mode
    nodeId?: number
  }) => {
    setNodeId(nodeId)
    setModeAndAddress((prev) => {
      if (prev?.address !== address || prev?.mode !== mode) {
        return {
          address,
          mode,
          modeInfoFetched: false
        }
      }
      return prev
    })
  }

  useEffect(() => {
    connectWallet()
    let stopListenner: undefined | (() => void) = undefined
    if (walletType === TanglePayWallet) {
      stopListenner = messageDomain.listenningTPAccountChanged(listener)
    } else if (walletType === MetaMaskWallet) {
      stopListenner = messageDomain.listenningMetaMaskAccountChanged(listener)
    }
    return () => {
      if (stopListenner) {
        debugger
        stopListenner()
      }
    }
  }, [walletType])

  const isCheckPassed = walletInstalled && walletConnected

  if (!isCheckPassed) {
    return renderCeckRenderWithDefaultWrapper(
      <AppWalletCheck
        walletType={walletType}
        walletInstalled={walletInstalled}
        walletConnected={walletConnected}
      />
    )
  }

  if (!modeAndAddress) {
    return <AppLoading />
  }

  const { mode, address } = modeAndAddress

  if (mode === ShimmerMode) {
    return <AppShimmerMode address={address} />
  }

  if (!modeAndAddress.modeInfoFetched) {
    return <AppLoading />
  }

  if (mode === ImpersonationMode) {
    return (
      <AppImpersationMode
        address={address}
        modeInfo={modeInfo!}
        nodeId={nodeId}
      />
    )
  }

  if (mode === DelegationMode) {
    return <AppDelegationMode address={address} modeInfo={modeInfo!} />
  }

  return <AppGuest />
}

function AppShimmerMode(props: { address: string }) {
  const { address } = props
  return <AppStart address={address} mode={ShimmerMode} modeInfo={{}} />
}

function AppDelegationMode(props: { address: string; modeInfo: ModeInfo }) {
  const { address, modeInfo } = props

  return (
    <AppStart address={address} mode={DelegationMode} modeInfo={modeInfo} />
  )
}

function AppImpersationMode(props: {
  address: string
  modeInfo: ModeInfo
  nodeId: number | undefined
}) {
  const { address, modeInfo, nodeId } = props

  const [isGuestMode, setIsGuestMode] = useState<boolean | undefined>(false)

  const [isPurchaseFinished, setIsPurchaseFinished] = useState<boolean>(false)

  const enterGuestMode = useCallback(() => {
    setIsGuestMode(true)
  }, [])

  const onPurchaseFinish = useCallback(() => {
    setIsPurchaseFinished(true)
  }, [])

  useEffect(() => {
    setIsGuestMode(false)
    setIsPurchaseFinished(false)
  }, [address])

  if (isGuestMode) {
    return <AppGuest />
  }

  if (!modeInfo.detail && !isPurchaseFinished) {
    return (
      <SMRPurchase
        nodeId={nodeId}
        address={address}
        modeInfo={modeInfo}
        enterGuestMode={enterGuestMode}
        onPurchaseFinish={onPurchaseFinish}
      />
    )
  }

  return (
    <AppStart address={address} mode={ImpersonationMode} modeInfo={modeInfo} />
  )
}

function AppStart(props: { address: string; mode: Mode; modeInfo: ModeInfo }) {
  const { address, mode, modeInfo } = props
  const { messageDomain } = useMessageDomain()

  const prevAddressAndModeRef = useRef<{ address: string; mode: Mode }>()

  const [_, setForceRefresh] = useState<number>(0)

  const initialAddress = async () => {
    await messageDomain.initialAddress(mode, modeInfo)
    prevAddressAndModeRef.current = {
      address,
      mode
    }
    setForceRefresh((o) => o + 1)
  }

  useEffect(() => {
    initialAddress()
  }, [address, mode])

  if (!prevAddressAndModeRef.current) {
    return <AppLoading />
  }

  if (
    prevAddressAndModeRef.current.address !== address ||
    prevAddressAndModeRef.current.mode !== mode
  ) {
    return <AppLoading />
  }

  return <AppLaunch {...props} />
}

function AppLaunch(props: { address: string; mode: Mode; modeInfo: ModeInfo }) {
  const { address, mode } = props
  const { messageDomain } = useMessageDomain()

  const init = async () => {
    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
  }

  const deinit = async () => {
    await messageDomain.stop()
    await messageDomain.destroy()
  }

  useEffect(() => {
    init()

    return () => {
      console.log('===>AppLaunch destroy')
      deinit()
    }
  }, [])

  return <AppCheck mode={mode} address={address} />

  // if (mode === ShimmerMode || mode === ImpersonationMode) {
  //   return <AppShimmerAndImpersationModeCheck address={address} mode={mode} />
  // }

  // if (mode === DelegationMode) {
  //   return <AppDelegationModeCheck address={address} />
  // }

  // return null
}

function AppCheck(props: { mode: Mode; address: string }) {
  const { address } = props
  const {
    hasEnoughCashToken,
    hasPublicKey,
    mintProcessFinished,
    onMintFinish
  } = useCheckNicknameNftAndCashTokenAndPublicKey(address)

  const isCheckPassed =
    hasEnoughCashToken && hasPublicKey && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={hasPublicKey}
      />
    )
  ) : (
    <AppRouter address={address} />
  )
}

function useLoadForMeGroupsAndMyGroups(address: string) {
  const includes = useAppSelector((state) => state.forMeGroups.includes)
  const excludes = useAppSelector((state) => state.forMeGroups.excludes)

  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()

  const loadForMeGroupList = async (params: {
    includes?: string[]
    excludes?: string[]
  }): Promise<GroupInfo[]> => {
    const forMeGroups = await messageDomain.getGroupfiServiceRecommendGroups(
      params
    )

    let groups: GroupInfo[] = forMeGroups

    if (params.includes !== undefined) {
      const sortedForMeGroups: GroupInfo[] = []
      params.includes.map((groupName) => {
        const index = forMeGroups.findIndex(
          (group) => group.groupName === groupName
        )
        if (index > -1) {
          sortedForMeGroups.push(forMeGroups[index])
        }
      })
      groups = sortedForMeGroups
    }

    appDispatch(setForMeGroups(groups))
    return groups
  }

  const loadMyGroupList = async () => {
    console.log('===>Enter myGroups request')
    const myGroups = await messageDomain.getGroupFiService().getMyGroups()
    console.log('===>myGroups', myGroups)
    appDispatch(setMyGroups(myGroups))
  }

  useEffect(() => {
    if (address) {
      ;(async () => {
        const groups = await loadForMeGroupList({ includes, excludes })
        if (groups.length === 1) {
          router.navigate(`/group/${groups[0].groupId}?home=true`)
        } else {
          router.navigate('/')
        }
      })()
    }
  }, [address, includes, excludes])

  useEffect(() => {
    if (address) {
      loadMyGroupList()
    }
  }, [address])
}

// function AppShimmerAndImpersationModeCheck(props: {
//   mode: Mode
//   address: string
// }) {
//   const { address, mode } = props
//   const {
//     hasEnoughCashToken,
//     hasPublicKey,
//     mintProcessFinished,
//     onMintFinish
//   } = useCheckNicknameNftAndCashTokenAndPublicKey(address)

//   const isCheckPassed =
//     hasEnoughCashToken && hasPublicKey && mintProcessFinished

//   return !isCheckPassed ? (
//     renderCeckRenderWithDefaultWrapper(
//       <AppNameAndCashAndPublicKeyCheck
//         onMintFinish={onMintFinish}
//         mintProcessFinished={mintProcessFinished}
//         hasEnoughCashToken={hasEnoughCashToken}
//         hasPublicKey={hasPublicKey}
//       />
//     )
//   ) : (
//     <AppRouter address={address} />
//   )
// }

// function AppDelegationModeCheck(props: { address: string }) {
//   const { address } = props
//   return <AppRouter address={address} />
// }

function AppLoading() {
  return renderCeckRenderWithDefaultWrapper(<Spinner />)
}

export function renderCeckRenderWithDefaultWrapper(element: JSX.Element) {
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-row items-center justify-center'
      )}
    >
      {element}
    </div>
  )
}
