'use client'

import * as React from 'react'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getProject, getBuildsForProject, getPullRequestsForProject, PatError } from '@/lib/azure-devops'
import { PatPrompt } from '@/components/pat-prompt'
import type { Project, Build, PullRequest } from '@/lib/types'

import { Pie, PieChart as RechartsPieChart, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'

const StatusPieChart = ({ data, title }: { data: {name: string, value: number, fill: string}[], title: string }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] w-full">
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
        </CardContent>
    </Card>
)

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

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  let project: Project | null = null;
  let builds: Build[] = [];
  let pullRequests: PullRequest[] = [];
  let error: string | null = null;

  try {
    project = await getProject(params.id)
    if (project) {
        builds = await getBuildsForProject(project.id);
        pullRequests = await getPullRequestsForProject(project.id);
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

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-muted-foreground">{project.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatusPieChart data={buildStatusData} title="Build Status (Last 7 Days)" />
        <StatusPieChart data={prStatusData} title="Pull Request Status (Last 30 Days)" />
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Recent Builds</CardTitle>
                <CardDescription>Total builds in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-4xl font-bold">{builds.length}</div>
            </CardContent>
        </Card>
      </div>

      <ReleaseStageFlow />

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
                            <TableCell className="hidden md:table-cell">{new Date(pr.creationDate).toLocaleDateString('en-CA', { timeZone: 'UTC' })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}
