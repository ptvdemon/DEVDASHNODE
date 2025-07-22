
export interface Project {
  id: string;
  name: string;
  description: string;
  lastUpdateTime: string;
}

export interface User {
  id?: string; // GUID from entitlement
  principalName: string; // email
  descriptor: string; // use this as the ID for page routes
  displayName: string;
  _links: {
    avatar: {
      href: string;
    };
  };
  accessLevel?: string;
  dateCreated?: string;
  lastAccessedDate?: string;
  projectEntitlements?: { 
    projectRef: { 
      id: string; 
      name: string; 
    };
    [key: string]: any; 
  }[];
}


export interface Build {
  id: number;
  buildNumber: string;
  status: 'completed' | 'inProgress' | 'notStarted' | string;
  result: 'succeeded' | 'failed' | 'canceled' | 'partiallySucceeded' | string;
  queueTime: string;
  startTime: string;
  finishTime: string;
}

export interface Deployment {
  id: number;
  release: {
    name: string;
  }
  deploymentStatus: 'succeeded' | 'failed' | 'partiallySucceeded' | 'inProgress' | 'notDeployed' | string;
  queuedOn: string;
}

export interface PullRequest {
    pullRequestId: number;
    title: string;
    status: 'active' | 'abandoned' | 'completed';
    createdBy: {
        displayName: string;
        id: string;
    };
    creationDate: string;
    repository: {
        id: string;
        name: string;
    };
    _links?: {
      self?: {
        href?: string;
      }
    }
}

export interface Repository {
  id: string;
  name:string;
  url: string; // This is the webUrl
  defaultBranch?: string;
  size?: number;
}

export interface Branch {
  name: string;
  objectId: string; // The commit SHA
  url: string;
}

export interface Policy {
    id: number;
    url: string;
    type: {
        id: string;
        url:string;
        displayName: string;
    };
    isBlocking: boolean;
    isEnabled: boolean;
    isDeleted: boolean;
    settings: {
        minimumApproverCount?: number;
        creatorVoteCounts?: boolean;
        allowDownvotes?: boolean;
        buildDefinitionId?: number;
        scope: {
            refName: string;
            matchKind: 'exact' | 'prefix';
            repositoryId: string;
        }[];
        [key: string]: any; // for other settings
    }
}
