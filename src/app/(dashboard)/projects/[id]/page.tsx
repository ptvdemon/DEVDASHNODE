
import * as React from 'react'
import { notFound } from 'next/navigation'
import { CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { getProject, getBuildsForProject, getPullRequestsForProject, getUsersForProject, getDeploymentsForProject, getRepositoriesForProject } from '@/lib/azure-devops'
import { PatPrompt } from '@/components/pat-prompt'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Project, Build, PullRequest, User, Deployment, Repository } from '@/lib/types'
import ProjectDetailClient from './client-page'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  let project: Project | null = null;
  let builds: Build[] = [];
  let pullRequests: PullRequest[] = [];
  let projectUsers: User[] = [];
  let deployments: Deployment[] = [];
  let repositories: Repository[] = [];
  let error: string | null = null;

  try {
    // Fetch project details first to get the name
    const proj = await getProject(params.id);
    project = proj;

    if (project) {
        // Once we have the project, fetch its associated data in parallel
        const [users, projBuilds, projPullRequests, projDeployments, projRepositories] = await Promise.all([
            getUsersForProject(project.id, project.name),
            getBuildsForProject(project.id),
            getPullRequestsForProject(project.id),
            getDeploymentsForProject(project.id, 30), // Get last 30 days of deployments
            getRepositoriesForProject(project.id),
        ]);
        projectUsers = users;
        builds = projBuilds;
        pullRequests = projPullRequests;
        deployments = projDeployments;
        repositories = projRepositories;
    }
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
        <CardTitle>Error Fetching Project Data</CardTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    notFound()
  }

  return (
    <ProjectDetailClient 
      project={project} 
      builds={builds} 
      pullRequests={pullRequests} 
      projectUsers={projectUsers}
      deployments={deployments}
      repositories={repositories}
    />
  )
}
