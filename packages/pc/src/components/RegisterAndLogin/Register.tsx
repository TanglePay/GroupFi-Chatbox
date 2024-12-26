import { useState } from 'react'
import { classNames } from 'utils'
import {
  Powered,
  renderCeckRenderWithDefaultWrapper,
  TextWithSpinner
} from '../Shared'
import { useMessageDomain } from 'groupfi-sdk-chat'
import useEncryptionPublicKey from 'hooks/useEncryptionPublicKey'
import useSignature from 'hooks/useSignature'
import { LogoAndTitle } from './shared'

export default function Register() {
  const { messageDomain } = useMessageDomain()
  const [isRegistering, setIsRegistering] = useState<boolean>(false)

  const encryptionPublicKey = useEncryptionPublicKey()
  const signature = useSignature()

  if (signature) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Registering account on chain..." />
    )
  }

  if (encryptionPublicKey) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Creating account..." />
    )
  }

  if (isRegistering) {
    return renderCeckRenderWithDefaultWrapper(
      <TextWithSpinner text="Signing..." />
    )
  }

  return (
    <div className={classNames('w-full h-full flex flex-col justify-between overflow-auto')}>
      <div className={classNames('flex-auto flex flex-col justify-evenly')}>
        <LogoAndTitle
          title={'GroupFi Chatbox'}
          subTitle="Decentralized Chat, Unified Community"
        />
        <div className={classNames('px-5')}>
          <button
            className={classNames('w-full h-12 bg-accent-600 dark:bg-accent-500 rounded-xl')}
            onClick={() => {
              messageDomain.registerPairX()
              setIsRegistering(true)
            }}
          >
            <span className={classNames('text-white')}>Create Account</span>
          </button>
          <div className={classNames('py-3 px-5 text-accent-600 dark:text-accent-500 text-center')}>
            <button
              onClick={() => {
                messageDomain.setUserBrowseMode(true)
              }}
            >
              Browse as a guest
            </button>
          </div>
        </div>
      </div>
      <Powered />
    </div>
  )
}
