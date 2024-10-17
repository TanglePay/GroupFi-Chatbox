import { IIncludesAndExcludes } from 'groupfi-sdk-chat'
import useContextField from './useContextField'

const useIncludesAndExcludes = () => {
  const includesAndExcludes = useContextField<IIncludesAndExcludes[]>(
    'includesAndExcludes'
  )

  return includesAndExcludes
}

export default useIncludesAndExcludes
