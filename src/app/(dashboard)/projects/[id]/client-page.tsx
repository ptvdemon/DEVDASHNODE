
'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Calendar, Info, GitBranch, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Project, Build, PullRequest, User, Deployment, Repository } from '@/lib/types'
import { Pie, PieChart as RechartsPieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatUtcDate } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const StatusPieChart = ({ data, title }: { data: {name: string, value: number, fill: string}[], title: string }) => {
    const totalValue = React.useMemo(() => data.reduce((acc, entry) => acc + entry.value, 0), [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] w-full flex justify-center items-center">
                {totalValue > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                            <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                            <Legend />
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </RechartsPieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-muted-foreground text-center">
                        No data available.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const ReleaseStageFlow = () => (
    <Card>
        <CardHeader>
            <CardTitle>Release Stages Flow</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto pb-4">
                {['Dev', 'QA', 'UAT', 'PROD'].map((stage, index, arr) => (
                    <React.Fragment key={stage}>
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center font-bold text-lg">
                                {stage}
                            </div>
                            <Badge variant="outline" className="border-green-500 text-green-500">Success</Badge>
                        </div>
                        {index < arr.length - 1 && <div className="flex-1 h-1 bg-border" />}
                    </React.Fragment>
                ))}
            </div>
        </CardContent>
    </Card>
)

interface ProjectDetailClientProps {
    project: Project;
    builds: Build[];
    pullRequests: PullRequest[];
    projectUsers: User[];
    deployments: Deployment[];
    repositories: Repository[];
}

export default function ProjectDetailClient({ project, builds, pullRequests, projectUsers, deployments, repositories }: ProjectDetailClientProps) {
  const buildStatusData = [
    { name: 'Passed', value: builds.filter(b => b.result === 'succeeded').length, fill: 'hsl(var(--chart-2))' },
    { name: 'Failed', value: builds.filter(b => b.result === 'failed').length, fill: 'hsl(var(--chart-3))' },
    { name: 'Cancelled', value: builds.filter(b => b.result === 'canceled').length, fill: 'hsl(var(--chart-5))' },
  ]

  const prStatusData = [
    { name: 'Active', value: pullRequests.filter(p => p.status === 'active').length, fill: 'hsl(var(--chart-1))' },
    { name: 'Completed', value: pullRequests.filter(p => p.status === 'completed').length, fill: 'hsl(var(--chart-2))' },
    { name: 'Abandoned', value: pullRequests.filter(p => p.status === 'abandoned').length, fill: 'hsl(var(--chart-3))' },
  ]
  
  const deploymentStatusData = [
    { name: 'Succeeded', value: deployments.filter(d => d.deploymentStatus === 'succeeded').length, fill: 'hsl(var(--chart-2))' },
    { name: 'Failed', value: deployments.filter(d => d.deploymentStatus === 'failed' || d.deploymentStatus === 'partiallySucceeded').length, fill: 'hsl(var(--chart-3))' },
    { name: 'In Progress', value: deployments.filter(d => d.deploymentStatus === 'inProgress').length, fill: 'hsl(var(--chart-1))' },
  ]

  const getDeploymentBadgeVariant = (status: string) => {
    switch (status) {
      case 'succeeded': return 'default';
      case 'failed':
      case 'partiallySucceeded': return 'destructive';
      default: return 'secondary';
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{project.name}</CardTitle>
          <CardDescription>
            {project.description || 'No description available for this project.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Project ID: <code className="font-mono bg-muted px-1 py-0.5 rounded">{project.id}</code></span>
                </div>
                 <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Last Updated: {formatUtcDate(project.lastUpdateTime)}</span>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatusPieChart data={buildStatusData} title="Build Status (Last 7 Days)" />
        <StatusPieChart data={prStatusData} title="Pull Request Status (Last 30 Days)" />
        <StatusPieChart data={deploymentStatusData} title="Deployment Status (Last 30 Days)" />
      </div>

      <ReleaseStageFlow />

      <Card>
        <CardHeader>
          <CardTitle>Repositories ({repositories.length})</CardTitle>
          <CardDescription>Source code repositories in this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {repositories.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Repository Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Default Branch</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {repositories.map(repo => (
                        <TableRow key={repo.id}>
                            <TableCell className="font-medium">{repo.name}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <GitBranch className="h-4 w-4" />
                                    <span>{repo.defaultBranch?.replace('refs/heads/', '') || 'N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-right">{repo.size ? `${(repo.size / 1024).toFixed(2)} KB` : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/projects/${project.id}/repositories/${repo.id}`}>View</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
           ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No repositories found for this project.
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
          <CardDescription>Classic Release Deployments in this project from the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {deployments.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Release</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {deployments.slice(0, 5).map(dep => (
                        <TableRow key={dep.id}>
                            <TableCell className="font-medium">{dep.release.name}</TableCell>
                            <TableCell><Badge variant={getDeploymentBadgeVariant(dep.deploymentStatus)}>{dep.deploymentStatus}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell">{formatUtcDate(dep.queuedOn)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
           ) : (
                <div className="text-center py-10 text-muted-foreground">
                    No classic release deployment data available for the last 30 days.
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Pull Requests</CardTitle>
          <CardDescription>Pull Requests in the {project.name} project from the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Author</TableHead>
                        <TableHead>Repository</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Created Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pullRequests.slice(0, 5).map(pr => (
                        <TableRow key={pr.pullRequestId}>
                            <TableCell>{pr.createdBy.displayName}</TableCell>
                            <TableCell>{pr.repository.name}</TableCell>
                            <TableCell><Badge variant={pr.status === 'completed' ? 'default' : 'secondary'}>{pr.status}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell">{formatUtcDate(pr.creationDate)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Associated Users</CardTitle>
          <CardDescription>Users who are members of this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {projectUsers && projectUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectUsers.map(user => {
                    const projectEntitlement = user.projectEntitlements?.find(pe => pe.id === project.id);
                    const role = projectEntitlement?.role || 'Member';

                    return (
                        <TableRow key={user.descriptor}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        {user._links?.avatar?.href && <AvatarImage src={user._links.avatar.href} alt="Avatar" data-ai-hint="person avatar" />}
                                        <AvatarFallback>{user.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <Link href={`/users/${user.descriptor}`} className="font-medium hover:underline">{user.displayName || 'N/A'}</Link>
                                        <div className="text-sm text-muted-foreground">
                                            {user.principalName || 'No email'}
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{role}</TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              No users found for this project.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
