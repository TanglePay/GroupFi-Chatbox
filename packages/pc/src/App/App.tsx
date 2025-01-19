import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import {
  RouterProvider,
  createBrowserRouter,
  RouteObject
} from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../redux/hooks'
import {
  TanglePayWallet,
  MetaMaskWallet,
  useMessageDomain,
  Mode,
  ShimmerMode,
  ImpersonationMode,
  DelegationMode
} from 'groupfi-sdk-chat'
import {
  renderCeckRenderWithDefaultWrapper,
  AppLoading
} from 'components/Shared'
// import SMRPurchase from '../components/SMRPurchase'
// import { Register, Login } from 'components/RegisterAndLogin'
import {
  changeActiveTab,
  setNodeInfo,
  setIsMessageDomainIniting
} from '../redux/appConfigSlice'

import { AppWalletCheck } from './AppCheck'
import {
  ACTIVE_TAB_KEY,
  GROUP_INFO_KEY,
  getLocalParentStorage
} from 'utils/storage'
import useIsForMeGroupsLoading from 'hooks/useIsForMeGroupsLoading'
import { removeHexPrefixIfExist } from 'utils'

const routes: RouteObject[] = [
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
  },
  {
    path: 'profile/edit',
    async lazy() {
      const Component = (await import('../components/ProfileEdit')).default
      return { Component }
    }
  }
]

const router = createBrowserRouter(routes)

const useInitRouter = (handleRouteComplete: () => void) => {
  const appDispatch = useAppDispatch()
  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)
  const { messageDomain } = useMessageDomain()

  useEffect(() => {
    const activeTab = getLocalParentStorage(ACTIVE_TAB_KEY, nodeInfo)
    appDispatch(changeActiveTab(activeTab || ''))
    if (!window.location.pathname.includes('group/')) {
      if (activeTab == 'ofMe') {
        const groupInfo = getLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
        if (groupInfo?.groupId) {
          // Wait for group config to be ready before navigating
          messageDomain.waitForGroupConfigReady(groupInfo.groupId)
            .then(ready => {
              if (ready) {
                return router.navigate(`/group/${groupInfo?.groupId}`)
              }
              console.warn('Group config not ready in time')
              handleRouteComplete()
            })
            .then(() => {
              console.log('Return to previous page success', groupInfo?.groupId)
            })
            .catch((error) => {
              console.error('Return to previous page error', error)
            })
            .finally(() => {
              handleRouteComplete()
            })
          return
        }
      }
    }
    handleRouteComplete()
  }, [])
}

export function AppRouter() {
  const [isReturnToPrevPageRouting, setIsReturnToPrevPageRouting] =
    useState(true)
  const handleReturnToPrevPageComplete = useCallback(() => {
    setIsReturnToPrevPageRouting(false)
  }, [])
  useInitRouter(handleReturnToPrevPageComplete)

  const isFirstFinished = useHandleChangeRecommendChatGroup()

  if (isReturnToPrevPageRouting) {
    return <AppLoading />
  }

  if (!isFirstFinished) {
    return <AppLoading />
  }

  return (
    <RouterProvider
      router={router}
      fallbackElement={<p>Loading...</p>}
    ></RouterProvider>
  )
}

function useHandleChangeRecommendChatGroup() {
  const { messageDomain } = useMessageDomain()
  const activeTab = useAppSelector((state) => state.appConifg.activeTab)
  const [isFirstFinished, setIsFirstFinished] = useState(false)

  useEffect(() => {
    if (activeTab !== 'forMe') {
      setIsFirstFinished(true)
    }
  }, [activeTab])

  const isForMeGroupsLoading = useIsForMeGroupsLoading()
  const helperRef = useRef({
    isSetChatGroupsStart: false
  })

  const navigateToChatRoom = async () => {
    // log enter
    console.log('navigateToChatRoom enter')
    const chatGroups = messageDomain.getForMeGroupConfigs()
    if (chatGroups === undefined) {
      return
    }
    if (activeTab === 'forMe') {
      if (chatGroups.length === 1) {
        const groupId = removeHexPrefixIfExist(chatGroups[0].groupId)
        await router.navigate(`/group/${groupId}?home=true`)
      }
    }
    setIsFirstFinished(true)
  }

  useEffect(() => {
    navigateToChatRoom()
  }, [isForMeGroupsLoading])

  // Listen for changes to setGroups.
  useEffect(() => {
    if (isForMeGroupsLoading) {
      helperRef.current.isSetChatGroupsStart = true
    }
    if (
      helperRef.current.isSetChatGroupsStart &&
      isForMeGroupsLoading === false
    ) {
      helperRef.current.isSetChatGroupsStart = false
      navigateToChatRoom()
    }
  }, [isForMeGroupsLoading])

  return isFirstFinished
}

export function AppWithWalletType(props: {
  walletType: typeof TanglePayWallet | typeof MetaMaskWallet
  metaMaskAccountFromDapp: string | undefined
}) {
  const { walletType, metaMaskAccountFromDapp } = props

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
      const res = await messageDomain.connectWallet(
        walletType,
        metaMaskAccountFromDapp
      )
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

  const fn = async () => {
    await connectWallet()

    const listener = async ({
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

    let stopListenner: undefined | (() => void) = undefined

    if (walletType === TanglePayWallet) {
      stopListenner = messageDomain.listenningTPAccountChanged(listener)
    }

    return () => {
      if (stopListenner) {
        stopListenner()
      }
    }
  }

  const onMetaMaskAccountChanged = async (newAccount: string) => {
    await messageDomain.onMetaMaskAccountChanged(newAccount)
    setModeAndAddress({
      address: newAccount,
      mode: DelegationMode
    })
  }

  useEffect(() => {
    if (
      metaMaskAccountFromDapp !== undefined &&
      modeAndAddress !== undefined &&
      modeAndAddress.address !== metaMaskAccountFromDapp
    ) {
      onMetaMaskAccountChanged(metaMaskAccountFromDapp)
    }
  }, [metaMaskAccountFromDapp])

  useEffect(() => {
    fn()
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

  if (
    metaMaskAccountFromDapp !== undefined &&
    modeAndAddress.address !== metaMaskAccountFromDapp
  ) {
    return <AppLoading />
  }

  return (
    <AppLaunchAnAddress
      mode={modeAndAddress.mode}
      address={modeAndAddress.address}
      nodeId={nodeId}
    />
  )
}

const AppShimmerMode = lazy(() => import('./AppShimmerMode'))
const AppImpersonationMode = lazy(() => import('./AppImpersonationMode'))
const AppDelegationMode = lazy(() => import('./AppDelegationMode'))

function AppLaunchAnAddress(props: {
  address: string
  mode: Mode
  nodeId?: number
}) {
  const appDispatch = useAppDispatch()
  const { mode, address, nodeId } = props
  const { messageDomain } = useMessageDomain()

  const [inited, setInited] = useState<boolean>(false)

  const clearUp = async () => {
    try {
      await messageDomain.pause()
      await messageDomain.stop()
      await messageDomain.destroy()
    } catch (error) {
      console.info('AppLaunchAnAddress clearUp error', error)
    }
  }

  const startup = async () => {
    appDispatch(setIsMessageDomainIniting(true))
    await clearUp()

    messageDomain.setWalletAddress(address, 'App launch an address')
    await messageDomain.setStorageKeyPrefix(address)

    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()

    console.log('messageDomian start finish', Date.now())

    setInited(true)
    appDispatch(setIsMessageDomainIniting(false))
  }

  useEffect(() => {
    startup()
    return () => {
      console.log('AppLaunchAnAddress unmount')
    }
  }, [address, mode])

  useEffect(() => {
    appDispatch(setNodeInfo({ address, mode, nodeId }))
  }, [address, mode, nodeId])

  if (!inited) {
    return <AppLoading />
  }

  // if (!/^0x/i.test(String(address))) {
  //   return renderCeckRenderWithDefaultWrapper(
  //     <TextWithSpinner text={'Chain not supported'} />
  //   )
  // }

  if (mode === ShimmerMode) {
    return (
      <Suspense fallback={<AppLoading />}>
        <AppShimmerMode address={address} />
      </Suspense>
    )
  }

  if (mode === ImpersonationMode) {
    return (
      <Suspense fallback={<AppLoading />}>
        <AppImpersonationMode address={address} nodeId={nodeId} />
      </Suspense>
    )
  }

  if (mode === DelegationMode) {
    return (
      <Suspense fallback={<AppLoading />}>
        <AppDelegationMode address={address} />
      </Suspense>
    )
  }
}

export function AppLaunchBrowseMode() {
  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()
  const [inited, setInited] = useState<boolean>(false)

  const startup = async () => {
    appDispatch(setIsMessageDomainIniting(true))

    await clearUp()

    messageDomain.setWalletAddress('', 'App launch browse mode')
    await messageDomain.setStorageKeyPrefix('')

    await messageDomain.browseModeSetupClient()
    await messageDomain.bootstrap()
    await messageDomain.start()
    await messageDomain.resume()
    messageDomain.setUserBrowseMode(true)
    console.log('messageDomian start', Date.now())

    setInited(true)
    appDispatch(setIsMessageDomainIniting(false))
  }

  const clearUp = async () => {
    try {
      await messageDomain.pause()
      await messageDomain.stop()
      await messageDomain.destroy()
    } catch (error) {
      console.log('AppLaunchBrowseMode clearup error', error)
    }
  }

  useEffect(() => {
    startup()

    return () => {
      console.log('AppLaunchBrowseMode unmount')
    }
  }, [])

  if (!inited) {
    return <AppLoading />
  }

  return <AppRouter />
}