# Email Notification Templates (#617)

Standardized transactional HTML emails with plain-text fallbacks.

## Included Templates
- Welcome Email
- Password Reset
- Email Verification
- Team Invitation
- Project Accepted
- Project Rejected
- Weekly Digest

## API Endpoints
- `GET /api/email-templates`
- `POST /api/email-templates/render`

## How to Test
1. **Backend Tests**: `pytest backend/tests/test_email_templates.py`
2. **Frontend UI**: Navigate to `/admin/email-templates` route.
