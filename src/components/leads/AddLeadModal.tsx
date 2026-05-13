// src/components/leads/AddLeadModal.tsx
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useLeads } from '@/hooks/useLeads'
import { CITIES, PLATFORMS, JOB_ROLES } from '@/utils/constants'
import type { NewLead } from '@/types'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_LEAD: Partial<NewLead> = {
  platform: 'seek',
  city: 'Melbourne',
  status: 'Not Sent',
  enrichmentStatus: 'pending',
}

export function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const { createLeads } = useLeads()
  const [newLead, setNewLead] = useState<Partial<NewLead>>(DEFAULT_LEAD)

  const update = (patch: Partial<NewLead>) => setNewLead(prev => ({ ...prev, ...patch }))

  const isValid = !!(newLead.companyName && newLead.jobTitle && newLead.jobAdUrl && newLead.datePosted)

  const handleAdd = () => {
    if (!isValid) return
    createLeads([newLead as NewLead])
    onClose()
    setNewLead(DEFAULT_LEAD)
  }

  const handleClose = () => {
    onClose()
    setNewLead(DEFAULT_LEAD)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Lead Manually"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!isValid}>Add Lead</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Platform"
            value={newLead.platform ?? 'seek'}
            onChange={e => update({ platform: e.target.value as NewLead['platform'] })}
            options={PLATFORMS.map(p => ({ value: p, label: p === 'seek' ? 'Seek' : 'LinkedIn' }))}
          />
          <Select
            label="City"
            value={newLead.city ?? 'Melbourne'}
            onChange={e => update({ city: e.target.value as NewLead['city'] })}
            options={CITIES.map(c => ({ value: c, label: c }))}
          />
        </div>

        <Input
          label="Company Name *"
          value={newLead.companyName ?? ''}
          onChange={e => update({ companyName: e.target.value })}
          placeholder="Blue Star Logistics"
        />

        <Select
          label="Job Title *"
          value={newLead.jobTitle ?? ''}
          onChange={e => update({ jobTitle: e.target.value })}
          options={JOB_ROLES.map(r => ({ value: r, label: r }))}
        />

        <Input
          label="Job Ad URL *"
          value={newLead.jobAdUrl ?? ''}
          onChange={e => update({ jobAdUrl: e.target.value })}
          placeholder="https://www.seek.com.au/job/..."
        />

        <Input
          label="Date Posted *"
          type="date"
          value={newLead.datePosted ?? ''}
          onChange={e => update({ datePosted: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Contact Name"
            value={newLead.contactName ?? ''}
            onChange={e => update({ contactName: e.target.value })}
            placeholder="Moss Cassidy"
          />
          <Input
            label="Contact Role"
            value={newLead.contactJobTitle ?? ''}
            onChange={e => update({ contactJobTitle: e.target.value })}
            placeholder="General Manager"
          />
        </div>

        <Select
          label="Company Size"
          value={newLead.companyEmployeeCount ?? ''}
          onChange={e => update({ companyEmployeeCount: e.target.value })}
          options={[
            { value: '', label: 'Unknown' },
            { value: '1-10', label: '1-10 employees' },
            { value: '11-50', label: '11-50 employees' },
            { value: '51-200', label: '51-200 employees' },
            { value: '201-500', label: '201-500 employees' },
          ]}
        />
      </div>
    </Modal>
  )
}