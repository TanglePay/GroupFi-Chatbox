import { useState, useEffect } from 'react'
import { useMessageDomain } from 'groupfi-sdk-chat'

const useContextField = <T>(fieldName: string): T | undefined => {
  const { messageDomain } = useMessageDomain()

  const [value, setValue] = useState<T | undefined>(messageDomain.getFieldValue<T>(fieldName))

  useEffect(() => {
    // const initialValue = messageDomain.getFieldValue<T>(fieldName)
    // setValue(initialValue)

    const handleConfigChange = () => {
      const updatedValue = messageDomain.getFieldValue<T>(fieldName)
      setValue(updatedValue)
    }

    messageDomain.onFieldChanged(fieldName, handleConfigChange)

    return () => {
      messageDomain.onFieldChanged(fieldName, handleConfigChange)
    }
  }, [])

  return value
}

export default useContextField
