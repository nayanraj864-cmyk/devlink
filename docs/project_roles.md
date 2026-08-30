# DevLink Team Roles Within Projects Documentation (#624)

DevLink provides fine-grained role-based access control (RBAC) within projects to streamline collaboration, specify member responsibilities, and protect administrative actions.

---

## 1. Project Team Roles & Hierarchy

Project members can be assigned one of five distinct roles:

| Role | Badge Color | Description & Responsibilities |
|------|-------------|--------------------------------|
| **Project Owner (`OWNER`)** | Gold / Amber | Creator or transferred owner. Full administrative rights, ownership transfer, project deletion, and role management. |
| **Maintainer (`MAINTAINER`)** | Indigo | Co-lead or senior team member. Can manage project settings, invite/remove non-owner members, and assign member roles up to Maintainer. |
| **Contributor (`CONTRIBUTOR`)** | Blue | Active developer. Can edit project documents, submit task/code updates, create issues, and participate in workspace collaboration. |
| **Reviewer (`REVIEWER`)** | Emerald | Code reviewer / QA. Can review pull requests, review documentation changes, leave feedback, and inspect project activities. |
| **Viewer (`VIEWER`)** | Gray | Read-only member. Can view project details, milestones, and member rosters without editing permissions. |

---

## 2. Permissions Matrix

| Permission Action | Owner | Maintainer | Contributor | Reviewer | Viewer |
|-------------------|:-----:|:----------:|:-----------:|:--------:|:------:|
| `project:view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `project:edit_content` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `project:review` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `project:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:invite` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:manage_roles` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:remove_members` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:archive` / `restore` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project:delete` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `project:transfer_ownership` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. REST API Endpoints

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| `GET` | `/api/v1/projects/{project_id}/members` | Lists all team members and their roles. | Project Member (`project:view`) |
| `PUT` | `/api/v1/projects/{project_id}/members/{user_id}/role` | Assigns or changes a member's role (`owner`, `maintainer`, `contributor`, `reviewer`, `viewer`). | Owner / Maintainer (`project:manage_roles`) |
| `POST` | `/api/v1/projects/{project_id}/transfer-ownership` | Transfers project ownership to another team member. | Owner Only (`project:transfer_ownership`) |
| `DELETE` | `/api/v1/projects/{project_id}/members/{user_id}` | Removes a member from the project. | Owner / Maintainer (`project:remove_members`) or Self-Removal |

---

## 4. Audit Trail & Notifications

- **Role Changes**: Trigger `AuditAction.ROLE_UPDATED` audit logs and notify the recipient user.
- **Ownership Transfer**: Updates `project.owner_id`, promotes the recipient to `OWNER`, changes the former owner to `MAINTAINER`, logs `AuditAction.PROJECT_UPDATED`, and sends an urgent notification.
