import {
  MetaMaskWallet,
  TanglePayWallet,
  WalletType,
  useMessageDomain,
  Mode
} from 'groupfi_chatbox_shared'
import { classNames } from 'utils'
import { Spinner } from 'components/Shared'
import { UserNameCreation } from 'components/UserName'

export function AppWalletCheck({
  walletType,
  walletInstalled,
  walletConnected
}: {
  walletType: WalletType
  walletInstalled: boolean | undefined
  walletConnected: boolean | undefined
}) {
  const walletNmae =
    walletType === TanglePayWallet
      ? 'TanglePay'
      : walletType === MetaMaskWallet
      ? 'MetaMask'
      : 'Unknown wallet'

  if (walletInstalled === undefined) {
    return <Spinner />
  }

  if (!walletInstalled) {
    return (
      <div className="font-medium">
        You should install
        <span className={classNames('text-sky-500')}> {walletNmae}</span>
        Frist
      </div>
    )
  }

  if (walletConnected === undefined) {
    return <Spinner />
  }

  if (!walletConnected) {
    return (
      <div className="font-medium">
        Fail to connect
        <span className={classNames('text-sky-500')}> {walletNmae}</span>
      </div>
    )
  }

  return null
}

export function AppNameAndCashAndPublicKeyCheck(props: {
  hasEnoughCashToken: boolean | undefined
  hasPublicKey: boolean | undefined
  mintProcessFinished: boolean | undefined
  onMintFinish: () => void
  mode: Mode
}) {
  const {
    hasEnoughCashToken,
    hasPublicKey,
    mintProcessFinished,
    onMintFinish,
    mode
  } = props

  if (hasEnoughCashToken === undefined) {
    return <Spinner />
  }

  if (!hasEnoughCashToken) {
    return (
      <div className="font-medium">
        You should have at least
        <br />
        <span className={classNames('text-sky-500')}>10 SMR</span> in your
        account
      </div>
    )
  }

  if (mintProcessFinished === undefined) {
    return <Spinner />
  }

  if (!mintProcessFinished) {
    return <UserNameCreation mode={mode} onMintFinish={onMintFinish} />
  }

  if (hasPublicKey === undefined) {
    return <Spinner />
  }

  if (!hasPublicKey) {
    return (
      <>
        <div className={classNames('mt-1')}>
          Creating public key
          <div className={classNames('flex justify-center mt-2')}>
            <Spinner />
          </div>
        </div>
      </>
    )
  }

  return null
}
