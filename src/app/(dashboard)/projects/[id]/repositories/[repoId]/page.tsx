
import * as React from 'react'
import { notFound } from 'next/navigation'
import { CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { getRepository, getBranches, getBranchPolicies, getProject } from '@/lib/azure-devops'
import { PatPrompt } from '@/components/pat-prompt'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Repository, Branch, Policy, Project } from '@/lib/types'
import RepositoryDetailClient from './client-page'

export default async function RepositoryDetailPage({ params }: { params: { id: string, repoId: string } }) {
  let project: Project | null = null;
  let repository: Repository | null = null;
  let branches: Branch[] = [];
  let policies: Policy[] = [];
  let error: string | null = null;

  try {
    // Fetch all data in parallel
    const [proj, repo, br, pol] = await Promise.all([
        getProject(params.id),
        getRepository(params.id, params.repoId),
        getBranches(params.id, params.repoId),
        getBranchPolicies(params.id),
    ]);
    project = proj;
    repository = repo;
    branches = br;
    policies = pol;

  } catch (e: any) {
    if (e.name === 'PatError') {
      return <PatPrompt error={e.message} />;
    }
     if (e.message.includes('404')) {
        notFound();
    }
    error = e.message;
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <CardTitle>Error Fetching Repository Data</CardTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!repository || !project) {
    notFound()
  }

  return (
    <RepositoryDetailClient 
      project={project}
      repository={repository} 
      branches={branches} 
      policies={policies}
    />
  )
}
