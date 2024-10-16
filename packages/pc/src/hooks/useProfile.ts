import { Profile } from 'groupfi-sdk-shared'
import useContextField from './useContextField'

const useProfile = () => {
  const profile = useContextField<Profile>('profile')
  return profile
}

export default useProfile

