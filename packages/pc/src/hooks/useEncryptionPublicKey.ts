import useContextField from './useContextField'

const useEncryptionPublicKey = () => {
  const encryptionPublicKey = useContextField<string>('encryptionPublicKey')

  return encryptionPublicKey
}

export default useEncryptionPublicKey
