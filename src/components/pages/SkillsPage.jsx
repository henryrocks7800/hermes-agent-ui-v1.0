import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Skills</h1>
        <p className="text-muted-foreground">Browse and manage skills for Hermes Agent.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <Badge variant="outline" className="cursor-pointer">All</Badge>
        <Badge variant="outline" className="cursor-pointer">Development</Badge>
        <Badge variant="outline" className="cursor-pointer">Tools</Badge>
        <Badge variant="outline" className="cursor-pointer">Installed</Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-4">
          {availableSkills.map((skill) => {
            const Icon = skill.icon
            return (
              <div
                key={skill.id}
                className="p-4 rounded-lg border border-border hover:border-muted-foreground transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{skill.name}</div>
                    <div className="text-xs text-muted-foreground">{skill.category}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{skill.description}</p>
                <Button variant="outline" size="sm" className="w-full">
                  Inspect
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
