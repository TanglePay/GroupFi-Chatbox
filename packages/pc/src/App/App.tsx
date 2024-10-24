import { useCallback, useEffect, useRef, useState } from 'react'
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
import SMRPurchase from '../components/SMRPurchase'
import { Register, Login } from 'components/RegisterAndLogin'
import {
  changeActiveTab,
  setNodeInfo,
  setIsMessageDomainIniting
} from '../redux/appConfigSlice'

import { AppNameAndCashAndPublicKeyCheck, AppWalletCheck } from './AppCheck'
import {
  useCheckBalance,
  useCheckNicknameNft,
  useCheckPublicKey
} from './hooks'
import {
  ACTIVE_TAB_KEY,
  GROUP_INFO_KEY,
  getLocalParentStorage
} from 'utils/storage'
import useIsForMeGroupsLoading from 'hooks/useIsForMeGroupsLoading'
import { removeHexPrefixIfExist } from 'utils'
import useProfile from 'hooks/useProfile'

const routes: RouteObject[] = [
  {
    path: '/',
    async lazy() {
      const Component = (await import('../components/SplitLayout/SplitLayout')).default
      return { element: <Component /> }
    },
    children: [
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
  }
]

const router = createBrowserRouter(routes)

const useInitRouter = (handleRouteComplete: () => void) => {
  const appDispatch = useAppDispatch()
  const nodeInfo = useAppSelector((state) => state.appConifg.nodeInfo)

  useEffect(() => {
    const activeTab = getLocalParentStorage(ACTIVE_TAB_KEY, nodeInfo)
    appDispatch(changeActiveTab(activeTab || ''))
    if (!window.location.pathname.includes('group/')) {
      if (activeTab == 'ofMe') {
        const groupInfo = getLocalParentStorage(GROUP_INFO_KEY, nodeInfo)
        if (groupInfo?.groupId) {
          router
            .navigate(`/group/${groupInfo?.groupId}`)
            .then(() => {
              console.log('Return to previous page success', groupInfo?.groupId)
            })
            .catch((error) => {
              console.error('Return to previous page error', error)
            })
            .finally(() => {
              // Regardless, determine the routing task has been completed
              handleRouteComplete()
            })
          return
        }
      }
    }
    handleRouteComplete()
  }, [])
}

function AppRouter() {
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
    const chatGroups = messageDomain.getForMeGroupConfigs()
    if (chatGroups === undefined) {
      return
    }
    if (activeTab === 'forMe' && !window.location.pathname.startsWith('/group/')) {
      if (chatGroups.length === 1) {
        const groupId = removeHexPrefixIfExist(chatGroups[0].groupId)
        await router.navigate(`/group/${groupId}?home=true`)
      } else if (chatGroups.length > 1) {
        await router.navigate('/')
      }
    }
    setIsFirstFinished(true)
  }

  useEffect(() => {
    // Sometimes, for example, when you need to log in, the chat request is already completed.
    // so exec navigateToChatRoom at once
    navigateToChatRoom()
  }, [])

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
      console.log('connectWalletres',res.address)
      console.log('connectWalletresmode',res.mode)

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
    console.log("gggg", newAccount)
    await messageDomain.onMetaMaskAccountChanged(newAccount)
    setModeAndAddress({
      address: newAccount,
      mode: DelegationMode
    })
  }

  useEffect(() => {
    console.log("addresscompare",modeAndAddress?.address, metaMaskAccountFromDapp)
    if (
      metaMaskAccountFromDapp !== undefined &&
      modeAndAddress !== undefined &&
      modeAndAddress.address !== metaMaskAccountFromDapp
    ) {
      console.log("aaaaa")
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

function AppLaunchAnAddress(props: {
  address: string
  mode: Mode
  nodeId?: number
}) {
  const appDispatch = useAppDispatch()
  const { mode, address, nodeId } = props
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()

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
    return <AppShimmerMode address={address} />
  }

  if (mode === ImpersonationMode) {
    return <AppImpersonationMode address={address} nodeId={nodeId} />
  }

  if (mode === DelegationMode) {
    return <AppDelegationModeCheck address={address} />
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

function AppShimmerMode(props: { address: string }) {
  const { address } = props

  const hasEnoughCashToken = useCheckBalance(address)
  const hasPublicKey = useCheckPublicKey(address)
  const [mintProcessFinished, onMintFinish] = useCheckNicknameNft(address)

  const isCheckPassed =
    hasEnoughCashToken && hasPublicKey && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={hasPublicKey}
        mode={ShimmerMode}
      />
    )
  ) : (
    <AppRouter />
  )
}

function AppImpersonationMode(props: {
  address: string
  nodeId: number | undefined
}) {
  const { messageDomain } = useMessageDomain()
  const { address, nodeId } = props

  const [isRegistered, setIsRegistered] = useState<boolean | undefined>(
    undefined
  )

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(undefined)

  const hasEnoughCashToken = useCheckBalance(address)

  const [mintProcessFinished, onMintFinish] = useCheckNicknameNft(address)

  const callback = useCallback(() => {
    const isRegistered = messageDomain.isRegistered()
    setIsRegistered(isRegistered)
    const isLoggedIn = messageDomain.isLoggedIn()
    setIsLoggedIn(isLoggedIn)
    // const isBrowseMode = messageDomain.isUserBrowseMode()
    // setIsBrowseMode(isBrowseMode)
  }, [])

  useEffect(() => {
    // TODO call callback to get the initial value
    messageDomain.onLoginStatusChanged(callback)
    // messageDomain.onNameChanged(nameCallback)
    callback()
    // nameCallback()
    return () => {
      messageDomain.offLoginStatusChanged(callback)
      // messageDomain.offNameChanged(nameCallback)
    }
  }, [])

  if (isRegistered === undefined) {
    return <AppLoading />
  }

  if (!isRegistered) {
    return <SMRPurchase nodeId={nodeId} address={address} />
  }

  if (isLoggedIn === undefined) {
    return <AppLoading />
  }

  if (!isLoggedIn) {
    return <Login />
  }

  // return <AppLoading />

  // const isHasPairX = useCheckIsHasPairX(address)

  // const hasEnoughCashToken = useCheckBalance(address)

  // if (isHasPairX === false && hasEnoughCashToken === false) {
  //   return <SMRPurchase nodeId={nodeId} address={address} />
  // }

  // if (!isHasPairX) {
  //   return <AppLoading />
  // }

  const isCheckPassed = hasEnoughCashToken && mintProcessFinished

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={onMintFinish}
        mintProcessFinished={mintProcessFinished}
        hasEnoughCashToken={hasEnoughCashToken}
        hasPublicKey={true}
        mode={ImpersonationMode}
      />
    )
  ) : (
    <AppRouter />
  )
}

function AppDelegationModeCheck(props: { address: string }) {
  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()

  const [isRegistered, setIsRegistered] = useState<boolean | undefined>(
    messageDomain.isRegistered()
  )
  console.log('messageDomainisRegistered',isRegistered)

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(
    messageDomain.isLoggedIn()
  )

  const [isBrowseMode, setIsBrowseMode] = useState<boolean>(
    messageDomain.isUserBrowseMode()
  )

  const profile = useProfile()

  const callback = useCallback(() => {
    const isRegistered = messageDomain.isRegistered()
    setIsRegistered(isRegistered)
    const isLoggedIn = messageDomain.isLoggedIn()
    setIsLoggedIn(isLoggedIn)
    const isBrowseMode = messageDomain.isUserBrowseMode()
    setIsBrowseMode(isBrowseMode)
  }, [])

  // const nameCallback = useCallback(() => {
  //   const name = messageDomain.getName()
  //   setName(name)
  // }, [])

  // useEffect(() => {
  //   if (name) {
  //     appDispatch(setUserProfile({ name }))
  //   }
  // }, [name])

  useEffect(() => {
    // TODO call callback to get the initial value
    messageDomain.onLoginStatusChanged(callback)
    // messageDomain.onNameChanged(nameCallback)
    // callback()
    // nameCallback()
    return () => {
      messageDomain.offLoginStatusChanged(callback)
      // messageDomain.offNameChanged(nameCallback)
    }
  }, [])

  if (isRegistered === undefined) {
    return <AppLoading />
  }

  if (!isRegistered && !isBrowseMode) {
    return <Register />
  }

  if (isBrowseMode) {
    return <AppRouter />
  }

  if (isLoggedIn === undefined) {
    return <AppLoading />
  }

  if (!isLoggedIn && !isBrowseMode) {
    return <Login />
  }

  if (!isBrowseMode && profile === undefined) {
    return <AppLoading />
  }

  const isCheckPassed = !!profile || isBrowseMode

  return !isCheckPassed ? (
    renderCeckRenderWithDefaultWrapper(
      <AppNameAndCashAndPublicKeyCheck
        onMintFinish={() => {}}
        mintProcessFinished={!!profile}
        hasEnoughCashToken={true}
        hasPublicKey={true}
        mode={DelegationMode}
      />
    )
  ) : (
    <AppRouter />
  )
}

