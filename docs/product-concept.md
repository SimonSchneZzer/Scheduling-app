# Product Concept

## Vision

Scheduling App is an intelligent team calendar. It helps teams find the best time for events by combining calendar availability, participant importance, priority, room requirements, device requirements, and event constraints.

The product should feel like a calendar with intelligent planning, not like a task manager. The core value is: create an event request, let the system calculate strong scheduling options, then accept the best slot into the team calendar.

## Initial Product Scope

The first version should focus on single-event planning.

Supported event types:
- Normal timed events, for example a 45-minute meeting.
- All-day events, for example an offsite day.
- Multi-day all-day events, for example a workshop from Monday to Wednesday.
- Long flexible blocks that may need to be placed within a larger date range.

The system should return ranked suggestions instead of silently choosing one slot. Users should understand why a suggestion is good or bad.

## Core Concepts

### Event Request

An event request describes what should be scheduled.

Important fields:
- title
- description
- duration
- earliest start
- latest end or deadline
- event type: timed, all-day, multi-day
- priority
- online/offline mode
- participants
- room constraints
- device constraints
- additional rules

### Participants

Participants are not all equal.

Participant roles:
- required: must be available, otherwise the slot is invalid
- optional: improves the score when available, but does not block scheduling
- organizer: creates or owns the event

Possible future roles:
- decision maker: very important participant with stronger scoring weight
- observer: optional participant with lower scoring weight

### Resources

Resources are bookable physical or logical things.

Examples:
- room
- projector
- whiteboard
- conference screen
- lab equipment
- company car
- special device

Room properties can become constraints:
- seat count
- location
- accessibility
- video conferencing equipment
- whiteboard
- projector
- privacy level
- room type, for example meeting room, workshop room, focus room

### Online Events

If an event is marked as online, physical constraints can be relaxed or removed.

Default behavior:
- Room constraints are ignored for online events.
- Device constraints tied to a room are ignored for online events.
- Participant availability still matters.
- Explicit resource constraints can still be enforced if the organizer marks them as required.

## Scheduling Model

The initial algorithm should be a scoring engine.

The engine should:
1. Generate candidate slots.
2. Remove slots that violate hard constraints.
3. Score remaining slots with soft constraints.
4. Return ranked suggestions.
5. Explain the score in human-readable terms.

### Hard Constraints

Hard constraints decide whether a slot is valid.

Examples:
- All required participants are available.
- The event fits into the requested date range.
- The event duration fits into the slot.
- Offline events have a room available when a room is required.
- Required room capacity is met.
- Required room features are available.
- Required devices are available.
- The event does not conflict with existing accepted calendar events.

### Soft Constraints

Soft constraints influence quality.

Examples:
- More optional participants are available.
- Higher-priority events get better slots.
- Earlier slots are preferred for urgent events.
- Meeting clustering is preferred over fragmented calendars.
- Focus time is protected where possible.
- Bad hours are penalized.
- Long events are placed where they cause the least disruption.
- Team fairness is considered over time.

## Scoring Engine

A candidate slot should receive a transparent score.

Example scoring dimensions:
- optional participant availability
- event priority
- deadline urgency
- room/resource quality
- calendar fragmentation
- time-of-day quality
- participant fairness
- schedule stability

Required participant availability should not be a score. It should be a validity check.

Example conceptual formula:

```text
score =
  optionalParticipantScore
+ priorityScore
+ urgencyScore
+ resourceFitScore
- fragmentationPenalty
- badHourPenalty
- fairnessPenalty
- reschedulingPenalty
```

The exact weights should be configurable later. For the MVP, constants in code are acceptable if they are documented.

## Calendar Scope

The product should have its own team calendar.

The MVP does not need full external calendar sync, but the design should leave space for later integrations:
- Google Calendar
- Microsoft Outlook / Microsoft Graph
- CalDAV

Internal calendar data should be treated as the source of truth at first.

## Data Model Draft

Likely entities:
- users
- teams
- team_members
- calendars
- events
- event_requests
- event_participants
- resources
- rooms
- room_features
- resource_bookings
- availability_rules
- schedule_suggestions
- schedule_runs

Important modeling detail:
- Accepted events are calendar facts.
- Event requests are scheduling inputs.
- Schedule suggestions are generated outputs.
- Schedule runs should be stored so results can be inspected and compared.

## MVP Roadmap

### Phase 1: Foundation

- Basic team calendar data model.
- Create users and teams.
- Create fixed calendar events.
- Create event requests.
- Add required and optional participants.
- Add simple working-hour availability.

### Phase 2: First Scheduling Engine

- Generate candidate slots for normal timed events.
- Filter invalid slots using required participant availability.
- Score slots using optional participants and priority.
- Show ranked suggestions.
- Accept one suggestion into the calendar.

### Phase 3: Resource Constraints

- Add rooms and room capacity.
- Add room features.
- Add device/resource requirements.
- Support online/offline mode.
- Relax physical constraints for online events.

### Phase 4: Long Events

- Support all-day events.
- Support multi-day events.
- Score long events based on availability, conflicts, and disruption.

### Phase 5: Better Optimization

- Add configurable scoring weights.
- Add fairness tracking.
- Add schedule explanations.
- Consider stronger optimization after the product rules are stable.

## Open Decisions

- Frontend framework.
- Backend framework.
- Database and ORM.
- Authentication provider.
- Whether calendar sync is needed in the MVP.
- How detailed availability rules should be in the first version.
- Whether rooms and resources are separate entities or one unified resource model.
