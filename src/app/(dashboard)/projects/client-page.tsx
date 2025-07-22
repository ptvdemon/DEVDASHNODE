'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { ArrowRight, Calendar, Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import type { Project } from "@/lib/types"
import { formatUtcDate } from '@/lib/utils'

interface ProjectsClientPageProps {
    projects: Project[];
}

export default function ProjectsClientPage({ projects }: ProjectsClientPageProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        if (!searchTerm) return projects;
        return projects.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [projects, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <h1 className="text-2xl font-bold self-start sm:self-center">Projects ({filteredProjects.length})</h1>
                <div className="relative w-full sm:w-auto sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search projects..." 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                    <Card key={project.id}>
                        <CardHeader>
                            <CardTitle>{project.name}</CardTitle>
                            <CardDescription>{project.description || 'No description available.'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>Last updated on {formatUtcDate(project.lastUpdateTime)}</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/projects/${project.id}`}>View Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {filteredProjects.length === 0 && searchTerm && (
                <div className="text-center py-10 text-muted-foreground col-span-full">
                    No projects found for "{searchTerm}".
                </div>
            )}
        </div>
    )
}
