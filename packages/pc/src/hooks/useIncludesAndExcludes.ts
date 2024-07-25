import { IIncludesAndExcludes } from 'groupfi_chatbox_shared'
import useContextField from './useContextField'

const useIncludesAndExcludes = () => {
  const includesAndExcludes = useContextField<IIncludesAndExcludes[]>(
    'includesAndExcludes'
  )

  return includesAndExcludes
}

export default useIncludesAndExcludes
