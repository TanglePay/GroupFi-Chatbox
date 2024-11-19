import { useState } from 'react'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function CreateEvent({ contract }) {
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [maxSupply, setMaxSupply] = useState('')
  const [eventDetails, setEventDetails] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const tx = await contract.createEvent(
        name,
        symbol,
        eventDetails
      )
      await tx.wait()
      alert('Event created successfully!')
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="symbol">Symbol</Label>
        <Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="maxSupply">Max Supply</Label>
        <Input id="maxSupply" type="number" value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="eventDetails">Event Details</Label>
        <Textarea id="eventDetails" value={eventDetails} onChange={(e) => setEventDetails(e.target.value)} required />
      </div>
      <Button type="submit">Create Event</Button>
    </form>
  )
}