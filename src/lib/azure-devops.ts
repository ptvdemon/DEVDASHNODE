
'use server'

import { cookies } from 'next/headers'
import { Buffer } from 'buffer'
import type { Build, Project, PullRequest, User, Deployment, Repository, Branch, Policy } from './types'
import { formatUtcDate } from './utils'

// Custom error for PAT-related issues
class PatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatError';
  }
}

// Gets the auth headers, trying the temporary PAT from cookie first, then environment variable
function getAuthHeaders(tempPat?: string | null): { 'Authorization': string } {
  const pat = tempPat || process.env.AZURE_DEVOPS_PAT;

  if (!pat) {
    throw new PatError('Azure DevOps PAT not found. Please set AZURE_DEVOPS_PAT in your .env.local file and restart the server.');
  }

  return {
    'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`
  };
}

async function fetchWithRetry(url: string, options: any, retries = 5, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            // Stop retrying if the request was successful, if it's an auth error, or if the resource was not found.
            // The calling function is responsible for handling 401/404 errors.
            if (response.ok || response.status === 401 || response.status === 404) {
                return response;
            }
            console.warn(`Attempt ${i + 1} failed for ${url} with status ${response.status}. Retrying in ${delay}ms...`);
        } catch (error: any) {
             if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
                // This handles Node.js specific network errors like ENOTFOUND
                const errorCode = (error.cause as { code: string }).code;
                throw new Error(`A network error occurred: ${errorCode}. This may be due to an incorrect hostname, a firewall, or a DNS issue. Please check your AZURE_DEVOPS_ORG environment variable and network connectivity. URL: ${url}`);
            }
            console.warn(`Attempt ${i + 1} failed for ${url} with error: ${error.message}. Retrying in ${delay}ms...`);
        }
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
    }
    throw new Error(`Failed to fetch from ${url} after ${retries} attempts.`);
}


// Base fetch function for standard Azure DevOps REST API
async function fetchFromAzure(endpoint: string, tempPat?: string | null) {
  const org = process.env.AZURE_DEVOPS_ORG;
  if (!org) {
    throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
  }

  const url = `https://dev.azure.com/${org}/${endpoint}`;
  const headers = getAuthHeaders(tempPat);
  
  const response = await fetchWithRetry(url, { headers: { ...headers } });

  if (response.status === 401) {
    cookies().delete('temp_pat');
    throw new PatError('Your Azure DevOps PAT is invalid or has expired.');
  }

  if (response.status === 404) {
      // Don't log the full HTML response for a 404, the thrown error is more descriptive.
      throw new Error(`Could not find the requested resource (404). This may be caused by an incorrect organization name in your .env.local file. Current organization: '${org}'`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Azure DevOps API Error: ${errorText}`);
    throw new Error(`Failed to fetch from Azure DevOps: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Base fetch function for Azure DevOps Graph API (for users)
async function fetchFromGraph(endpoint: string, tempPat?: string | null) {
  const org = process.env.AZURE_DEVOPS_ORG;
  if (!org) {
    throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
  }

  const url = `https://vssps.dev.azure.com/${org}/${endpoint}`;
  const headers = getAuthHeaders(tempPat);
  
  const response = await fetchWithRetry(url, { headers: { ...headers } });

  if (response.status === 401) {
    cookies().delete('temp_pat');
    throw new PatError('Your Azure DevOps PAT is invalid or has expired.');
  }
  
  if (!response.ok) {
      const errorText = await response.text();
      if (response.status !== 404) {
          console.error(`Azure DevOps Graph API Error: ${errorText}`);
      }
    throw new Error(`Failed to fetch from Azure DevOps Graph API: ${response.status} ${response.statusText}`);
  }
  return response; // Return the full response object to access headers
}

async function fetchFromVSAEX(endpoint: string, tempPat?: string | null) {
  const org = process.env.AZURE_DEVOPS_ORG;
  if (!org) {
    throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
  }

  const url = `https://vsaex.dev.azure.com/${org}/${endpoint}`;
  const headers = getAuthHeaders(tempPat);
  
  const response = await fetchWithRetry(url, { headers: { ...headers } });

  if (response.status === 401) {
    cookies().delete('temp_pat');
    throw new PatError('Your Azure DevOps PAT is invalid or has expired.');
  }
  
  if (!response.ok) {
    // A 404 from this API is often expected (e.g., user entitlement not found), so we don't log it as a big error.
    if (response.status !== 404) {
        const errorText = await response.text();
        console.error(`Azure DevOps VSAEX API Error: ${errorText}`);
    }
    throw new Error(`Failed to fetch from Azure DevOps VSAEX API: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchFromAnalytics(odataQuery: string, tempPat?: string | null) {
    const org = process.env.AZURE_DEVOPS_ORG;
    if (!org) {
        throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
    }

    const url = `https://analytics.dev.azure.com/${org}/_odata/v3.0-preview/${odataQuery}`;
    const headers = getAuthHeaders(tempPat);

    try {
        const response = await fetchWithRetry(url, { headers: { ...headers } });

        if (response.status === 401) {
            cookies().delete('temp_pat');
            throw new PatError('Your Azure DevOps PAT is invalid or has expired.');
        }

        if (!response.ok) {
            const errorText = await response.text();
            // Don't throw, just warn and return null.
            console.warn(`Azure DevOps Analytics API Warning: ${errorText}`);
            return null;
        }

        return response.json();

    } catch (e: any) {
        if (e.name === 'PatError') throw e;
        console.warn("Could not fetch from Analytics API. This is expected if the service is not enabled for your organization.", e.message);
        return null;
    }
}

// API Functions
export async function getProjects(tempPat?: string | null): Promise<Project[]> {
  const allProjects: Project[] = [];
  let continuationToken: string | null = null;
  const org = process.env.AZURE_DEVOPS_ORG;
  
  if (!org) {
    throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
  }

  do {
    let endpoint = `_apis/projects?$top=100&api-version=7.1-preview.4`;
    if (continuationToken) {
      endpoint += `&continuationToken=${continuationToken}`;
    }
    const url = `https://dev.azure.com/${org}/${endpoint}`;
    
    const response = await fetchWithRetry(url, { headers: getAuthHeaders(tempPat) });

    if (response.status === 401) {
      cookies().delete('temp_pat');
      throw new PatError('Your Azure DevOps PAT is invalid or has expired.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Azure DevOps API Error getting projects: ${errorText}`);
      throw new Error(`Failed to fetch projects from Azure DevOps: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    allProjects.push(...data.value);

    continuationToken = response.headers.get('x-ms-continuationtoken');

  } while (continuationToken);
  
  return allProjects;
}


export async function getProject(idOrName: string, tempPat?: string | null): Promise<Project> {
  const data = await fetchFromAzure(`_apis/projects/${idOrName}?api-version=7.1-preview.4`, tempPat);
  return data;
}

async function getGraphUsers(tempPat?: string | null): Promise<any[]> {
    const allUsers: any[] = [];
    let continuationToken: string | null = null;
    
    do {
      let endpoint = `_apis/graph/users?api-version=7.1-preview.1`;
      if (continuationToken) {
        endpoint += `&continuationToken=${encodeURIComponent(continuationToken)}`;
      }
      
      const response = await fetchFromGraph(endpoint, tempPat);
      const data = await response.json();

      allUsers.push(...data.value);
      continuationToken = response.headers.get('x-ms-continuationtoken');
    } while (continuationToken);

    return allUsers.filter((u: any) => u.principalName && u.principalName.includes('@'));
}

export async function getUserEntitlements(tempPat?: string | null) {
  const allEntitlements: any[] = [];
  let continuationToken: string | null = null;

  do {
    let endpoint = `_apis/userentitlements?api-version=7.1-preview.3&$top=1000`;
    if (continuationToken) {
      endpoint += `&continuationToken=${encodeURIComponent(continuationToken)}`;
    }
    const data = await fetchFromVSAEX(endpoint, tempPat);
    allEntitlements.push(...data.members);
    continuationToken = data.continuationToken;
  } while (continuationToken);

  return allEntitlements;
}

export async function getUsers(tempPat?: string | null): Promise<User[]> {
  const [graphUsers, entitlements] = await Promise.all([
    getGraphUsers(tempPat),
    getUserEntitlements(tempPat)
  ]);

  const entitlementsMap = new Map<string, any>();
  for (const e of entitlements) {
    if (e.user && e.user.principalName) {
      entitlementsMap.set(e.user.principalName.toLowerCase(), e);
    }
  }

  const mergedUsers: User[] = graphUsers.map(graphUser => {
    const entitlement = entitlementsMap.get(graphUser.principalName.toLowerCase());
    return {
      ...graphUser,
      id: entitlement?.id,
      accessLevel: entitlement?.accessLevel?.licenseDisplayName,
      dateCreated: entitlement?.dateCreated,
      lastAccessedDate: entitlement?.lastAccessedDate,
      projectEntitlements: entitlement?.projectEntitlements || []
    };
  });

  return mergedUsers.filter(u => u.principalName && u.accessLevel && u.accessLevel !== 'N/A');
}

export async function getUser(descriptor: string, tempPat?: string | null): Promise<User | null> {
    const users = await getUsers(tempPat);
    const user = users.find(u => u.descriptor === descriptor);
    return user || null;
}

export async function getUserEntitlement(userId: string, tempPat?: string | null): Promise<any> {
    try {
        const data = await fetchFromVSAEX(`_apis/userentitlements/${userId}?api-version=7.1-preview.3`, tempPat);
        return data;
    } catch (e: any) {
        if (e.message.includes('404')) {
            console.warn(`User entitlement not found for user ID: ${userId}. This is expected for some user types.`);
            return null;
        }
        throw e;
    }
}

async function getProjectScopeDescriptor(projectId: string, tempPat?: string | null): Promise<string> {
    const response = await fetchFromGraph(`_apis/graph/descriptors/${projectId}?api-version=7.1-preview.1`, tempPat);
    const data = await response.json();
    if (!data.value) {
        throw new Error(`Could not get scope descriptor for project ${projectId}`);
    }
    return data.value;
}

async function getGroupsInScope(scopeDescriptor: string, tempPat?: string | null): Promise<any[]> {
    const response = await fetchFromGraph(`_apis/graph/groups?scopeDescriptor=${scopeDescriptor}&api-version=7.1-preview.1`, tempPat);
    const data = await response.json();
    return data.value || [];
}

async function getMembersOfGroup(groupDescriptor: string, tempPat?: string | null): Promise<any[]> {
    const response = await fetchFromGraph(`_apis/graph/memberships/${groupDescriptor}?direction=down&api-version=7.1-preview.1`, tempPat);
    const data = await response.json();
    return data.value || []; // these are membership relations
}

export async function getUsersForProject(projectId: string, projectName: string, tempPat?: string | null): Promise<User[]> {
    const org = process.env.AZURE_DEVOPS_ORG;
    if (!org) {
        throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
    }
    const authHeaders = getAuthHeaders(tempPat);
    
    const scopeDescriptor = await getProjectScopeDescriptor(projectId, tempPat);
    const groups = await getGroupsInScope(scopeDescriptor, tempPat);

    const descriptorsToFetch = new Map<string, Set<string>>();

    for (const group of groups) {
        if (!group.displayName || group.displayName.toLowerCase().includes('team foundation') || group.displayName.toLowerCase() === 'project valid users') {
            continue;
        }

        let roleName = group.displayName;
        const projectPrefix = `[${projectName}]\\`;
        if (roleName.startsWith(projectPrefix)) {
            roleName = roleName.substring(projectPrefix.length);
        }

        const members = await getMembersOfGroup(group.descriptor, tempPat);
        for (const membership of members) {
            const memberDescriptor = membership.memberDescriptor;
            if (memberDescriptor && !memberDescriptor.startsWith('vssgp.')) {
                if (!descriptorsToFetch.has(memberDescriptor)) {
                    descriptorsToFetch.set(memberDescriptor, new Set());
                }
                descriptorsToFetch.get(memberDescriptor)!.add(roleName);
            }
        }
    }

    const uniqueDescriptors = Array.from(descriptorsToFetch.keys());
    const userDetails: { user: any; roles: Set<string> }[] = [];
    const batchSize = 20;

    for (let i = 0; i < uniqueDescriptors.length; i += batchSize) {
        const batch = uniqueDescriptors.slice(i, i + batchSize);
        const userPromises = batch.map(descriptor => {
            const url = `https://vssps.dev.azure.com/${org}/_apis/graph/users/${descriptor}?api-version=7.1-preview.1`;
            return fetchWithRetry(url, { headers: authHeaders })
                .then(async response => {
                    if (!response.ok) {
                        if (response.status !== 404) {
                            const errorText = await response.text();
                            console.warn(`Could not fetch user with descriptor ${descriptor}. Status: ${response.status}, Response: ${errorText}`);
                        }
                        return null;
                    }
                    return response.json();
                })
                .catch(e => {
                    console.error(`Network error fetching user with descriptor ${descriptor}`, e);
                    return null;
                });
        });

        const results = await Promise.all(userPromises);
        results.forEach((user, index) => {
            if (user && user.principalName) {
                const descriptor = batch[index];
                const roles = descriptorsToFetch.get(descriptor)!;
                userDetails.push({ user, roles });
            }
        });
    }

    const entitlements = await getUserEntitlements(tempPat);
    const entitlementsMap = new Map(entitlements.map(e => e.user?.descriptor ? [e.user.descriptor, e] : null).filter(Boolean) as [string, any][]);

    return userDetails.map(({ user, roles }) => {
        const entitlement = entitlementsMap.get(user.descriptor);
        return {
            ...user,
            id: entitlement?.id,
            accessLevel: entitlement?.accessLevel?.licenseDisplayName,
            dateCreated: entitlement?.dateCreated,
            lastAccessedDate: entitlement?.lastAccessedDate,
            projectEntitlements: [{
                projectRef: {
                    id: projectId,
                    name: projectName,
                },
                role: Array.from(roles).join(', ') || 'Member',
            }]
        };
    }).filter(user => user.accessLevel && user.accessLevel !== 'N/A');
}

export async function getRepositoriesForProject(projectId: string, tempPat?: string | null): Promise<Repository[]> {
  const data = await fetchFromAzure(`${projectId}/_apis/git/repositories?api-version=7.1`, tempPat);
  // Map webUrl to url for easier use in the frontend
  return (data.value || []).map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    url: repo.webUrl,
    defaultBranch: repo.defaultBranch,
    size: repo.size,
  }));
}

export async function getRepository(projectId: string, repositoryId: string, tempPat?: string | null): Promise<Repository> {
    const data = await fetchFromAzure(`${projectId}/_apis/git/repositories/${repositoryId}?api-version=7.1`, tempPat);
    return {
      id: data.id,
      name: data.name,
      url: data.webUrl,
      defaultBranch: data.defaultBranch,
      size: data.size,
    };
}

export async function getBranches(projectId: string, repositoryId: string, tempPat?: string | null): Promise<Branch[]> {
    const data = await fetchFromAzure(`${projectId}/_apis/git/repositories/${repositoryId}/refs?filter=heads/&api-version=7.1`, tempPat);
    return (data.value || []).map((branch: any) => ({
        name: branch.name.replace('refs/heads/', ''),
        objectId: branch.objectId,
        url: branch.url,
    }));
}

export async function getBranchPolicies(projectId: string, tempPat?: string | null): Promise<Policy[]> {
  const data = await fetchFromAzure(`${projectId}/_apis/policy/configurations?api-version=7.1`, tempPat);
  return data.value || [];
}


export async function getBuildsForProject(projectId: string, days = 7, tempPat?: string | null): Promise<Build[]> {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const minTime = date.toISOString();

  const data = await fetchFromAzure(`${projectId}/_apis/build/builds?minTime=${minTime}&api-version=7.1`, tempPat);
  return data.value;
}

export async function getDeploymentsForProject(projectId: string, days = 90, tempPat?: string | null): Promise<Deployment[]> {
    const org = process.env.AZURE_DEVOPS_ORG;
    if (!org) {
        throw new Error('AZURE_DEVOPS_ORG is not set in your .env.local file. Please add it and restart the server.');
    }

    const date = new Date();
    date.setDate(date.getDate() - days);
    const minTime = date.toISOString();
    
    // Using the VSRM host for classic release deployments, as identified from the user's curl command.
    const url = `https://vsrm.dev.azure.com/${org}/${projectId}/_apis/release/deployments?minStartedTime=${minTime}&api-version=7.1`;
    const headers = getAuthHeaders(tempPat);
    
    try {
        const response = await fetchWithRetry(url, { headers });

        if (response.status === 401) {
            cookies().delete('temp_pat');
            throw new PatError('Your Azure DevOps PAT is invalid or has expired.');
        }

        if (!response.ok) {
            // This API can fail with a 404 if "Releases" are not configured for a project. This is not a fatal error.
            if (response.status === 404) {
                console.warn(`Could not fetch deployments for project ${projectId}. This is expected if the project does not use classic Release Pipelines.`);
                return [];
            }
            const errorText = await response.text();
            console.error(`Azure DevOps VSRM API Error: ${errorText}`);
            throw new Error(`Failed to fetch from VSRM API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.value || [];

    } catch(e: any) {
        // Re-throw PAT errors, otherwise log and return empty for other errors to not crash the page.
        if (e.name === 'PatError') {
            throw e;
        }
        console.error(`An unexpected error occurred while fetching deployments for project ${projectId}:`, e.message);
        return [];
    }
}

export async function getPullRequestsForProject(projectId: string, days = 30, tempPat?: string | null): Promise<PullRequest[]> {
    const repos = await getRepositoriesForProject(projectId, tempPat);

    if (repos.length === 0) {
        return [];
    }

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - days);

    const allPrs: PullRequest[] = [];
    const batchSize = 10;

    for (let i = 0; i < repos.length; i += batchSize) {
        const repoBatch = repos.slice(i, i + batchSize);

        const prPromises = repoBatch.map(repo =>
            fetchFromAzure(`${projectId}/_apis/git/repositories/${repo.id}/pullrequests?searchCriteria.status=all&api-version=7.1`, tempPat)
                .then(data => (data.value || []).filter((pr: any) => pr && pr.creationDate && new Date(pr.creationDate) > dateFilter))
                .catch(e => {
                    console.warn(`Could not fetch pull requests for repo ${repo.id} in project ${projectId}. It might have been deleted or permissions changed.`, e.message);
                    return [];
                })
        );

        const results = await Promise.all(prPromises);
        const prsInBatch = results.flat();
        allPrs.push(...prsInBatch);
    }

    return allPrs;
}

export async function getPullRequestsForUser(userId: string, projects: { id: string; name: string }[], days = 90, tempPat?: string | null): Promise<PullRequest[]> {
    if (!userId || !projects || projects.length === 0) {
        return [];
    }

    const date = new Date();
    date.setDate(date.getDate() - days);

    const allPrs: PullRequest[] = [];
    const batchSize = 5; // Use a smaller batch for this as it can be intensive

    for (let i = 0; i < projects.length; i += batchSize) {
        const projectBatch = projects.slice(i, i + batchSize);

        const prPromises = projectBatch.map(project =>
            fetchFromAzure(`${project.id}/_apis/git/pullrequests?searchCriteria.creatorId=${userId}&searchCriteria.status=all&api-version=7.1`, tempPat)
                .then(data => data.value || [])
                .catch(e => {
                    if (!e.message.includes('404')) { // Don't warn for projects the user may not have access to
                         console.warn(`Could not fetch PRs for user ${userId} in project ${project.id}.`, e.message);
                    }
                    return [];
                })
        );
        
        const results = await Promise.all(prPromises);
        allPrs.push(...results.flat());
    }

    // Filter by date and sort
    const filteredAndSortedPrs = allPrs
        .filter(pr => new Date(pr.creationDate) >= date)
        .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

    return filteredAndSortedPrs;
}

// Aggregated dashboard data
export async function getDashboardStats(tempPat?: string | null) {
    
    // Fetch top-level stats first
    const projectsPromise = getProjects(tempPat);
    const usersPromise = getUsers(tempPat);

    const [projects, users] = await Promise.all([
        projectsPromise, 
        usersPromise, 
    ]);

    // Fetch details in parallel after getting the list of all projects.
    // Use a smaller subset for the dashboard to avoid making too many requests.
    const projectSubset = projects.slice(0, 50);
    const projectDetailsPromises = projectSubset.map(p => Promise.all([
        getDeploymentsForProject(p.id, 90, tempPat),
        getPullRequestsForProject(p.id, 30, tempPat),
        getBuildsForProject(p.id, 30, tempPat), // Fetch builds for success ratio
    ]));

    const allProjectDetails = await Promise.all(projectDetailsPromises);

    const allDeployments = allProjectDetails.map(d => d[0]).flat();
    const allPullRequests = allProjectDetails.map(d => d[1]).flat();
    const allBuilds = allProjectDetails.map(d => d[2]).flat();
    
    // --- Pull Request Stats from Standard API ---
    const prStats = {
        approved: allPullRequests.filter(pr => pr.status === 'completed').length,
        rejected: allPullRequests.filter(pr => pr.status === 'abandoned').length,
    };
    const totalPRs = allPullRequests.length;
    
    // --- Build Chart Stats from Standard API ---
    const buildsByDay = allBuilds
        .filter(b => b.finishTime && new Date(b.finishTime) > new Date(new Date().setDate(new Date().getDate() - 7)))
        .reduce((acc: any, build: Build) => {
            const date = formatUtcDate(build.finishTime);
            if (!acc[date]) acc[date] = { passed: 0, failed: 0 };
            if (build.result === 'succeeded') acc[date].passed++;
            if (build.result === 'failed') acc[date].failed++;
            return acc;
        }, {});
    
    const buildChartData = Object.entries(buildsByDay).map(([date, data]: [string, any]) => {
        const d = new Date(`${date}T12:00:00Z`);
        return { date: d.toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), ...data };
    });
    

    // --- Deployment Chart Stats from Standard API ---
    let deploymentChartData: any[] = [];
    if(allDeployments.length > 0) {
        const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const deploymentsByMonth = allDeployments.reduce((acc: any, dep: Deployment) => {
            const monthName = new Date(dep.queuedOn).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
            if(!acc[monthName]) acc[monthName] = { successful: 0, failed: 0 };
            if (dep.deploymentStatus === 'succeeded') acc[monthName].successful++;
            if (dep.deploymentStatus === 'failed' || dep.deploymentStatus === 'partiallySucceeded') acc[monthName].failed++;
            return acc;
        }, {});

        deploymentChartData = Object.entries(deploymentsByMonth)
            .map(([month, data]: [string, any]) => ({ month: month.substring(0,3), ...data, order: monthOrder.indexOf(month) }))
            .sort((a,b) => a.order - b.order);
    }
    
    // --- Pipeline Success Ratio from Standard API ---
    const totalBuilds = allBuilds.length;
    const successfulBuilds = allBuilds.filter(b => b.result === 'succeeded').length;

    const accessLevelCounts = users.reduce((acc, user) => {
        const level = user.accessLevel;
        if (level) {
            acc[level] = (acc[level] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const accessLevelStats = Object.entries(accessLevelCounts).map(([name, value]) => ({ name, value }))
      .filter(d => d.name !== 'Unknown');

    return {
        totalProjects: projects.length,
        totalUsers: users.length,
        totalPRs: totalPRs,
        pipelineSuccessRatio: totalBuilds > 0 ? successfulBuilds / totalBuilds : 0,
        builds: buildChartData,
        deployments: deploymentChartData,
        pullRequests: {
            approved: prStats.approved,
            rejected: prStats.rejected,
        },
        accessLevelStats,
    }
}
