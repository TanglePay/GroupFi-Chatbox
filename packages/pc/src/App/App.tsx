import { useEffect, useState } from 'react'
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
  DelegationMode
} from 'groupfi_trollbox_shared'
import { classNames } from 'utils'
import { Spinner } from 'components/Shared'
import SMRPurchase from '../components/SMRPurchase'

import { AppNameAndCashAndPublicKeyCheck, AppWalletCheck } from './AppCheck'
import {
  useCheckNicknameNftAndCashTokenAndPublicKey,
  useCheckIsPairXRegistered
} from './hooks'

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

  const [walletInstalled, setWalletInstalled] = useState<boolean | undefined>(
    undefined
  )

  const [walletConnected, setWalletConnected] = useState<boolean | undefined>(
    undefined
  )

  const [nodeId, setNodeId] = useState<number | undefined>(undefined)

  const [modeAndAddress, setModeAndAddress] = useState<
    { mode: Mode; address: string } | undefined
  >(undefined)

  const connectWallet = async () => {
    try {
      const res = await messageDomain.connectWallet(walletType)
      console.log('===> connectWallet, res', res)
      setWalletInstalled(true)
      setWalletConnected(true)
      setModeAndAddress({
        mode: res.mode,
        address: res.address
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
          mode
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

  return (
    <AppLaunch
      mode={modeAndAddress.mode}
      address={modeAndAddress.address}
      nodeId={nodeId}
    />
  )

  // const { mode, address } = modeAndAddress

  // if (mode === ShimmerMode) {
  //   return <AppShimmerMode address={address} />
  // }

  // if (mode === ImpersonationMode) {
  //   return (
  //     <AppImpersationMode
  //       address={address}
  //       nodeId={nodeId}
  //     />
  //   )
  // }

  // if (mode === DelegationMode) {
  //   return <AppDelegationMode address={address} />
  // }

  // return <AppGuest />
}

function AppLaunch(props: { address: string; mode: Mode; nodeId?: number }) {
  const { address, mode, nodeId } = props
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
      deinit()
    }
  }, [])

  if (mode === ShimmerMode) {
    return <AppShimmerMode address={address} />
  }

  if (mode === ImpersonationMode) {
    return <AppImpersonationMode address={address} nodeId={nodeId} />
  }

  if (mode === DelegationMode) {
    return <AppDelegationModeCheck address={address} />
  }
}

function AppShimmerMode(props: { address: string }) {
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

function AppImpersonationMode(props: {
  address: string
  nodeId: number | undefined
}) {
  const { address, nodeId } = props

  const {
    hasEnoughCashToken,
    hasPublicKey,
    mintProcessFinished,
    onMintFinish
  } = useCheckNicknameNftAndCashTokenAndPublicKey(address)

  const isPairXRegistered = useCheckIsPairXRegistered(address)

  if (isPairXRegistered === undefined) {
    return <AppLoading />
  }

  if (isPairXRegistered === false) {
    return <SMRPurchase nodeId={nodeId} address={address} />
  }

  const isCheckPassed = hasEnoughCashToken && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={true}
      />
    )
  ) : (
    <AppRouter address={address} />
  )
}

function AppDelegationModeCheck(props: { address: string }) {
  const { address } = props
  const {
    hasEnoughCashToken,
    hasPublicKey,
    mintProcessFinished,
    onMintFinish
  } = useCheckNicknameNftAndCashTokenAndPublicKey(address)

  const isPairXRegistered = useCheckIsPairXRegistered(address)

  if (!isPairXRegistered) {
    return <AppLoading />
  }

  const isCheckPassed = hasEnoughCashToken && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={true}
      />
    )
  ) : (
    <AppRouter address={address} />
  )
}

// function AppStart(props: { address: string; mode: Mode }) {
//   const { address, mode } = props
//   const { messageDomain } = useMessageDomain()

//   const prevAddressAndModeRef = useRef<{ address: string; mode: Mode }>()

//   const [_, setForceRefresh] = useState<number>(0)

//   const initialAddress = async () => {
//     await messageDomain.initialAddress(mode, modeInfo)
//     prevAddressAndModeRef.current = {
//       address,
//       mode
//     }
//     setForceRefresh((o) => o + 1)
//   }

//   useEffect(() => {
//     initialAddress()
//   }, [address, mode])

//   if (!prevAddressAndModeRef.current) {
//     return <AppLoading />
//   }

//   if (
//     prevAddressAndModeRef.current.address !== address ||
//     prevAddressAndModeRef.current.mode !== mode
//   ) {
//     return <AppLoading />
//   }

//   return <AppLaunch {...props} />
// }

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
