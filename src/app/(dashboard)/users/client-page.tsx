
'use client'

import { useState, useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download } from "lucide-react"
import Link from "next/link"
import type { User, Project } from "@/lib/types"
import { formatUtcDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"

interface UsersClientPageProps {
  users: User[];
  projects: Project[];
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) => {
    // Position the label within the slice
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Don't render labels for tiny slices to avoid clutter
    if (percent < 0.04) {
        return null;
    }

    return (
        <text
            x={x}
            y={y}
            fill="hsl(var(--card-foreground))"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-sm font-bold"
        >
            {value}
        </text>
    );
};


export default function UsersClientPage({ users, projects }: UsersClientPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState('all');
  const [selectedActivityStatus, setSelectedActivityStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const accessLevels = useMemo(() => {
    if (!users) return [];
    const levels = new Set(users.map(u => u.accessLevel).filter(Boolean) as string[]);
    return Array.from(levels).sort();
  }, [users]);
  
  const accessLevelStats = useMemo(() => {
    if (!users) return [];
    const counts = users.reduce((acc, user) => {
        const level = user.accessLevel;
        if (level) {
            acc[level] = (acc[level] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value], index) => ({
        name,
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`
    }));
  }, [users]);

  const accessLevelChartConfig = useMemo(() => {
      return accessLevelStats.reduce((acc, cur) => {
          acc[cur.name] = { label: cur.name, color: cur.fill };
          return acc;
      }, {} as any)
  }, [accessLevelStats]);

  const userActivityStats = useMemo(() => {
    if (!users) return [];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const counts = users.reduce((acc, user) => {
        const lastLogin = user.lastAccessedDate ? new Date(user.lastAccessedDate) : null;
        if (lastLogin && lastLogin >= threeMonthsAgo) {
            acc.active++;
        } else {
            acc.inactive++;
        }
        return acc;
    }, { active: 0, inactive: 0 });

    return [
        { name: 'Active (Last 3m)', value: counts.active, fill: 'hsl(var(--chart-2))', status: 'active' },
        { name: 'Inactive (> 3m)', value: counts.inactive, fill: 'hsl(var(--chart-5))', status: 'inactive' },
    ];
  }, [users]);

  const userActivityChartConfig = useMemo(() => {
      return userActivityStats.reduce((acc, cur) => {
          acc[cur.name] = { label: cur.name, color: cur.fill };
          return acc;
      }, {} as any)
  }, [userActivityStats]);

  const filteredUsers = useMemo(() => {
    let result = users || [];

    // Filter by project
    if (selectedProjectId !== 'all') {
      result = result.filter(user => {
        return user?.projectEntitlements?.some(p => p?.projectRef?.id === selectedProjectId) ?? false;
      });
    }

    // Filter by access level
    if (selectedAccessLevel !== 'all') {
      result = result.filter(user => user.accessLevel === selectedAccessLevel);
    }

    // Filter by activity status
    if (selectedActivityStatus !== 'all') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      result = result.filter(user => {
          const lastLogin = user.lastAccessedDate ? new Date(user.lastAccessedDate) : null;
          const isActive = !!lastLogin && lastLogin >= threeMonthsAgo;
          return selectedActivityStatus === 'active' ? isActive : !isActive;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      result = result.filter(user => {
        const name = user?.displayName?.toLowerCase() || '';
        const email = user?.principalName?.toLowerCase() || '';
        return name.includes(lowerCaseSearchTerm) || email.includes(lowerCaseSearchTerm);
      });
    }

    return result;
  }, [users, searchTerm, selectedProjectId, selectedAccessLevel, selectedActivityStatus]);
  
  const handleDownloadCsv = () => {
    if (filteredUsers.length === 0) return;

    const escapeCsvCell = (cell: string | undefined | null) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Full Name', 'Email', 'Access Level', 'Last Login (UTC)', 'Account Created (UTC)'];
    
    const rows = filteredUsers.map(user => [
        escapeCsvCell(user.displayName),
        escapeCsvCell(user.principalName),
        escapeCsvCell(user.accessLevel),
        escapeCsvCell(formatUtcDate(user.lastAccessedDate)),
        escapeCsvCell(formatUtcDate(user.dateCreated))
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rgi_devops_users.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>User Access Levels</CardTitle>
                    <CardDescription>Distribution of user access levels. Click a slice to filter.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <ChartContainer config={accessLevelChartConfig} className="min-h-[350px] w-full max-w-[450px]">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                            <Pie 
                                data={accessLevelStats} 
                                dataKey="value" 
                                nameKey="name" 
                                innerRadius={0}
                                labelLine={false}
                                label={renderCustomizedLabel}
                                onClick={(data) => setSelectedAccessLevel(data.name)}
                                cursor="pointer"
                            >
                                {accessLevelStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                    <CardDescription>Users logged in within the last 3 months. Click a slice to filter.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <ChartContainer config={userActivityChartConfig} className="min-h-[350px] w-full max-w-[450px]">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                            <Pie 
                                data={userActivityStats} 
                                dataKey="value" 
                                nameKey="name" 
                                innerRadius={0}
                                labelLine={false}
                                label={renderCustomizedLabel}
                                onClick={(data) => setSelectedActivityStatus(data.payload.status)}
                                cursor="pointer"
                            >
                                {userActivityStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
            <div>
                <CardTitle>Users ({filteredUsers.length})</CardTitle>
                <CardDescription>
                A list of all users in the organization.
                </CardDescription>
            </div>
            <Button variant="outline" onClick={handleDownloadCsv} disabled={filteredUsers.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
            </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search users by name or email..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={selectedAccessLevel} onValueChange={setSelectedAccessLevel}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Access Levels" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Access Levels</SelectItem>
                        {accessLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={selectedActivityStatus} onValueChange={(value) => setSelectedActivityStatus(value as any)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="All Activity" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Activity</SelectItem>
                        <SelectItem value="active">Active (Last 3m)</SelectItem>
                        <SelectItem value="inactive">Inactive (&gt; 3m)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead className="hidden md:table-cell">
                    Last Login
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                    Account Created
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
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
                    <TableCell>
                        <Badge variant="outline">{user.accessLevel || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {formatUtcDate(user.lastAccessedDate)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                        {formatUtcDate(user.dateCreated)}
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                    No users found for the current filter.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
    </div>
  )
}
