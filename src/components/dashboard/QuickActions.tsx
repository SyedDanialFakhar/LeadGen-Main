// src/components/dashboard/QuickActions.tsx
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Mail, Plus } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    {
      label: 'Run Seek Scrape',
      icon: <Search className="w-4 h-4" />,
      onClick: () => navigate('/scraper'),
      variant: 'primary' as const,
    },
    {
      label: 'Run LinkedIn Scrape',
      icon: <Search className="w-4 h-4" />,
      onClick: () => navigate('/scraper'),
      variant: 'secondary' as const,
    },
    {
      label: 'Enrich Contacts',
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => navigate('/enrichment'),
      variant: 'secondary' as const,
    },
    {
      label: 'Send Follow-ups',
      icon: <Mail className="w-4 h-4" />,
      onClick: () => navigate('/emails'),
      variant: 'secondary' as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Quick Actions
        </h3>
      </CardHeader>
      <CardBody className="flex flex-col gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            leftIcon={action.icon}
            onClick={action.onClick}
            className="w-full justify-start"
          >
            {action.label}
          </Button>
        ))}
      </CardBody>
    </Card>
  )
}