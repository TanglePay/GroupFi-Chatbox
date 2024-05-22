import { useEffect, useState } from 'react'
import { classNames } from 'utils'
import { useMessageDomain } from 'groupfi_trollbox_shared'

export function Login() {
  const { messageDomain } = useMessageDomain()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  if (isLoggingIn) {
    return <div>Connecting...</div>
  }
  return (
    <div>
      <button
        className={classNames('border')}
        onClick={() => {
          messageDomain.login()
          setIsLoggingIn(true)
        }}
      >
        Connect
      </button>
    </div>
  )
}

export function Register() {
  const { messageDomain } = useMessageDomain()
  const [isRegistering, setIsRegistering] = useState<boolean>(false)
  const [isEncryptionPublicKeySet, setIsEncryptionPublicKeySet] =
    useState<boolean>(false)
  const [isSignatureSet, setIsSignatureSet] = useState<boolean>(false)

  useEffect(() => {
    messageDomain.onLoginStatusChanged(() => {
      setIsEncryptionPublicKeySet(messageDomain.isEncryptionPublicKeySet())
      setIsSignatureSet(messageDomain.isSignatureSet())
    })
  }, [])

  if (isSignatureSet) {
    return 'Registering account on chain...'
  }

  if (isEncryptionPublicKeySet) {
    return 'Signing...'
  }

  if (isRegistering) {
    return 'Create account...'
  }

  return (
    <div>
      <button
        className={classNames('border')}
        onClick={() => {
          messageDomain.registerPairX()
          setIsRegistering(true)
        }}
      >
        Create Account
      </button>
    </div>
  )
}
