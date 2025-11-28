# Chime Notification System - Future TODOs

This document tracks planned enhancements for the Chime notification system. These are **not implemented yet** - they are documented here for future development.

---

## Chime Tool Integration

### Additional Tools
- [ ] Create `chime_refine_notification_copy` tool to refine/edit notification title/body from queued notifications
- [ ] Create `chime_summarize_multiple_obligations` tool to combine multiple obligations into a single "weekly digest" notification
- [ ] Create `chime_snooze_notification` tool to allow users to snooze notifications via chat
- [ ] Create `chime_dismiss_notification` tool to allow users to dismiss notifications via chat

---

## Notification Sending

### Implementation Tasks
- [ ] Implement actual sending mechanism for in-app notifications (banners, toasts, etc.)
- [ ] Implement email sending for notifications with `channel='email'`
- [ ] Implement push notification sending for notifications with `channel='push'`
- [ ] Ensure all outbound messages (in-app, email, push) are passed through guardrails/PII filters before sending
- [ ] Add retry logic for failed notification sends
- [ ] Add rate limiting to prevent notification spam

### Integration Points
- [ ] Create Netlify function or worker to process `notifications_queue` rows with `status='pending'` or `status='scheduled'`
- [ ] Schedule cron job or event-driven function to check for notifications ready to send
- [ ] Integrate with email service (SendGrid, AWS SES, etc.) for email notifications
- [ ] Integrate with push notification service (Firebase Cloud Messaging, OneSignal, etc.) for push notifications

---

## Notification Management

### UI Components
- [ ] Build in-app notification center UI to show all notifications
- [ ] Add notification history view per user
- [ ] Add notification settings page (enable/disable channels, quiet hours, etc.)
- [ ] Add "dismiss" and "snooze" buttons to notification UI
- [ ] Add notification preferences (frequency, types, etc.)

### Analytics & Tracking
- [ ] Track notification open rates
- [ ] Track click-through rates for notification actions
- [ ] Track notification dismissal rates
- [ ] Track notification snooze patterns
- [ ] Add metrics dashboard for notification performance

---

## Enhanced Detection

### Smarter Recurring Detection
- [ ] Improve recurring obligation detection from transactions (Tag + Byte output)
- [ ] Better category detection (mortgage vs rent vs utilities)
- [ ] Better currency detection (multi-currency support)
- [ ] Handle variable/irregular amounts (e.g., utilities that vary month-to-month)
- [ ] Detect missed payments and create "payment_missed" notifications
- [ ] Detect payment pattern changes (e.g., user starts paying more frequently)

### Pattern Recognition
- [ ] Use ML/pattern matching to improve confidence scores
- [ ] Learn from user corrections (if user marks an obligation as inactive)
- [ ] Detect seasonal patterns (e.g., annual subscriptions, quarterly taxes)

---

## Manual Triggers

### API Endpoints
- [ ] Create API endpoint for manual detection triggers (admin/backend use)
- [ ] Create API endpoint for Liberty/Finley to request "send Chime reminders for this plan"
- [ ] Create API endpoint for users to manually create recurring obligations
- [ ] Create API endpoint for users to manually trigger notification generation

### Admin UI
- [ ] Build admin UI for manual detection triggers
- [ ] Build admin UI to view/manage all notifications across users
- [ ] Build admin UI to test notification generation
- [ ] Build admin UI to view notification analytics

---

## Advanced Features

### Smart Scheduling
- [ ] Learn optimal notification timing per user (when are they most likely to act?)
- [ ] Adjust notification timing based on user behavior
- [ ] Support quiet hours per user (don't send notifications during sleep hours)
- [ ] Support timezone-aware scheduling

### Personalization
- [ ] Personalize notification tone based on user preferences
- [ ] Personalize notification frequency based on user behavior
- [ ] A/B test different notification copy to improve engagement
- [ ] Learn which notification types users find most helpful

### Integration with Other Employees
- [ ] Allow Liberty to request notifications when debt payoff milestones are reached
- [ ] Allow Finley to request notifications when forecast milestones are reached
- [ ] Allow Goalie to request notifications when goal milestones are reached
- [ ] Allow Crystal to request notifications when spending patterns change significantly

---

## Testing & Quality

### Test Coverage
- [ ] Add unit tests for chime_generate_notification tool
- [ ] Add unit tests for createChimeNotificationFromObligation helper
- [ ] Add integration tests for full notification flow
- [ ] Add E2E tests for notification UI

### Quality Assurance
- [ ] Add automated PII detection tests (ensure no PII leaks in notifications)
- [ ] Add automated guardrails compliance tests
- [ ] Add load testing for notification queue processing
- [ ] Add monitoring/alerting for notification failures

---

## Documentation

### User-Facing
- [ ] Write user guide for notification features
- [ ] Create FAQ for notification settings
- [ ] Document how to set up payment reminders

### Developer-Facing
- [ ] Document notification system architecture
- [ ] Document how to add new notification scenarios
- [ ] Document how to integrate notifications with other employees
- [ ] Create runbook for notification system operations

---

**Last Updated:** November 20, 2025  
**Status:** Initial implementation complete. Future enhancements documented above.



