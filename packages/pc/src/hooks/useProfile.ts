import { Profile } from 'groupfi_chatbox_shared'
import useContextField from './useContextField'

const useProfile = () => {
  const profile = useContextField<Profile>('profile')
  return profile
}

export default useProfile

