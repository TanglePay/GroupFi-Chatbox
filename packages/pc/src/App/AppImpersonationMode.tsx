import { useCallback, useEffect, useState, lazy } from 'react'
import { useMessageDomain, ImpersonationMode } from 'groupfi-sdk-chat'
import {
  renderCeckRenderWithDefaultWrapper,
  AppLoading
} from 'components/Shared'
// import SMRPurchase from '../components/SMRPurchase'
// import { Register, Login } from 'components/RegisterAndLogin'
import { AppRouter} from './App'
 
import { AppNameAndCashAndPublicKeyCheck } from './AppCheck'
import {
  useCheckBalance,
  useCheckNicknameNft,
} from './hooks'


// 使用 dynamic import 动态导入 Register 和 Login
const SMRPurchase = lazy(() => import('../components/SMRPurchase/index'))
const Login = lazy(() => import('../components/RegisterAndLogin/Login'))


export default function AppImpersonationMode(props: {
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
