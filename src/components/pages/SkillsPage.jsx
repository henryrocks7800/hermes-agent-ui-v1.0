import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Zap, Search, Terminal, FileText, Globe, Image, Mic } from 'lucide-react'

const availableSkills = [
  { id: 'autonomous-ai-agents', name: 'Autonomous AI Agents', description: 'Spawn and orchestrate AI coding agents', icon: Zap, category: 'Development' },
  { id: 'codebase-inspection', name: 'Codebase Inspection', description: 'Analyze codebases with pygount', icon: Search, category: 'Development' },
  { id: 'github-pr-workflow', name: 'GitHub PR Workflow', description: 'Full pull request lifecycle', icon: FileText, category: 'Development' },
  { id: 'terminal', name: 'Terminal', description: 'Execute shell commands', icon: Terminal, category: 'Tools' },
  { id: 'web-search', name: 'Web Search', description: 'Search the web for information', icon: Globe, category: 'Tools' },
  { id: 'vision-analyze', name: 'Vision Analysis', description: 'Analyze images with AI', icon: Image, category: 'Tools' },
  { id: 'text-to-speech', name: 'Text-to-Speech', description: 'Convert text to voice', icon: Mic, category: 'Tools' },
]

export default function SkillsPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [inspecting, setInspecting] = useState(null)

  const filteredSkills = availableSkills.filter(s => {
    if (activeFilter === 'All' || activeFilter === 'Installed') return true
    return s.category === activeFilter
  })

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Skills</h1>
        <p className="text-sm text-muted-foreground">Browse and manage skills for Hermes Agent.</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['All', 'Development', 'Tools', 'Installed'].map(filter => (
          <Badge
            key={filter}
            variant={activeFilter === filter ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1 text-sm transition-colors"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="grid grid-cols-2 gap-4 pb-6">
          {filteredSkills.map((skill) => {
            const Icon = skill.icon
            return (
              <div
                key={skill.id}
                className="p-5 rounded-lg border bg-card hover:bg-accent/50 transition-colors flex flex-col"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg truncate">{skill.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{skill.category}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{skill.description}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-auto"
                  onClick={() => setInspecting(skill)}
                >
                  Inspect
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <Dialog open={!!inspecting} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {inspecting && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <inspecting.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{inspecting.name}</DialogTitle>
                    <DialogDescription className="mt-1.5">{inspecting.category}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{inspecting.description}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">Usage Example</h4>
                  <div className="bg-muted rounded-md p-3 font-mono text-xs overflow-x-auto">
                    {`# Use the ${inspecting.name} skill\n> ${inspecting.name.toLowerCase().replace(/ /g, '-')}`}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
