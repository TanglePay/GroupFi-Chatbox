import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppWrapper, Spinner } from 'components/Shared'
import { useEffect, createContext, useState, lazy } from 'react'
import { MqttClient } from '@iota/mqtt.js'
import { connect } from 'mqtt'
import { useMessageDomain } from 'groupfi_trollbox_shared'
import { LocalStorageAdaptor, classNames } from 'utils'
import { SWRConfig } from 'swr'

import { useAppDispatch, useAppSelector } from './redux/hooks'
import { setForMeGroups } from './redux/forMeGroupsSlice'
import { setMyGroups } from './redux/myGroupsSlice'

import sdkInstance, { trollboxEventEmitter } from './sdk'

import './App.scss'

// Not check cash token and public key in development env
const isProd = import.meta.env.MODE !== 'development'

const router = createBrowserRouter([
  {
    path: '/',
    async lazy() {
      const Component = (await import('./components/GroupList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id',
    async lazy() {
      const Component = (await import('./components/ChatRoom')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('./components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/info',
    async lazy() {
      const Component = (await import('./components/GroupInfo')).default
      return { Component }
    }
  },
  {
    path: 'group/:id/members',
    async lazy() {
      const Component = (await import('./components/GroupMemberList')).default
      return { Component }
    }
  },
  {
    path: 'user/:id',
    async lazy() {
      const Component = (await import('./components/UserInfo')).default
      return { Component }
    }
  },
  {
    path: 'user/:id/name',
    async lazy() {
      const Component = (await import('./components/UserName')).default
      return { Component }
    }
  }
])

export const AppInitedContext = createContext({
  inited: false
})

function App() {
  const { messageDomain } = useMessageDomain()

  const [address, setAddress] = useState<string | undefined>(undefined)

  const [isTPInstalled, setIsTPInstalled] = useState<boolean | undefined>(
    undefined
  )

  useLoadForMeGroupsAndMyGroups(address)

  const [hasEnoughCashToken, hasPublicKey] =
    useCheckCashTokenAndPublicKey(address)

  const fn = async () => {
    try {
      const adapter = new LocalStorageAdaptor()
      messageDomain.setStorageAdaptor(adapter)

      const { address, nodeId } = await messageDomain.connectWallet()
      setIsTPInstalled(true)

      trollboxEventEmitter.walletConnectedChanged({
        data: {
          walletType: 'TanglePay',
          address: address,
          nodeId
        }
      })

      await messageDomain.setupGroupFiMqttConnection(connect)

      messageDomain.listenningAccountChanged(({ address, nodeId }) => {
        trollboxEventEmitter.walletConnectedChanged({
          data: {
            walletType: 'TanglePay',
            address,
            nodeId
          }
        })
        setAddress(address)
      })
      await messageDomain
        .getGroupFiService()
        .setupIotaMqttConnection(MqttClient)

      setAddress(address)

      await messageDomain.bootstrap()
      await messageDomain.start()
      await messageDomain.resume()
    } catch (error: any) {
      console.log('init error', error)
      if (error.name === 'TanglePayUnintalled') {
        setIsTPInstalled(false)
        trollboxEventEmitter.walletConnectedChanged({
          reason: error.name
        })
      }
      if (error.name === 'TanglePayConnectFailed') {
        trollboxEventEmitter.walletConnectedChanged({
          reason: error.name
        })
      }
    }
  }

  const initSDK = () => {
    return sdkInstance.listenningMessage()
  }

  useEffect(() => {
    fn()

    const stopListenningDappMessage = initSDK()
    return stopListenningDappMessage
  }, [])

  return (
    <SWRConfig value={{}}>
      <AppInitedContext.Provider
        value={{
          inited: address !== undefined
        }}
      >
        <AppWrapper>
          {!hasEnoughCashToken || !hasPublicKey || !isTPInstalled ? (
            <CheckRender
              hasEnoughCashToken={hasEnoughCashToken}
              hasPublicKey={hasPublicKey}
              isTPInstalled={isTPInstalled}
            />
          ) : (
            <RouterProvider
              router={router}
              fallbackElement={<p>Loading...</p>}
            ></RouterProvider>
          )}
        </AppWrapper>
      </AppInitedContext.Provider>
    </SWRConfig>
  )
}

function useCheckCashTokenAndPublicKey(
  address: string | undefined
): [boolean | undefined, boolean | undefined] {
  const { messageDomain } = useMessageDomain()

  const [hasEnoughCashToken, setHasEnoughCashToken] = useState<
    boolean | undefined
  >(undefined)

  const [hasPublicKey, setHasPublicKey] = useState<boolean | undefined>(
    undefined
  )

  useEffect(() => {
    if (address !== undefined) {
      setHasEnoughCashToken(undefined)
      setHasPublicKey(undefined)
      const off1 = messageDomain.onHasEnoughCashTokenOnce(() => {
        setHasEnoughCashToken(true)
      })
      const off2 = messageDomain.onNotHasEnoughCashTokenOnce(() => {
        setHasEnoughCashToken(false)
      })
      const off3 = messageDomain.onAquiringPublicKeyOnce(() => {
        setHasPublicKey(false)
      })
      const off4 = messageDomain.onIsHasPublicKeyChangedOnce(() => {
        setHasPublicKey(true)
      })

      return () => {
        off1()
        off2()
        off3()
        off4()
      }
    }
  }, [address])

  return [hasEnoughCashToken, hasPublicKey]
}

function CheckRender(props: {
  hasEnoughCashToken: boolean | undefined
  hasPublicKey: boolean | undefined
  isTPInstalled: boolean | undefined
}) {
  const { hasEnoughCashToken, hasPublicKey, isTPInstalled } = props
  return (
    <div
      className={classNames(
        'w-full h-full flex flex-row items-center justify-center'
      )}
    >
      {isTPInstalled === undefined ? (
        <>
          <Spinner />
        </>
      ) : !isTPInstalled ? (
        <div className="font-medium">
          You should install
          <span className={classNames('text-sky-500')}> TanglePay</span> Frist
        </div>
      ) : hasEnoughCashToken === undefined ? (
        <>
          <Spinner />
        </>
      ) : hasEnoughCashToken ? (
        hasPublicKey === undefined ? (
          <>
            <Spinner />
          </>
        ) : !hasPublicKey ? (
          <>
            <Spinner />
            <div className={classNames('mt-1')}>Creating public key</div>
          </>
        ) : null
      ) : (
        <div className="font-medium">
          You should have at least
          <br />
          <span className={classNames('text-sky-500')}>10 SMR</span> in your
          account
        </div>
      )}
    </div>
  )
}

function useLoadForMeGroupsAndMyGroups(address: string | undefined) {
  const includes = useAppSelector((state) => state.forMeGroups.includes)
  const excludes = useAppSelector((state) => state.forMeGroups.excludes)

  const { messageDomain } = useMessageDomain()
  const appDispatch = useAppDispatch()

  const loadForMeGroupList = async (params: {
    includes?: string[]
    excludes?: string[]
  }) => {
    const forMeGroups = await messageDomain
      .getGroupFiService()
      .getRecommendGroups(params)
    console.log('===>forMeGroups', forMeGroups)
    appDispatch(setForMeGroups(forMeGroups))
  }

  const loadMyGroupList = async () => {
    console.log('===>Enter myGroups request')
    const myGroups = await messageDomain.getGroupFiService().getMyGroups()
    console.log('===>myGroups', myGroups)
    appDispatch(setMyGroups(myGroups))
  }

  useEffect(() => {
    if (address) {
      loadForMeGroupList({ includes, excludes })
    }
  }, [address, includes, excludes])

  useEffect(() => {
    if (address) {
      loadMyGroupList()
    }
  }, [address])
}

export default App
