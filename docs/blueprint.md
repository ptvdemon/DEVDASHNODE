# **App Name**: RGI DevOps Central

## Core Features:

- User Authentication: Authenticate users via the provided API endpoint to grant access to the dashboard.
- Confal iguration Management: Securely read and store the Azure DevOps PersonAccess Token (PAT) from appsettings.json to authenticate all Azure DevOps REST API calls. The application will use this PAT as a tool when LLMs do reasoning. The app settings also contains a static Organization Name: RGI.
- Organization Dashboard: Provide an Organization Dashboard View displaying global graphs and KPIs such as total projects, active users, pull request stats, and pipeline success/failure ratio.  Include charts such as daily builds summary, monthly release deployments, and PR approval vs rejection stats. Allow users to search and filter by Project Name and Date.
- Project-Level Dashboard: Present all Azure DevOps Projects in a card/grid/list view with Project Name, Description, and Created Date.  Allow users to click on a project to view project-specific charts, Release Stages Flow, and associated users with User Name, Role and Last Access Date.
- User-Level Dashboard: Show all users in the organization, with Full Name, Email, Role(s), Projects, Last Login Date, and Account Created Date. Show detailed profile on user select including activity timeline.
- Navigation and Theme Toggle: Implement a top navigation bar with links to "Organization | Projects | Users" and a logged-in user profile dropdown. Also provide a Dark/Light Mode Toggle

## Style Guidelines:

- Primary color: Azure blue (#0078D4) to reflect the Azure DevOps environment.
- Background color: Light gray (#F5F5F5) for a clean, modern look in light mode; dark gray (#333333) for dark mode.
- Accent color: Teal (#009688) for interactive elements and highlights, providing a sense of progress and stability.
- Body and headline font: 'Inter' sans-serif font for clear readability and a modern, neutral look.
- Use clear and consistent icons from a library like FontAwesome or Material Icons to represent different aspects of DevOps, such as builds, releases, and users.
- Follow a grid-based layout for consistent spacing and alignment of elements across the dashboard, ensuring responsiveness on different devices.
- Implement subtle animations and transitions for loading states and data updates to improve the user experience without being distracting.