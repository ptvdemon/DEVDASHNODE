'use server'

import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, GitCommit, Mail, UserCheck, Calendar, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getUser, getUserEntitlement, getPullRequestsForUser } from '@/lib/azure-devops'
import { PatPrompt } from '@/components/pat-prompt'
import { User, PullRequest, Project } from '@/lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatUtcDate } from '@/lib/utils'

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  let user: User | null = null;
  let recentPRs: PullRequest[] = [];
  let associatedProjects: { id: string; name: string }[] = [];
  let error: string | null = null;
  
  try {
    user = await getUser(params.id)
    if (user && user.id) {
        const entitlement = await getUserEntitlement(user.id);
        if (entitlement && entitlement.projectEntitlements) {
            associatedProjects = entitlement.projectEntitlements.map((pe: any) => ({
                id: pe.projectRef.id,
                name: pe.projectRef.name
            }));
        }
        
        if (associatedProjects.length > 0) {
            recentPRs = await getPullRequestsForUser(user.id, associatedProjects, 90);
        }
    }
  } catch (e: any) {
    if (e.name === 'PatError') {
      return <PatPrompt error={e.message} />;
    }
    if (e.message.includes('404') && !user) {
        notFound();
    }
    error = e.message;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <CardTitle>Error Fetching User Data</CardTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
          <Link href="/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 self-start">
          <CardHeader className="items-center text-center p-4 md:p-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={user._links.avatar.href} data-ai-hint="person avatar" />
              <AvatarFallback className="text-3xl">{user.displayName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{user.displayName}</CardTitle>
            <CardDescription>{user.accessLevel || 'Role info not available'}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground p-4 md:p-6 pt-0">
            <Separator className="my-4" />
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{user.principalName}</span>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Joined on {formatUtcDate(user.dateCreated)}</span>
                </div>
                <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span>Last seen {formatUtcDate(user.lastAccessedDate)}</span>
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Associated Projects</CardTitle>
                </CardHeader>
                <CardContent>
                   {associatedProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {associatedProjects.map(p => (
                                <Badge key={p.id} variant="secondary">{p.name}</Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            This user is not associated with any projects.
                        </p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity (Last 90 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentPRs.length > 0 ? (
                    <ul className="space-y-4">
                      {recentPRs.slice(0, 5).map(pr => (
                        <li key={pr.pullRequestId} className="text-sm flex items-start gap-3">
                          <GitCommit className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div>
                            {pr._links?.self?.href ? (
                              <a href={pr._links.self.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                PR #{pr.pullRequestId}: {pr.title}
                              </a>
                            ) : (
                              <span className="font-medium">
                                PR #{pr.pullRequestId}: {pr.title}
                              </span>
                            )}
                            <p className="text-muted-foreground">
                              In repository <span className="font-semibold">{pr.repository.name}</span> on {formatUtcDate(pr.creationDate)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recent pull request activity found for this user.
                    </p>
                  )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
