
'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, CartesianGrid, XAxis, Pie, PieChart as RechartsPieChart, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { File, Users, GitPullRequest, CheckCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Project } from '@/lib/types'

interface DashboardClientProps {
    stats: any;
    projects: Project[];
}

export default function DashboardClient({ stats, projects }: DashboardClientProps) {

    if (!stats) {
        return <div>Loading...</div>;
    }
    
    const { totalProjects, totalUsers, totalPRs, pipelineSuccessRatio, builds, deployments, pullRequests, accessLevelStats } = stats;

    const prStats = [
        { name: 'Approved', value: Number(pullRequests.approved || 0), fill: 'hsl(var(--chart-2))' },
        { name: 'Rejected', value: Number(pullRequests.rejected || 0), fill: 'hsl(var(--chart-3))' },
    ];
    
    const prChartConfig = {
        Approved: { label: 'Approved', color: 'hsl(var(--chart-2))' },
        Rejected: { label: 'Rejected', color: 'hsl(var(--chart-3))' },
    }

    const buildChartConfig = {
        passed: { label: "Passed", color: "hsl(var(--primary))" },
        failed: { label: "Failed", color: "hsl(var(--destructive))" },
    }

    const deploymentChartConfig = {
        successful: { label: "Successful", color: "hsl(var(--chart-2))" },
        failed: { label: "Failed", color: "hsl(var(--chart-3))" },
    }
    
    const totalDeployments = deployments.reduce((acc: number, month: { successful: number; failed: number }) => acc + month.successful + month.failed, 0);

    const accessLevelChartData = (accessLevelStats || []).map((level: any, index: number) => ({
        ...level,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    const accessLevelChartConfig = accessLevelChartData.reduce((acc: any, cur: any) => {
        if (cur.name !== 'Unknown') {
            acc[cur.name] = { label: cur.name, color: cur.fill };
        }
        return acc;
    }, {});

    const filteredAccessLevelData = accessLevelChartData.filter((d: any) => d.name !== 'Unknown');

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h1 className="text-2xl font-bold">Organization Dashboard</h1>
                <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <Select>
                    <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
            </div>
            
            <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <File className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProjects}</div>
                        <p className="text-xs text-muted-foreground">in your organization</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">across all projects</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Pull Requests</CardTitle>
                        <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPRs}</div>
                        <p className="text-xs text-muted-foreground">in the last 30 days</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pipeline Success</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(pipelineSuccessRatio * 100).toFixed(0)}%</div>
                        <p className="text-xs text-muted-foreground">average success rate</p>
                    </CardContent>
                    </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                    <CardHeader>
                        <CardTitle>Daily Builds Summary</CardTitle>
                        <CardDescription>A summary of builds over the last week.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {builds && builds.length > 0 ? (
                            <ChartContainer config={buildChartConfig} className="min-h-[200px] w-full">
                            <BarChart data={builds} accessibilityLayer>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend />
                                <Bar dataKey="passed" fill="var(--color-passed)" radius={4} />
                                <Bar dataKey="failed" fill="var(--color-failed)" radius={4} />
                            </BarChart>
                            </ChartContainer>
                        ) : (
                            <div className="text-muted-foreground text-center py-10">
                                No build data available.
                            </div>
                        )}
                    </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Deployments</CardTitle>
                            <CardDescription>Summary of classic release deployments.</CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[240px] flex items-center justify-center">
                            {totalDeployments > 0 ? (
                                <ChartContainer config={deploymentChartConfig} className="min-h-[200px] w-full">
                                    <BarChart data={deployments} accessibilityLayer>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                        <ChartTooltip content={<ChartTooltipContent />} />
                                        <ChartLegend />
                                        <Bar dataKey="successful" fill="var(--color-successful)" radius={4} />
                                        <Bar dataKey="failed" fill="var(--color-failed)" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                            ) : (
                                <div className="text-muted-foreground text-center">
                                    No classic deployment data available for the last 90 days.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                    <CardHeader>
                        <CardTitle>PR Approval vs Rejection</CardTitle>
                        <CardDescription>Pull request statistics for the last 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center min-h-[240px]">
                        {prStats.every(p => p.value === 0) ? (
                            <div className="text-muted-foreground text-center">
                                No pull request data available.
                            </div>
                        ) : (
                            <ChartContainer config={prChartConfig} className="min-h-[200px] w-full max-w-[300px]">
                            <RechartsPieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                <Pie data={prStats} dataKey="value" nameKey="name" innerRadius={50}>
                                {prStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                            </RechartsPieChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>User Access Levels</CardTitle>
                            <CardDescription>Distribution of user access levels.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <ChartContainer config={accessLevelChartConfig} className="min-h-[200px] w-full max-w-[300px]">
                            <RechartsPieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                <Pie data={filteredAccessLevelData} dataKey="value" nameKey="name" innerRadius={50}>
                                {filteredAccessLevelData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                            </RechartsPieChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
