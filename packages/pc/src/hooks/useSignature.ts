import useContextField from './useContextField'

const useSignature = () => {
  const signature = useContextField<string>('signature')

  return signature
}

export default useSignature
