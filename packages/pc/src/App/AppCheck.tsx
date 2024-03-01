import { useMessageDomain } from 'groupfi_trollbox_shared'
import { classNames } from 'utils'
import { Spinner } from 'components/Shared'
import { UserNameCreation } from 'components/UserName'

export default function AppCheck(props: {
  hasEnoughCashToken: boolean | undefined
  hasPublicKey: boolean | undefined
  isTPInstalled: boolean | undefined
  mintProcessFinished: boolean | undefined
  onMintFinish: () => void
  isChainSupported: boolean | undefined
}) {
  const { messageDomain } = useMessageDomain()
  const groupFiService = messageDomain.getGroupFiService()
  const {
    isChainSupported,
    hasEnoughCashToken,
    hasPublicKey,
    isTPInstalled,
    mintProcessFinished,
    onMintFinish
  } = props

  if (isTPInstalled === undefined) {
    return <Spinner />
  }

  if (!isTPInstalled) {
    return (
      <div className="font-medium">
        You should install
        <span className={classNames('text-sky-500')}> TanglePay</span> Frist
      </div>
    )
  }

  if (isChainSupported === undefined) {
    return <Spinner />
  }

  if (!isChainSupported) {
    return (
      <div className={classNames('font-medium text-center')}>
        <span className={classNames('text-sky-500 mr-1')}>GroupFi</span> only
        supports
        <br />
        <span className={classNames('text-sky-500 mr-1')}>Shimmer Mainnet</span>
        currently.
        <br />
        <br />
        Please switch to the correct chain
        <br />
        in your wallet first.
      </div>
    )
  }

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
    return (
      <UserNameCreation
        groupFiService={groupFiService}
        onMintFinish={onMintFinish}
      />
    )
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
