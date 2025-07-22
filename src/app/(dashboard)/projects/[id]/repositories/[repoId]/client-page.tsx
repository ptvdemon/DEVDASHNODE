
'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, GitBranch, GitCommit, ShieldCheck, ShieldOff, HardDrive } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Repository, Branch, Policy, Project } from '@/lib/types'

interface RepositoryDetailClientProps {
    project: Project;
    repository: Repository;
    branches: Branch[];
    policies: Policy[];
}

export default function RepositoryDetailClient({ project, repository, branches, policies }: RepositoryDetailClientProps) {

  const defaultBranchName = repository.defaultBranch?.replace('refs/heads/', '') || '';

  const defaultBranchPolicies = policies.filter(p => {
    // A policy is relevant if it's enabled and not deleted.
    if (!p.isEnabled || p.isDeleted) {
        return false;
    }
    
    // Check if any scope within the policy applies to the current repository and its default branch.
    return p.settings.scope?.some(s => {
        // Condition 1: The policy must apply to this repository.
        // This is true if the scope's repositoryId matches ours, OR if the repositoryId is null/undefined (applies to all repos).
        const repoMatches = !s.repositoryId || s.repositoryId === repository.id;

        if (!repoMatches) {
            return false;
        }

        // Condition 2: The policy must apply to the default branch.
        if (s.matchKind === 'exact') {
            return s.refName === repository.defaultBranch;
        }
        if (s.matchKind === 'prefix' && repository.defaultBranch) {
            // e.g., s.refName = 'refs/heads/' and defaultBranch = 'refs/heads/main'
            return repository.defaultBranch.startsWith(s.refName);
        }

        // Fallback for cases where matchKind isn't specified or is different.
        return s.refName === repository.defaultBranch;
    });
  });

  const getPolicyStatusIcon = (policy: Policy) => {
    if (policy.isBlocking && policy.isEnabled) {
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    }
    if (policy.isEnabled) {
      return <ShieldCheck className="h-5 w-5 text-yellow-500" />;
    }
    return <ShieldOff className="h-5 w-5 text-muted-foreground" />;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href={`/projects/${project.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {project.name}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{repository.name}</CardTitle>
          <CardDescription>
            Repository details and settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    <span>Default Branch: <code className="font-mono bg-muted px-1 py-0.5 rounded">{defaultBranchName}</code></span>
                </div>
                 <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span>Size: {repository.size ? `${(repository.size / 1024).toFixed(2)} KB` : 'N/A'}</span>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Branches ({branches.length})</CardTitle>
            <CardDescription>All branches in this repository.</CardDescription>
          </CardHeader>
          <CardContent>
            {branches.length > 0 ? (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Branch Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Last Commit</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {branches.slice(0, 10).map(branch => (
                          <TableRow key={branch.name}>
                              <TableCell className="font-medium">
                                  {branch.name}
                                  {repository.defaultBranch?.endsWith(branch.name) && <Badge variant="secondary" className="ml-2">Default</Badge>}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-xs">
                                  <div className="flex items-center gap-2">
                                    <GitCommit className="h-4 w-4"/>
                                    <span>{branch.objectId.substring(0, 7)}</span>
                                  </div>
                              </TableCell>
                          </TableRow>
                      ))}
                      {branches.length > 10 && (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                                And {branches.length - 10} more...
                            </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
             ) : (
                  <div className="text-center py-10 text-muted-foreground">
                      No branches found for this repository.
                  </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Branch Policies</CardTitle>
            <CardDescription>Policies applied to the <span className="font-semibold">{defaultBranchName}</span> branch.</CardDescription>
          </CardHeader>
          <CardContent>
            {defaultBranchPolicies.length > 0 ? (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Policy Type</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {defaultBranchPolicies.map(policy => (
                          <TableRow key={policy.id}>
                              <TableCell className="font-medium">{policy.type.displayName}</TableCell>
                              <TableCell className="flex justify-center items-center">
                                  {getPolicyStatusIcon(policy)}
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
             ) : (
                  <div className="text-center py-10 text-muted-foreground">
                      No policies configured for the default branch.
                  </div>
              )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
