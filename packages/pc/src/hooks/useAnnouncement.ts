import { IIncludesAndExcludes } from 'groupfi-sdk-shared'
import useContextField from './useContextField'

const useAnnouncement = () => {
  const announcement = useContextField<IIncludesAndExcludes[]>('announcement')

  return announcement
}

export default useAnnouncement
